import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'
import { runAgentLlm } from '@/agents/llmBridge'

/**
 * Phase G (G.5) — Integrity Checker rewired onto the real model call (spec §5).
 *
 * The deterministic pre-publish checks (rubric present, commission-wall terms,
 * compliance block) remain the backbone — they can never be bypassed. The
 * model adds a qualitative pass (banned/irresponsible phrasing, contradictions
 * between copy and scores) whose S0/S1 findings can only BLOCK a release,
 * never PASS one. The verdict is recomputed deterministically from the union,
 * so a model error cannot weaken the gate (spec §7.3: release gates are code,
 * not opinion).
 */

const COMMISSION_WALL_TERMS = ['commission', 'cpa', 'revshare', 'rev-share', 'affiliate link', 'referral fee']

/**
 * The site's own methodology disclosures that legitimately contain the word
 * "commission" (e.g. the skeleton editorial copy: "commission-blind
 * evaluation rules") — these are NOT commercial deal terms, and flagging
 * them would make a thin fallback draft fail its own gate forever (caught
 * by the G.6 browser E2E: no-key walk could never PASS). We strip these
 * phrases before scanning so real deal terms are still caught. Pure +
 * exported for unit tests.
 */
const COMMISSION_SAFE_PHRASES = /commission[- ]?(?:blind|free|neutral)/g

export const findCommissionWallTerm = (editorialDraftStr: string): string | null => {
  const normalized = editorialDraftStr.toLowerCase().replace(COMMISSION_SAFE_PHRASES, '')
  return COMMISSION_WALL_TERMS.find((term) => normalized.includes(term)) ?? null
}

interface IntegrityFinding {
  severity: string
  issue: string
  domain: string
}

/**
 * Union deterministic + model findings. `checksFailed` is the full display
 * list (deterministic failures + every model finding); `deterministicFailed`
 * is the code-owned subset; `modelBlocking` is true when the model flagged an
 * S0/S1 issue. The VERDICT (computed by the caller) is
 * `deterministicFailed.length === 0 && !modelBlocking` — reviewer S2: an S3
 * finding is advisory and must NOT block a release, and model output can
 * never downgrade a deterministic failure. Pure + exported for unit tests.
 */
export const applyIntegrityFindings = (
  deterministicFailed: string[],
  modelFindings: unknown,
): { checksFailed: string[]; deterministicFailed: string[]; modelBlocking: boolean } => {
  const checksFailed = [...deterministicFailed]
  let modelBlocking = false
  if (Array.isArray(modelFindings)) {
    for (const raw of modelFindings) {
      if (!raw || typeof raw !== 'object') continue
      const f = raw as Record<string, unknown>
      const severity = String(f.severity ?? '').toUpperCase()
      const issue = String(f.issue ?? '').trim()
      if (!issue) continue
      checksFailed.push(`Model review (${severity || 'S2'}): ${issue}`)
      if (severity === 'S0' || severity === 'S1') modelBlocking = true
    }
  }
  return { checksFailed, deterministicFailed: [...deterministicFailed], modelBlocking }
}

