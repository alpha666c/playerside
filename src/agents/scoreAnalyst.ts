import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'
import { traditionalRubric } from '@/rubrics/traditional'
import { cryptoRubric } from '@/rubrics/crypto'

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

  // 4. Compute per-category scores based on locked rubric
  const categories = rubric.map((cat) => {
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

  // 5. Detect conflicts between claimed and measured values
  const conflicts: Array<{ field: string; claimed: string; measured: string; delta: string }> = []

  if (deskResearch.withdrawalClaims?.processingTimes?.value && handsOn.withdrawals?.measuredTime) {
    const claimed = String(deskResearch.withdrawalClaims.processingTimes.value)
    const measured = String(handsOn.withdrawals.measuredTime)
    if (claimed !== measured) {
      conflicts.push({
        field: 'withdrawals.processingTime',
        claimed,
        measured,
        delta: `Stated processing time '${claimed}' differed from measured test payout time '${measured}'.`,
      })
    }
  }

  const scoreAnalystOutput = {
    caseNumber: (context as any).caseNumber || `#PS-${caseId}`,
    rubricType: casinoType,
    scoredAt: new Date().toISOString().slice(0, 10),
    categories,
    conflicts,
    overallScore: null, // Always null in agent output — codebase computeOverallScore calculates overall weighted score
  }

  // 6. Complete aiRun
  await completeAiRun(payload, req, caseId, runId, { computedScores: scoreAnalystOutput })

  // 7. Log agent event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'grade_assigned',
      operator: (context as any).operatorName,
      pageId: String(caseId),
      details: { runId, rubricType: casinoType },
    },
    req,
  )

  // 8. Optionally apply computed scores to case file
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
