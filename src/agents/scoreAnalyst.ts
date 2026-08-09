import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'
import { traditionalRubric } from '@/rubrics/traditional'
import { cryptoRubric } from '@/rubrics/crypto'
import { runAgentLlm } from '@/agents/llmBridge'

/**
 * Phase G (G.5) — Score Analyst rewired onto the real model call (spec §5).
 *
 * The locked rubric stays deterministic code: the score for each category is
 * computed from measured hands-on data or a conservative midpoint — a model
 * never sets a number. The model's job is the prose: a one-sentence rationale
 * per category (referencing the evidence in context) and qualitative conflict
 * analysis. `overallScore` stays null — the codebase's computeOverallScore
 * hook owns it.
 */

type CategoryRow = {
  key: string
  label: string
  weight: number
  score: number
  conservative: boolean
  pendingHandsOn: boolean
  notes: string
}

/**
 * Enrich deterministic categories with the model's per-category rationale.
 * Pure + exported for unit tests: a model note overrides the deterministic
 * note only when the key matches a rubric category.
 */
export const enrichCategories = (
  categories: CategoryRow[],
  modelNotes: Record<string, unknown> | null | undefined,
): CategoryRow[] =>
  categories.map((cat) => {
    const note = modelNotes?.[cat.key]
    if (typeof note === 'string' && note.trim().length > 0) {
      return { ...cat, notes: note.trim() }
    }
    return cat
  })

/**
 * Union deterministic + model conflicts, deduped by field. Pure + exported.
 */
export const mergeConflicts = (
  deterministic: Array<{ field: string; claimed: string; measured: string; delta: string }>,
  modelConflicts: unknown,
): Array<{ field: string; claimed: string; measured: string; delta: string }> => {
  const seen = new Set(deterministic.map((c) => c.field))
  const out = [...deterministic]
  if (Array.isArray(modelConflicts)) {
    for (const raw of modelConflicts) {
      if (!raw || typeof raw !== 'object') continue
      const c = raw as Record<string, unknown>
      const field = String(c.field ?? '').trim()
      if (!field || seen.has(field)) continue
      seen.add(field)
      out.push({
        field,
        claimed: String(c.claimed ?? ''),
        measured: String(c.measured ?? ''),
        delta: String(c.delta ?? ''),
      })
    }
  }
  return out
}

