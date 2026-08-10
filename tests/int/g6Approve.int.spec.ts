import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Phase G (G.6b) — delegation approve/reject executor contract (spec §4.1 +
 * §12 approve table). The real route handler is invoked directly with
 * `payload.auth` + `next/headers` mocked, and the pipeline agent fns are
 * hoisted-mocked, so the contract — QUEUED → APPROVED → RUNNING → DONE, the
 * draft-apply handoff via applyDraft (expectedVersion + changedFields), and
 * BLOCKED_CONFLICT — is verified end-to-end against the REAL ticket/case
 * collections without real model calls.
 */

const deskResearcherMock = vi.hoisted(() => vi.fn())

vi.mock('@/agents/deskResearcher', () => ({
  runDeskResearch: deskResearcherMock,
}))

// The route reads the request headers and authenticates via payload.auth —
// in the test harness we stub the session at that boundary (the auth posture
// itself is covered by the browser E2E; here we exercise the flow).
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

let payload: Payload
let reqUser: { id: number; email: string }
const createdTicketIds: number[] = []
const createdCaseIds: number[] = []
const TEST_EMAIL = 'cofounder-approve-test@example.invalid'

/** Import the route lazily so the vi.mocks are registered first. */
let approveRoute: (request: Request) => Promise<Response>

beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })

  // Stub auth: any request is treated as the test admin (the route's only
  // guard is `payload.auth` returning a user; verified by browser E2E).
  vi.spyOn(payload, 'auth').mockResolvedValue({ user: reqUser as never, token: 'test-token' } as never)

  const staleUsers = await payload.find({
    collection: 'users',
    limit: 50,
    where: { email: { equals: TEST_EMAIL } },
  })
  for (const u of staleUsers.docs) await payload.delete({ id: u.id, collection: 'users' })

  const created = await payload.create({
    collection: 'users',
    data: { email: TEST_EMAIL, password: 'test-password-1', name: 'Cofounder Approve Test' },
  })
  reqUser = { id: created.id, email: created.email }

  // Re-point the auth spy at the real user once known (the user object above
  // is set before the spy runs — spy holds a reference via reqUser variable).
  vi.spyOn(payload, 'auth').mockResolvedValue({ user: reqUser as never, token: 'test-token' } as never)
})

// Mock state must not leak between tests: an earlier test's agent call would
// trip a later test's `not.toHaveBeenCalled()`, and vitest's diff would then
// try to print the full payload object (RangeError: Invalid string length).
// clearAllMocks keeps the auth spy's implementation intact (it only resets
// recorded calls/results).
beforeEach(() => {
  vi.clearAllMocks()
})

afterAll(async () => {
  for (const id of createdCaseIds) {
    await payload.delete({ id, collection: 'research-queue' }).catch(() => {})
  }
  for (const id of createdTicketIds) {
    await payload.delete({ id, collection: 'cofounder-sessions' }).catch(() => {})
  }
  await payload.delete({ id: reqUser.id, collection: 'users' }).catch(() => {})
  vi.restoreAllMocks()
})

const makeReq = () => ({ user: { id: reqUser.id, email: reqUser.email } }) as never

