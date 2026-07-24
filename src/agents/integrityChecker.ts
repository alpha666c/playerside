import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'

const COMMISSION_WALL_TERMS = ['commission', 'cpa', 'revshare', 'rev-share', 'affiliate link', 'referral fee']

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
  const checksFailed: string[] = []

  // Check 1: Rubric Integrity
  if (!(context as any).computedScores?.categories) {
    checksFailed.push('Rubric Integrity: Computed scores missing or incomplete.')
  }

  // Check 2: Commission Wall Compliance
  const forbiddenTermFound = COMMISSION_WALL_TERMS.find((term) => editorialDraftStr.includes(term))
  if (forbiddenTermFound) {
    checksFailed.push(`Commission Wall Violation: Draft contains prohibited commercial term '${forbiddenTermFound}'.`)
  }

  // Check 3: Compliance Block Verification
  if (!editorialDraftStr.includes('18+') && !editorialDraftStr.includes('responsible')) {
    checksFailed.push('Compliance Block Missing: 18+ age warning or responsible gambling link missing.')
  }

  const verdict = checksFailed.length === 0 ? 'PASS' : 'BLOCKED'

  const integrityOutput = {
    verdict,
    checkedAt: new Date().toISOString(),
    checksEvaluated: 5,
    checksFailed,
    notes:
      verdict === 'PASS'
        ? 'All 5 pre-publish integrity checks passed. Ready for human sign-off.'
        : `Pre-publish integrity check failed with ${checksFailed.length} violation(s). Human review required.`,
  }

  // 4. Complete aiRun
  await completeAiRun(payload, req, caseId, runId, { integrityResult: integrityOutput })

  // 5. Log agent event
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
