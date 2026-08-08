import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { runDeskResearch } from '@/agents/deskResearcher'
import { runScoreAnalyst } from '@/agents/scoreAnalyst'
import { runEditorialWriter } from '@/agents/editorialWriter'
import { runIntegrityChecker } from '@/agents/integrityChecker'
import { runMonitor } from '@/agents/monitor'
import { recordChatTurn } from '@/agents/runner'
import { agentForStatus, hasComputedScores } from '@/lib/reviewChat/roles'

export const maxDuration = 240

/**
 * Blueprint §10 — the CaseFile AI chat route. Role is derived STRICTLY from
 * the case's current status (never from client input). The panel shows agent
 * output as a draft; a human "Apply" is what writes, through the optimistic-
 * concurrency contract (expectedVersion + changedFields, 409 on conflict).
 * The user's message is recorded onto the run's aiRuns entry for history
 * continuity across sessions.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })

  const payloadReq = await createLocalReq({ user }, payload)

  try {
    const { caseId, message, apply, expectedVersion } = await request.json()

    // Spec §3.4 — bound prompt size so a single request can't balloon the
    // stored conversation (and, later, a model call).
    if (typeof message === 'string' && message.length > 4000) {
      return new Response('Message too long (max 4000 characters).', { status: 400 })
    }

    const doc: any = await payload.findByID({
      collection: 'research-queue',
      id: caseId,
      req: payloadReq,
    })
    if (!doc) return new Response('Case not found', { status: 404 })

    const status = doc.status
    const computedScoresPopulated = hasComputedScores(doc.computedScores)
    const agent = agentForStatus(status, computedScoresPopulated)

    // Concurrency contract (spec §3.3): the panel sends the version it last
    // loaded so a stale panel cannot overwrite a concurrent human edit. When
    // the client doesn't send one, fall back to the freshly-read version —
    // kept for back-compat callers (e.g. the legacy /dashboard drawer), and
    // logged so the weaker path is observable.
    const clientSentVersion = typeof expectedVersion === 'number' && Number.isInteger(expectedVersion)
    const versionForApply = clientSentVersion ? expectedVersion : doc.version ?? 1
    if (apply && !clientSentVersion) {
      payload.logger.info(
        `review-chat: apply on case ${caseId} fell back to the freshly-read version (caller omitted expectedVersion) — conflict protection reduced to the request window.`,
      )
    }

    const applyOpts = apply
      ? { apply: true as const, expectedVersion: versionForApply, changedFields: agent.changedFields }
      : undefined

    let result: Record<string, unknown>
    if (status === 'desk-research') {
      result = await runDeskResearch(payload, payloadReq, caseId, applyOpts)
    } else if (status === 'editorial' && !computedScoresPopulated) {
      result = await runScoreAnalyst(payload, payloadReq, caseId, applyOpts)
    } else if (status === 'editorial') {
      result = await runEditorialWriter(payload, payloadReq, caseId, applyOpts)
    } else if (status === 'integrity-check') {
      result = await runIntegrityChecker(payload, payloadReq, caseId)
    } else if (status === 'published' || status === 'monitoring') {
      result = await runMonitor(payload, payloadReq, caseId, applyOpts)
    } else {
      return Response.json({ status, message: `No active agent for status '${status}'.` })
    }

    // Record the conversation turn for cross-session continuity (only when a
    // prompt was actually sent; apply-only calls skip this).
    if (typeof message === 'string' && message.trim().length > 0 && typeof result.runId === 'string') {
      await recordChatTurn(payload, payloadReq, caseId, result.runId, {
        userMessage: message,
        assistantSummary: agentSummary(agent.role, result),
      })
    }

    return Response.json(result)
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'review-chat error' })
    // Preserve the status of Payload errors (e.g. the concurrency gate's 409
    // when a stale panel version hits enforceOptimisticVersion) so the panel
    // can show the real conflict instead of a generic 500.
    const status =
      typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500
    return new Response(e?.message ?? 'Internal error', { status })
  }
}

/** Short human-readable line stored as the assistant turn (full output lives in the run's `output`). */
function agentSummary(role: string | null, result: Record<string, unknown>): string {
  switch (role) {
    case 'desk-researcher':
      return 'Desk research draft generated — every claim is unverified until confirmed, and the evidence register is a placeholder scaffold.'
    case 'score-analyst':
      return 'Category scores computed from the locked rubric — unverified categories stay conservatively mid-scored pending hands-on evidence.'
    case 'editorial-writer':
      return 'Editorial draft generated for review — nothing is applied until you explicitly Apply it.'
    case 'integrity-checker':
      return `Integrity check complete — ${JSON.stringify((result.integrityResult as { verdict?: string })?.verdict ?? 'see output')}.`
    case 'monitor':
      return 'Monitor check complete — no material changes detected (placeholder scaffold).'
    default:
      return 'Agent output generated.'
  }
}