describe('delegation approve/reject (spec §4.1 / §12)', () => {
  it('rejects a job: QUEUED → REJECTED, no agent called, no draft applied', async () => {
    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        // Explicit number: the #CF-YYMMDD-NN hook is count-then-insert and
        // collides when parallel workers create tickets concurrently.
        ticketNumber: `#CF-260809-${101 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — reject path',
        sessionType: 'review-run',
        status: 'active',
        delegationQueue: [
          {
            jobId: 'job-reject-1',
            role: 'desk-researcher',
            brief: 'Desk research for the reject test.',
            source: 'cofounder',
            status: 'QUEUED',
            caseId: null,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    const res = await executeApprove({ ticketId: ticket.id, jobId: 'job-reject-1', decision: 'reject' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('REJECTED')
    expect(deskResearcherMock).not.toHaveBeenCalled()

    const fresh = (await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticket.id,
      depth: 0,
    })) as unknown as { delegationQueue: Array<Record<string, unknown>> }
    const job = fresh.delegationQueue.find((j) => j.jobId === 'job-reject-1')
    expect(job?.status).toBe('REJECTED')
    expect(job?.completedAt).toBeTruthy()
  })

  it('refuses to decide an already-decided job (409)', async () => {
    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        ticketNumber: `#CF-260809-${201 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — double decision',
        sessionType: 'review-run',
        status: 'active',
        delegationQueue: [
          {
            jobId: 'job-double-1',
            role: 'qa',
            brief: 'QA pass.',
            source: 'cofounder',
            status: 'DONE',
            caseId: null,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    const res = await executeApprove({ ticketId: ticket.id, jobId: 'job-double-1', decision: 'approve' })
    expect(res.status).toBe(409)
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('approves a roster-only job: QUEUED → APPROVED, marked for external execution (no apply)', async () => {
    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        ticketNumber: `#CF-260809-${301 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — roster role',
        sessionType: 'review-run',
        status: 'active',
        delegationQueue: [
          {
            jobId: 'job-roster-1',
            role: 'content-writer',
            brief: 'Write the bonus explainer.',
            source: 'cofounder',
            status: 'QUEUED',
            caseId: null,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    const res = await executeApprove({ ticketId: ticket.id, jobId: 'job-roster-1', decision: 'approve' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; applied: boolean }
    expect(body.status).toBe('APPROVED')
    expect(body.applied).toBe(false)
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('approves a pipeline job at the matching stage: runs the agent WITH apply, job → DONE + outputRef', async () => {
    const caseDoc = await createCaseAtStage('Approve Flow Test Operator', 'desk-research')
    createdCaseIds.push(caseDoc.id)

    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        ticketNumber: `#CF-260809-${401 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — pipeline apply',
        sessionType: 'review-run',
        status: 'active',
        pinnedCases: [caseDoc.id],
        delegationQueue: [
          {
            jobId: 'job-pipe-1',
            role: 'desk-researcher',
            brief: 'Run desk research and apply.',
            source: 'cofounder',
            status: 'QUEUED',
            caseId: caseDoc.id,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    // The real agent applies via applyDraft — the mock reproduces that exact
    // write (concurrency contract) so the case update is a real one. G.6:
    // the route must hand the agent a FRESH local req — the ticket write's
    // optimistic-version context must not leak into the case write (that
    // leaked context 409'd completeAiRun in the E2E).
    const { applyDraft } = await import('@/agents/runner')
    deskResearcherMock.mockImplementationOnce(async (payload, req, caseId, applyOpts) => {
      // G.6: the route hands the agent a FRESH local req — the ticket write's
      // optimistic-version context must not leak into the case write (the
      // leaked context 409'd completeAiRun in the E2E). createLocalReq seeds
      // context to {} — the leak would show up as expectedVersion present.
      const agentCtx = (req as { context?: { expectedVersion?: unknown } }).context ?? {}
      expect(agentCtx.expectedVersion).toBeUndefined()
      await applyDraft(
        payload,
        req,
        caseId,
        { deskResearchOutput: { licensing: { primary: { value: 'KSA-APPROVE' } } }, evidenceRegister: [{ label: 'license row' }] },
        applyOpts.expectedVersion,
        applyOpts.changedFields,
      )
      return {
        runId: 'run-approve-1',
        deskResearchOutput: { licensing: { primary: { value: 'KSA-APPROVE' } } },
        evidenceRegister: [{ label: 'license row' }],
      }
    })

    const res = await executeApprove({
      ticketId: ticket.id,
      jobId: 'job-pipe-1',
      decision: 'approve',
      expectedVersion: (caseDoc as unknown as { version: number }).version ?? 1,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; applied: boolean; runId: string }
    expect(body.status).toBe('DONE')
    expect(body.applied).toBe(true)
    expect(body.runId).toBe('run-approve-1')

    // Agent called WITH apply + the concurrency contract (never a blind write)
    expect(deskResearcherMock).toHaveBeenCalledTimes(1)
    const callArgs = deskResearcherMock.mock.calls[0]
    expect(callArgs.slice(0, 3)).toEqual([payload, expect.anything(), caseDoc.id])
    const applyOpts = callArgs[3] as { apply: true; expectedVersion: number; changedFields: string[] }
    expect(applyOpts.apply).toBe(true)
    expect(applyOpts.changedFields).toEqual(['deskResearchOutput', 'evidenceRegister'])
    expect(typeof applyOpts.expectedVersion).toBe('number')

    // The draft actually landed on the case (real agent fn → real applyDraft)
    const appliedCase = (await payload.findByID({
      collection: 'research-queue',
      id: caseDoc.id,
      depth: 0,
    })) as unknown as { deskResearchOutput?: { licensing?: { primary?: { value?: string } } } }
    expect(appliedCase.deskResearchOutput?.licensing?.primary?.value).toBe('KSA-APPROVE')

    const fresh = (await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticket.id,
      depth: 0,
    })) as unknown as { delegationQueue: Array<Record<string, unknown>> }
    const job = fresh.delegationQueue.find((j) => j.jobId === 'job-pipe-1')
    expect(job?.status).toBe('DONE')
    expect(job?.outputRef).toBe('run-approve-1')
  })

  it('refuses to apply a pipeline draft at the wrong stage — marks APPROVED with a note instead', async () => {
    // Case at editorial (no scores) but the job asks for desk-researcher:
    // canonical agent for editorial-no-scores is score-analyst → mismatch.
    const caseDoc = await createCaseAtStage('Wrong Stage Test Operator', 'editorial')
    createdCaseIds.push(caseDoc.id)

    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        ticketNumber: `#CF-260809-${501 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — wrong stage',
        sessionType: 'review-run',
        status: 'active',
        pinnedCases: [caseDoc.id],
        delegationQueue: [
          {
            jobId: 'job-stage-1',
            role: 'desk-researcher',
            brief: 'Desk research.',
            source: 'cofounder',
            status: 'QUEUED',
            caseId: caseDoc.id,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    const res = await executeApprove({
      ticketId: ticket.id,
      jobId: 'job-stage-1',
      decision: 'approve',
      expectedVersion: (caseDoc as unknown as { version: number }).version ?? 1,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; applied: boolean }
    expect(body.status).toBe('APPROVED')
    expect(body.applied).toBe(false)
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('surfaces a stale approve as BLOCKED_CONFLICT and reverts the job to QUEUED (never silent retry)', async () => {
    const caseDoc = await createCaseAtStage('Conflict Test Operator', 'desk-research')
    createdCaseIds.push(caseDoc.id)

    const ticket = await payload.create({
      collection: 'cofounder-sessions',
      data: {
        ticketNumber: `#CF-260809-${601 + (Date.now() % 5000)}`,
        title: 'Cofounder approve test — stale conflict',
        sessionType: 'review-run',
        status: 'active',
        pinnedCases: [caseDoc.id],
        delegationQueue: [
          {
            jobId: 'job-conflict-1',
            role: 'desk-researcher',
            brief: 'Run desk research.',
            source: 'cofounder',
            status: 'QUEUED',
            caseId: caseDoc.id,
            outputRef: null,
            createdAt: new Date().toISOString(),
          },
        ],
      } as never,
      req: makeReq(),
    })
    createdTicketIds.push(ticket.id)

    // The agent itself throws the 409 from applyDraft (stale expectedVersion)
    deskResearcherMock.mockRejectedValueOnce(
      Object.assign(new Error('Concurrency conflict — expected version mismatch.'), { status: 409 }),
    )

    const res = await executeApprove({
      ticketId: ticket.id,
      jobId: 'job-conflict-1',
      decision: 'approve',
      expectedVersion: (caseDoc as unknown as { version: number }).version ?? 1,
    })
    expect(res.status).toBe(409)
    const text = await res.text()
    expect(text).toContain('BLOCKED_CONFLICT')

    const fresh = (await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticket.id,
      depth: 0,
    })) as unknown as { delegationQueue: Array<Record<string, unknown>> }
    const job = fresh.delegationQueue.find((j) => j.jobId === 'job-conflict-1')
    expect(job?.status).toBe('QUEUED')
    expect(String(job?.notes ?? '')).toContain('BLOCKED_CONFLICT')
  })
})

