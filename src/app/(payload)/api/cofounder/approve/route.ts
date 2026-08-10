import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { runDeskResearch } from '@/agents/deskResearcher'
import { runScoreAnalyst } from '@/agents/scoreAnalyst'
import { runEditorialWriter } from '@/agents/editorialWriter'
import { logEvent, type AgentLogEvent } from '@/lib/logEvent'
import { agentForStatus, hasComputedScores } from '@/lib/reviewChat/roles'
import type { CofounderSession } from '@/payload-types'

/**
 * Phase G (G.6b) — delegation approve/reject (spec §4.1 executor contract +
 * §12 approve table), admin-only.
 *
 * `POST /api/cofounder/approve` — `{ ticketId, jobId, decision: 'approve' |
 * 'reject', expectedVersion?, changedFields?, note? }`
 *
 * - Reject: job → REJECTED (audit). Never executed.
 * - Approve (pipeline roles that apply a draft — desk-researcher /
 *   score-analyst / editorial-writer): mark APPROVED → run the real agent
 *   function WITH apply (concurrency contract, expectedVersion +
 *   changedFields from the loaded case) → DONE. The apply runs through the
 *   same applyDraft path as the case chat (review-before-write, S2-1): a
 *   stale approve 409s and is surfaced as BLOCKED_CONFLICT — never retried.
 * - Approve (any other role — roster-only or non-applying pipeline roles):
 *   mark APPROVED and stop. Execution of roster briefs happens outside the
 *   admin (a human or future orchestrator polls the queue); integrity-checker
 *   verdicts and monitorLogs are applied via their own case-chat flows, not
 *   by an approve action.
 *
 * The job write goes through the TICKET's optimistic-version contract
 * (delegationQueue is on cofounder-sessions) — same as set_plan_item.
 */

const PIPELINE_APPLY_FNS: Record<
  string,
  (
    payload: Awaited<ReturnType<typeof getPayload>>,
    req: Awaited<ReturnType<typeof createLocalReq>>,
    caseId: number | string,
    applyOpts: { apply: true; expectedVersion: number; changedFields: string[] },
  ) => Promise<Record<string, unknown>>
> = {
  'desk-researcher': runDeskResearch as never,
  'score-analyst': runScoreAnalyst as never,
  'editorial-writer': runEditorialWriter as never,
}

const CHANGED_FIELDS_BY_ROLE: Record<string, string[]> = {
  'desk-researcher': ['deskResearchOutput', 'evidenceRegister'],
  'score-analyst': ['computedScores'],
  'editorial-writer': ['editorialDraft'],
}

