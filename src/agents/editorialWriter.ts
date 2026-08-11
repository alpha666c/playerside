import type { Payload, PayloadRequest } from 'payload'
import fs from 'fs/promises'
import path from 'path'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'
import { runAgentLlm } from '@/agents/llmBridge'
import { stripAiSlop } from '@/lib/slopGate'

/**
 * Phase G (G.5) — Editorial Writer rewired onto the real model call (spec §5).
 *
 * The model writes the actual public-facing copy (summary, hero headline,
 * claims-vs-reality paragraph) grounded in the computed scores + desk research
 * + evidence register from the context. The compliance block is NOT model
 * output — it is pinned deterministic constants (18+, responsible-gambling
 * links, licence reference from the case) so a model turn can never strip the
 * regulatory block (spec §7.3). categoryBreakdown comes from the context's
 * computed scores, never from the model.
 */

const RG_LINKS = ['https://www.begambleaware.org', 'https://www.gamstop.co.uk']

/**
 * Build the editorial draft: model prose overlays the skeleton, compliance
 * block is deterministic. Pure + exported for unit tests.
 */
export const buildEditorialDraft = (
  context: Record<string, unknown>,
  parsed: Record<string, unknown> | null,
): Record<string, unknown> => {
  const operatorName = String(context.operatorName ?? 'Operator')
  const computedScores = (context.computedScores as Record<string, unknown>) ?? {}
  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback

  // Phase I1 (slopGate): the four prose fields pass through the deterministic
  // AI-slop gate post-str(). It is evidence-safe (numbers/URLs/timestamps are
  // token-protected), conservative (binary contrasts untouched), and never
  // applied to complianceBlock / categoryBreakdown — those stay byte-identical.
  return {
    summary: stripAiSlop(
      str(
        parsed?.summary,
        `Editorial Review for ${operatorName} — Commission-blind, evidence-backed evaluation.`,
      ),
    ),
    heroHeadline: stripAiSlop(
      str(
        parsed?.heroHeadline,
        `${operatorName} Review: Verified Withdrawal Speed & Licensing Integrity`,
      ),
    ),
    claimsVsReality: stripAiSlop(
      str(
        parsed?.claimsVsReality,
        'Our research tested stated operator claims against measured evidence. Unverified claims remain explicitly marked as untested.',
      ),
    ),
    categoryBreakdown: computedScores.categories ?? [],
    complianceBlock: {
      licenceReference: (context as any).licenseNumber || 'License status checked at regulator database.',
      ageRequirement: '18+ Only. Gambling can be addictive — play responsibly.',
      responsibleGamblingLinks: RG_LINKS,
    },
    methodologyNote: stripAiSlop(
      str(
        parsed?.methodologyNote,
        'This score was produced under Playerside commission-blind evaluation rules. Commercial affiliate agreements do not influence scoring.',
      ),
    ),
  }
}

export async function runEditorialWriter(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
  opts?: { apply?: boolean; expectedVersion?: number; changedFields?: string[] },
) {
  // 1. Load context
  const { context } = await loadCaseContext(caseId, 'editorial-writer', req)

  // 2. Load system prompt & Founder Voice context
  const roleFile = await loadRoleFile('editorial-writer')
  const founderContextPath = path.join(process.cwd(), 'docs', 'FOUNDER-CONTEXT.md')
  const founderVoice = await fs.readFile(founderContextPath, 'utf8').catch(() => '')

  // 3. Start aiRun record
  const runId = await startAiRun(payload, req, caseId, 'editorial-writer')

  // 4. Model pass: write the copy (compliance block stays deterministic)
  const task = [
    'Write the editorial review copy for the operator in the case context.',
    'Return a strict JSON object with exactly these keys:',
    'summary (2-3 sentences, evidence-backed overview for the review page),',
    'heroHeadline (one clear, factual headline),',
    'claimsVsReality (a paragraph explaining how stated operator claims compare to',
    '  the measured evidence in the context),',
    'methodologyNote (one sentence on the commission-blind methodology).',
    'Rules: base every statement on the computedScores, desk research and evidence',
    'register in the context. Never assert facts that are not present. No hype, no',
    'guarantees, no encouragement to gamble. The compliance block (18+, RG links,',
    'licence reference) is added by the system and must NOT appear in your JSON.',
    'Return ONLY the JSON object.',
  ].join('\n')

  let parsed: Record<string, unknown> | null = null
  let fallbackReason: string | null = null
  try {
    const res = await runAgentLlm(payload, req, {
      agentRole: 'editorial-writer',
      roleFile,
      systemAppend: founderVoice,
      context,
      task,
      maxTokens: 1500,
    })
    parsed = res.parsed
    if (res.fallback) {
      fallbackReason = 'Model reply was not parseable JSON — skeleton copy used.'
      payload.logger.warn({ message: fallbackReason, caseId, runId })
    }
  } catch (err) {
    fallbackReason = 'Model call failed — skeleton copy used.'
    payload.logger.error({ err, message: 'editorial-writer model call failed — using skeleton copy', caseId, runId })
  }

  const editorialDraft = buildEditorialDraft(context, parsed)

  // 5. Complete aiRun (marked when the model never ran)
  await completeAiRun(
    payload,
    req,
    caseId,
    runId,
    {
      editorialDraft,
      ...(fallbackReason ? { _fallback: true, _fallbackReason: fallbackReason } : {}),
    },
    fallbackReason ? 'complete-with-warning' : 'complete',
  )

  // 6. Log event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'draft_created',
      operator: String(context.operatorName ?? 'Operator'),
      pageId: String(caseId),
      details: { runId, role: 'editorial-writer' },
    },
    req,
  )

  // 7. Optionally apply draft
  if (opts?.apply) {
    if (typeof opts.expectedVersion !== 'number' || !Array.isArray(opts.changedFields)) {
      throw new Error('Applying editorialDraft requires expectedVersion (number) and changedFields (string[]).')
    }

    if (!opts.changedFields.includes('editorialDraft')) {
      throw new Error("changedFields must include 'editorialDraft' when applying editorial writer output")
    }

    await applyDraft(
      payload,
      req,
      caseId,
      { editorialDraft },
      opts.expectedVersion,
      opts.changedFields,
    )
  }

  return { runId, editorialDraft }
}