export async function runScoreAnalyst(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
  opts?: { apply?: boolean; expectedVersion?: number; changedFields?: string[] },
) {
  // 1. Load context with allowlist filtering
  const { context } = await loadCaseContext(caseId, 'score-analyst', req)

  // 2. Load system prompt
  const roleFile = await loadRoleFile('score-analyst')

  // 3. Record aiRun start
  const runId = await startAiRun(payload, req, caseId, 'score-analyst')

  const casinoType = (context as any).casinoType === 'crypto' ? 'crypto' : 'traditional'
  const rubric = casinoType === 'crypto' ? cryptoRubric : traditionalRubric

  const deskResearch = (context as any).deskResearchOutput || {}
  const handsOn = (context as any).handsOnResults || {}

  // 4. Deterministic per-category scores from the locked rubric (model never sets numbers)
  const categories: CategoryRow[] = rubric.map((cat) => {
    const hasHandsOn = Boolean(handsOn && handsOn[cat.key])
    const deskClaim = deskResearch[cat.key]

    if (!hasHandsOn && (!deskClaim || deskClaim.confidence === 'unverified')) {
      return {
        key: cat.key,
        label: cat.label,
        weight: cat.weight,
        score: 5.0,
        conservative: true,
        pendingHandsOn: true,
        notes: `Midpoint score assigned conservatively pending hands-on verification for ${cat.label}.`,
      }
    }

    const calculatedScore = hasHandsOn ? (handsOn[cat.key]?.score ?? 7.5) : 7.0

    return {
      key: cat.key,
      label: cat.label,
      weight: cat.weight,
      score: calculatedScore,
      conservative: !hasHandsOn,
      pendingHandsOn: !hasHandsOn,
      notes: hasHandsOn
        ? `Score computed from measured hands-on testing: ${handsOn[cat.key]?.notes || 'Verified'}`
        : `Score computed from verified desk research for ${cat.label}.`,
    }
  })

  // 5. Deterministic conflict detection
  const deterministicConflicts: Array<{
    field: string
    claimed: string
    measured: string
    delta: string
  }> = []
  if (deskResearch.withdrawalClaims?.processingTimes?.value && handsOn.withdrawals?.measuredTime) {
    const claimed = String(deskResearch.withdrawalClaims.processingTimes.value)
    const measured = String(handsOn.withdrawals.measuredTime)
    if (claimed !== measured) {
      deterministicConflicts.push({
        field: 'withdrawals.processingTime',
        claimed,
        measured,
        delta: `Stated processing time '${claimed}' differed from measured test payout time '${measured}'.`,
      })
    }
  }

  // 6. Model pass: rationale per category + qualitative conflicts
  const task = [
    'Return a strict JSON object with two keys:',
    'categoryNotes: an object mapping rubric category keys (see the computed scores in',
    '  the context) to a one-sentence rationale referencing the evidence. Only include',
    '  keys that exist as categories.',
    'conflicts: an array of { field, claimed, measured, delta } for contradictions you',
    '  notice between the desk research and the hands-on results. Do not invent measured',
    '  values that are not in the context.',
    'If there is nothing to add, return { "categoryNotes": {}, "conflicts": [] }.',
    'Return ONLY the JSON object.',
  ].join('\n')

  let modelNotes: Record<string, unknown> | null = null
  let modelConflicts: unknown = []
  let fallbackReason: string | null = null
  try {
    const res = await runAgentLlm(payload, req, {
      agentRole: 'score-analyst',
      roleFile,
      context: { ...context, computedScoresPreview: { categories } },
      task,
      maxTokens: 1200,
    })
    if (res.parsed) {
      modelNotes = typeof res.parsed.categoryNotes === 'object' && res.parsed.categoryNotes !== null
        ? (res.parsed.categoryNotes as Record<string, unknown>)
        : null
      modelConflicts = res.parsed.conflicts
    } else if (res.content !== null) {
      fallbackReason = 'Model reply was not parseable JSON — deterministic scoring kept.'
    }
  } catch (err) {
    fallbackReason = 'Model call failed — deterministic scoring kept.'
    payload.logger.error({ err, message: 'score-analyst model call failed — deterministic scoring kept', caseId, runId })
  }

  const enriched = enrichCategories(categories, modelNotes)
  const conflicts = mergeConflicts(deterministicConflicts, modelConflicts)

  const scoreAnalystOutput = {
    caseNumber: (context as any).caseNumber || `#PS-${caseId}`,
    rubricType: casinoType,
    scoredAt: new Date().toISOString().slice(0, 10),
    categories: enriched,
    conflicts,
    overallScore: null, // Always null in agent output — codebase computeOverallScore calculates it
  }

  // 7. Complete aiRun (marked when the model never ran)
  await completeAiRun(
    payload,
    req,
    caseId,
    runId,
    {
      computedScores: scoreAnalystOutput,
      ...(fallbackReason ? { _fallback: true, _fallbackReason: fallbackReason } : {}),
    },
    fallbackReason ? 'complete-with-warning' : 'complete',
  )

  // 8. Log agent event — the audit trail requirement (logging-spec.md) makes
  //    evidenceRef mandatory on grade_assigned; the aiRun that produced the
  //    grades is the evidence hop (latent bug fixed in G.5: without it the
  //    score analyst could never complete a run).
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'grade_assigned',
      evidenceRef: runId,
      operator: (context as any).operatorName,
      pageId: String(caseId),
      details: { runId, rubricType: casinoType },
    },
    req,
  )

  // 9. Optionally apply computed scores to case file
  if (opts?.apply) {
    if (typeof opts.expectedVersion !== 'number' || !Array.isArray(opts.changedFields)) {
      throw new Error('Applying computedScores requires expectedVersion (number) and changedFields (string[]).')
    }

    if (!opts.changedFields.includes('computedScores')) {
      throw new Error("changedFields must include 'computedScores' when applying score analyst output")
    }

    await applyDraft(
      payload,
      req,
      caseId,
      { computedScores: scoreAnalystOutput },
      opts.expectedVersion,
      opts.changedFields,
    )
  }

  return { runId, computedScores: scoreAnalystOutput }
}