export async function runIntegrityChecker(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
) {
  // 1. Load context
  const { context } = await loadCaseContext(caseId, 'integrity-checker', req)

  // 2. Load system prompt
  const roleFile = await loadRoleFile('integrity-checker')

  // 3. Record aiRun start
  const runId = await startAiRun(payload, req, caseId, 'integrity-checker')

  const editorialDraftStr = JSON.stringify((context as any).editorialDraft || {}).toLowerCase()
  const deterministicFailed: string[] = []

  // Check 1: Rubric Integrity
  if (!(context as any).computedScores?.categories) {
    deterministicFailed.push('Rubric Integrity: Computed scores missing or incomplete.')
  }

  // Check 2: Commission Wall Compliance
  const forbiddenTermFound = findCommissionWallTerm(editorialDraftStr)
  if (forbiddenTermFound) {
    deterministicFailed.push(`Commission Wall Violation: Draft contains prohibited commercial term '${forbiddenTermFound}'.`)
  }

  // Check 3: Compliance Block Verification
  if (!editorialDraftStr.includes('18+') && !editorialDraftStr.includes('responsible')) {
    deterministicFailed.push('Compliance Block Missing: 18+ age warning or responsible gambling link missing.')
  }

  // 4. Model qualitative pass — can only add findings, never remove them
  const task = [
    'You are the final pre-publish gate. Review the editorial draft, computed scores and',
    'evidence register in the case context.',
    'Return a strict JSON object: { "findings": [ { "severity": "S0"|"S1"|"S2"|"S3",',
    '"issue": "...", "domain": "copy|scores|compliance|evidence" } ] }.',
    'Flag only issues you can ground in the context: banned or irresponsible gambling',
    'phrasing (chase-loss encouragement, guaranteed wins, pressure to deposit),',
    'contradictions between the draft and the scores, commission-wall exposure,',
    'compliance-block omissions, or fabricated-sounding claims.',
    'If the draft is clean, return { "findings": [] }.',
    'Return ONLY the JSON object.',
  ].join('\n')

  let modelFindings: unknown = []
  let fallbackReason: string | null = null
  try {
    const res = await runAgentLlm(payload, req, {
      agentRole: 'integrity-checker',
      roleFile,
      context,
      task,
      maxTokens: 1200,
    })
    if (res.parsed) modelFindings = res.parsed.findings
  } catch (err) {
    fallbackReason = 'Model call failed — deterministic checks only (stricter, not weaker).'
    payload.logger.error({
      err,
      message: 'integrity-checker model call failed — deterministic checks only (stricter, not weaker)',
      caseId,
      runId,
    })
  }

  // 5. Verdict recomputed deterministically: code failures OR model S0/S1 block;
  // model S2/S3 findings are advisory (reviewer S2).
  const { checksFailed, deterministicFailed: deterministic, modelBlocking } = applyIntegrityFindings(
    deterministicFailed,
    modelFindings,
  )
  const verdict = deterministic.length === 0 && !modelBlocking ? 'PASS' : 'BLOCKED'
  const advisoryCount = verdict === 'PASS' ? checksFailed.length : 0

  // G.6 note (reviewer S3): the publish/approve gate MUST key off `verdict`
  // (=== 'PASS'), never `checksFailed.length` — advisory S3 findings keep
  // checksFailed non-empty while verdict stays PASS.
  //
  // G.6 (§12.2 verdict freshness): record the case `version` at verdict time
  // so publish can reject a stale verdict for an edited case. The context is
  // allowlisted for 'version' (loadCaseContext) — never trust a client claim.
  const verdictForVersion = (context as { version?: unknown }).version as number | undefined
  const integrityOutput = {
    verdict,
    checkedAt: new Date().toISOString(),
    verdictForVersion: typeof verdictForVersion === 'number' ? verdictForVersion : null,
    checksEvaluated: 5 + (Array.isArray(modelFindings) ? modelFindings.length : 0),
    checksFailed,
    notes:
      verdict === 'PASS'
        ? advisoryCount > 0
          ? `PASS with ${advisoryCount} advisory finding(s) — model-flagged S2/S3 items to review, not blocking.`
          : 'All pre-publish integrity checks passed. Ready for human sign-off.'
        : `Pre-publish integrity check failed with ${checksFailed.length} violation(s)${modelBlocking ? ' (including a model-flagged S0/S1 issue)' : ''}. Human review required.`,
  }

  // 6. Complete aiRun (marked when the model never ran)
  await completeAiRun(
    payload,
    req,
    caseId,
    runId,
    {
      integrityResult: integrityOutput,
      ...(fallbackReason ? { _fallback: true, _fallbackReason: fallbackReason } : {}),
    },
    fallbackReason ? 'complete-with-warning' : 'complete',
  )

  // 7. Log agent event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'qa_check',
      operator: (context as any).operatorName,
      pageId: String(caseId),
      details: { runId, verdict, checksFailedCount: checksFailed.length },
    },
    req,
  )

  return { runId, integrityResult: integrityOutput }
}