/**
 * Create a research-queue case and walk it to `stage` through the pipeline's
 * strict one-stage-at-a-time law (create → queued, then one transition per
 * gate-able hop; each hop requires its exit field, which we set along the
 * way so the stage's entry gate passes).
 */
async function createCaseAtStage(
  operatorName: string,
  stage: 'desk-research' | 'editorial',
): Promise<{ id: number; version: number }> {
  const suffix = String(Date.now()).slice(-5)
  const created = (await payload.create({
    collection: 'research-queue',
    data: {
      // #PS-YYYY-NNN — the collection's validated caseNumber format
      caseNumber: `#PS-${new Date().getUTCFullYear()}-${100 + (Date.now() % 900)}`,
      operatorName,
      casinoType: 'traditional',
      status: 'queued',
    } as never,
    req: makeReq(),
  })) as unknown as { id: number; version: number }

  if (stage === 'desk-research') {
    // queued → desk-research has no entry gate (first hop).
    const updated = (await payload.update({
      id: created.id,
      collection: 'research-queue',
      req: makeReq(),
      data: { status: 'desk-research' },
    })) as unknown as { id: number; version: number }
    return updated
  }

  // queued → desk-research → hands-on-testing → editorial. Each hop's entry
  // gate checks the previous stage's exit condition.
  await payload.update({
    id: created.id,
    collection: 'research-queue',
    req: makeReq(),
    data: { status: 'desk-research' },
  })
  await payload.update({
    id: created.id,
    collection: 'research-queue',
    req: makeReq(),
    data: {
      status: 'hands-on-testing',
      deskResearchOutput: { licensing: { primary: { value: 'KSA-X' } } },
      evidenceRegister: [{ label: 'row', claimKey: 'x', verificationStatus: 'unverified' }],
    },
  })
  const updated = (await payload.update({
    id: created.id,
    collection: 'research-queue',
    req: makeReq(),
    data: {
      status: 'editorial',
      handsOnResults: {
        withdrawalActualHours: 2,
        supportActualMinutes: 3,
        kycActualDays: 1,
        bonusActualWager: 35,
      },
    },
  })) as unknown as { id: number; version: number }
  return updated
}

/** Thin helper mirroring the route's POST contract. */
async function executeApprove(body: Record<string, unknown>): Promise<Response> {
  if (!approveRoute) {
    // Dynamic import after mocks are registered
    approveRoute = (await import('@/app/(payload)/api/cofounder/approve/route')).POST
  }
  return approveRoute(
    new Request('http://localhost/api/cofounder/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}