/** Human-readable role label for audit details. */
const ROLE_LABEL: Record<string, string> = {
  qa: 'QA',
  reviewer: 'Reviewer',
  researcher: 'Researcher',
  'content-writer': 'Content writer',
  'desk-researcher': 'Desk researcher',
  'score-analyst': 'Score analyst',
  'editorial-writer': 'Editorial writer',
  'integrity-checker': 'Integrity checker',
  monitor: 'Monitor',
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  let body: {
    ticketId?: number | string
    jobId?: string
    decision?: string
    expectedVersion?: number
    changedFields?: string[]
    note?: string
  }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const ticketId = Number(body.ticketId)
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
  const decision = body.decision === 'reject' ? 'reject' : 'approve'
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return new Response('ticketId is required.', { status: 400 })
  }
  if (!jobId) return new Response('jobId is required.', { status: 400 })

  try {
    const ticket = (await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticketId,
      req,
      depth: 0,
    })) as unknown as CofounderSession
    if (!ticket) return new Response('Ticket not found.', { status: 404 })

    const queue = Array.isArray(ticket.delegationQueue) ? [...ticket.delegationQueue] : []
    const idx = queue.findIndex((j) => j.jobId === jobId)
    if (idx === -1) return new Response('Delegation job not found on this ticket.', { status: 404 })
    const job = queue[idx] as Record<string, unknown>

    if (job.status !== 'QUEUED') {
      return new Response(`Job is already ${String(job.status ?? 'unknown')} — only QUEUED jobs can be decided.`, { status: 409 })
    }

    const role = String(job.role ?? '')
    const caseId = job.caseId as number | string | null | undefined

    // ---- Reject: mark REJECTED, audit, done ----
    if (decision === 'reject') {
      await updateQueue(payload, req, ticketId, jobId, (j) => ({
        ...j,
        status: 'REJECTED',
        completedAt: new Date().toISOString(),
        notes: typeof body.note === 'string' ? body.note : null,
      }))
      await audit(payload, req, 'delegation_rejected', ticket, {
        jobId,
        role,
        caseId,
        note: body.note ?? null,
      })
      return Response.json({ ok: true, decision: 'reject', jobId, status: 'REJECTED' })
    }

    // ---- Approve ----
    const expectedVersion = body.expectedVersion
    const applyFn = PIPELINE_APPLY_FNS[role]

    if (applyFn && caseId) {
      // Pipeline role with a draft-apply path: verify the case's canonical
      // agent matches the job role (spec §12 stage column) so a draft never
      // lands at the wrong pipeline stage. Mismatch → mark APPROVED without
      // apply and say so (the queue is a proposal surface; Viktor decides).
      const caseDoc = await payload
        .findByID({ collection: 'research-queue', id: caseId, req, depth: 0 })
        .catch(() => null)
      if (!caseDoc) {
        return new Response('Linked case not found.', { status: 404 })
      }
      const canonical = agentForStatus(String(caseDoc.status), hasComputedScores(caseDoc.computedScores))
      if (canonical.role !== role) {
        await updateQueue(payload, req, ticketId, jobId, (j) => ({
          ...j,
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
          notes: `Case ${caseDoc.status} expects ${canonical.label}; approve did not apply the draft.`,
        }))
        await audit(payload, req, 'delegation_approved', ticket, {
          jobId,
          role,
          caseId,
          applied: false,
          reason: `case at ${caseDoc.status}, expects ${canonical.role ?? 'none'}`,
        })
        return Response.json({
          ok: true,
          decision: 'approve',
          jobId,
          status: 'APPROVED',
          applied: false,
          message: `Approved (not applied): the case is at '${caseDoc.status}', which expects ${canonical.label}. Apply via the case chat.`,
        })
      }

      if (typeof expectedVersion !== 'number') {
        return new Response('expectedVersion is required to approve a draft-applying job (review-before-write).', { status: 400 })
      }
      const changedFields = CHANGED_FIELDS_BY_ROLE[role]

      // Mark APPROVED + RUNNING, then execute the real function with apply.
      await updateQueue(payload, req, ticketId, jobId, (j) => ({
        ...j,
        status: 'RUNNING',
        approvedAt: new Date().toISOString(),
      }))

      try {
        // The agent runs with a FRESH local req: the ticket's optimistic-version
        // context (expectedVersion/changedFields set by updateQueue above) is
        // scoped per-call in Payload, but the shared `req` object carries it
        // forward — and the version hook on research-queue reads req.context.
        // A stale expectedVersion from the ticket write would 409 the agent's
        // own case writes (startAiRun/completeAiRun) and abort the apply.
        const agentReq = await createLocalReq({ user }, payload)
        const result = await applyFn(payload, agentReq, caseId, {
          apply: true,
          expectedVersion,
          changedFields,
        })
        const runId = String(result.runId ?? '')
        await updateQueue(payload, req, ticketId, jobId, (j) => ({
          ...j,
          status: 'DONE',
          outputRef: runId,
          completedAt: new Date().toISOString(),
        }))
        await audit(payload, req, 'delegation_approved', ticket, {
          jobId,
          role,
          caseId,
          applied: true,
          runId,
          caseVersion: expectedVersion,
        })
        return Response.json({
          ok: true,
          decision: 'approve',
          jobId,
          status: 'DONE',
          applied: true,
          runId,
          message: `${ROLE_LABEL[role] ?? role} draft applied to case ${caseId}.`,
        })
      } catch (err) {
        // Concurrency gate 409 (stale expectedVersion) — surface as
        // BLOCKED_CONFLICT, never retry silently. Revert to QUEUED so the
        // human can reload and decide again.
        const status = (err as { status?: unknown })?.status
        if (status === 409) {
          await updateQueue(payload, req, ticketId, jobId, (j) => ({
            ...j,
            status: 'QUEUED',
            notes: 'BLOCKED_CONFLICT — case changed; reload and decide again.',
          }))
          await audit(payload, req, 'delegation_conflict', ticket, {
            jobId,
            role,
            caseId,
            code: 'BLOCKED_CONFLICT',
          })
          return new Response(
            `BLOCKED_CONFLICT — ${(err as Error)?.message ?? 'case changed while approving — reload and decide again.'}`,
            { status: 409 },
          )
        }
        // Any other failure: revert to QUEUED so the job isn't lost.
        await updateQueue(payload, req, ticketId, jobId, (j) => ({
          ...j,
          status: 'QUEUED',
          notes: `Approve failed: ${(err as Error)?.message}`,
        }))
        await audit(payload, req, 'delegation_error', ticket, {
          jobId,
          role,
          caseId,
          message: (err as Error)?.message,
        })
        return new Response((err as Error)?.message ?? 'Approve failed.', { status: 500 })
      }
    }

    // Roster-only or non-applying role: mark APPROVED, stop. Execution
    // happens outside the admin (executor contract, spec §4.1).
    await updateQueue(payload, req, ticketId, jobId, (j) => ({
      ...j,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
    }))
    await audit(payload, req, 'delegation_approved', ticket, {
      jobId,
      role,
      caseId,
      applied: false,
      reason: 'roster/non-applying role — executed outside the admin',
    })
    return Response.json({
      ok: true,
      decision: 'approve',
      jobId,
      status: 'APPROVED',
      applied: false,
      message: `${ROLE_LABEL[role] ?? role} job approved — a human/orchestrator executes the brief outside the admin (spec §4.1 executor contract).`,
    })
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder approve error' })
    const status =
      typeof (e as { status?: unknown })?.status === 'number' &&
      (e as { status: number }).status >= 400 &&
      (e as { status: number }).status < 600
        ? (e as { status: number }).status
        : 500
    return new Response((e as Error)?.message ?? 'Internal error', { status })
  }
}

/**
 * Queue write through the TICKET's optimistic-version contract. Reads the
 * ticket fresh, applies `mutate` to the matching job, writes with the fresh
 * version (one 409 retry that re-reads + re-applies so a concurrent write
 * never clobbers the queue).
 */
async function updateQueue(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  ticketId: number,
  jobId: string,
  mutate: (job: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const fresh = (await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticketId,
      req,
      depth: 0,
    })) as unknown as CofounderSession
    const queue = Array.isArray(fresh.delegationQueue) ? [...fresh.delegationQueue] : []
    const nextQueue = queue.map((j) => {
      const job = j as Record<string, unknown>
      return job.jobId === jobId ? mutate(job) : job
    })
    try {
      await payload.update({
        collection: 'cofounder-sessions',
        id: ticketId,
        req,
        context: { expectedVersion: fresh.version ?? 1, changedFields: ['delegationQueue'] },
        data: { delegationQueue: nextQueue },
      })
      return
    } catch (err) {
      const status = (err as { status?: unknown })?.status
      if (status !== 409 || attempt === 1) throw err
      // retry loop re-reads fresh above
    }
  }
}

async function audit(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  event: AgentLogEvent,
  ticket: CofounderSession,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await logEvent(
      payload,
      {
        agentId: req.user?.email ?? 'system',
        brand: '01-playerside',
        event,
        pageId: String(ticket.id),
        details: { ticketNumber: ticket.ticketNumber, ...details },
      },
      req,
    )
  } catch (err) {
    payload.logger.error({ err, message: `cofounder approve audit (${event}) failed` })
  }
}
