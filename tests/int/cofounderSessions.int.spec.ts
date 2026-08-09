import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Phase G (G.2) — CofounderSessions ticket collection tests (spec §8 tests
 * #1 + #11). Runs against the real local DB like the other int tests.
 *
 * Covers: auto ticket numbering (#CF-YYMMDD-NN), create defaults (status,
 * lastActiveAt, createdBy, version), the resume cycle (create → pause →
 * resume → plan/thread intact), the optimistic-version contract (stale
 * expectedVersion → 409; missing changedFields → 400; correct guard bumps
 * version), and the audit row on create.
 */

let payload: Payload
let reqUser: { id: number; email: string }
/** Fresh req per call — Payload merges `context` INTO req.context, so a shared
 * req would leak expectedVersion/changedFields between tests (test isolation). */
const makeReq = () => ({ user: { id: reqUser.id, email: reqUser.email } }) as never
const createdTicketIds: number[] = []
const TEST_EMAIL = 'cofounder-test@example.invalid'

beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })

  // clean stale test user/tickets from previous runs
  const staleUsers = await payload.find({
    collection: 'users',
    limit: 50,
    where: { email: { equals: TEST_EMAIL } },
  })
  for (const u of staleUsers.docs) await payload.delete({ id: u.id, collection: 'users' })
  const staleTickets = await payload.find({
    collection: 'cofounder-sessions',
    limit: 50,
    where: { title: { like: '%Cofounder int test%' } },
  })
  for (const t of staleTickets.docs) await payload.delete({ id: t.id, collection: 'cofounder-sessions' })

  const user = await payload.create({
    collection: 'users',
    data: { email: TEST_EMAIL, password: 'cofounder-test-password-1', name: 'Cofounder Test' },
  })
  reqUser = { id: user.id, email: TEST_EMAIL }
})

const createTicket = async (title: string) => {
  // `as never` — ticketNumber is `required` in the generated type but is
  // auto-assigned by the field-level beforeValidate hook before validation.
  const ticket = (await payload.create({
    collection: 'cofounder-sessions',
    req: makeReq(),
    data: {
      title,
      sessionType: 'review-run',
      plan: [
        {
          kind: 'casino-review',
          target: 'Stake.com',
          status: 'todo',
          notes: 'first pass',
        },
      ],
    },
  } as never))
  createdTicketIds.push(Number(ticket.id))
  return ticket as {
    id: number
    ticketNumber: string
    title: string
    status: string
    lastActiveAt: string | null
    createdBy: unknown
    version: number
    plan: unknown[]
    thread: unknown[]
  }
}

afterAll(async () => {
  for (const id of createdTicketIds) {
    await payload.delete({ id, collection: 'cofounder-sessions', req: makeReq() }).catch(() => {})
  }
  createdTicketIds.length = 0
  await payload
    .delete({ collection: 'users', where: { email: { equals: TEST_EMAIL } } })
    .catch(() => {})
})

describe('CofounderSessions', () => {
  it('auto-assigns #CF-YYMMDD-NN and sets create defaults', async () => {
    const t = await createTicket('Cofounder int test — numbering')
    expect(t.ticketNumber).toMatch(/^#CF-\d{6}-\d{2,}$/)
    expect(t.status).toBe('open')
    expect(t.lastActiveAt).toBeTruthy()
    expect(t.createdBy).toEqual(expect.objectContaining({ id: reqUser.id }))
    expect(t.version).toBe(1)
    expect(t.plan).toHaveLength(1)
  })

  it('increments NN per day (no shared counter)', async () => {
    const a = await createTicket('Cofounder int test — seq A')
    const b = await createTicket('Cofounder int test — seq B')
    const datePart = a.ticketNumber.slice(3, 9)
    expect(b.ticketNumber.slice(3, 9)).toBe(datePart)
    const seqA = Number(a.ticketNumber.slice(11))
    const seqB = Number(b.ticketNumber.slice(11))
    expect(seqB).toBe(seqA + 1)
  })

  it('bumps lastActiveAt on update and keeps thread/plan on the resume cycle', async () => {
    const t = await createTicket('Cofounder int test — resume')
    const firstActive = t.lastActiveAt as string

    await payload.update({
      id: t.id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      data: {
        status: 'paused',
        thread: [{ role: 'user', content: 'start planning', timestamp: new Date().toISOString() }],
      },
    })

    await new Promise((r) => setTimeout(r, 25)) // ensure timestamp ordering
    const resumed = (await payload.update({
      id: t.id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      data: { status: 'active' },
    })) as unknown as { status: string; lastActiveAt: string; thread: unknown[]; plan: unknown[]; version: number }

    expect(resumed.status).toBe('active')
    expect(resumed.lastActiveAt > firstActive).toBe(true)
    expect(resumed.thread).toHaveLength(1)
    expect(resumed.plan).toHaveLength(1)
    expect(resumed.version).toBe(1) // un-guarded writes don't bump version
  })

  it('rejects a stale expectedVersion with 409 (spec test #11)', async () => {
    const t = await createTicket('Cofounder int test — version conflict')

    // correct guard: bumps version to 2
    const ok = (await payload.update({
      id: t.id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      context: { expectedVersion: 1, changedFields: ['status'] },
      data: { status: 'paused' },
    })) as unknown as { version: number; status: string }
    expect(ok.version).toBe(2)
    expect(ok.status).toBe('paused')

    // stale guard: 409, no clobber
    await expect(
      payload.update({
        id: t.id,
        collection: 'cofounder-sessions',
        req: makeReq(),
        context: { expectedVersion: 1, changedFields: ['status'] },
        data: { status: 'done' },
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('requires changedFields alongside expectedVersion (400)', async () => {
    const t = await createTicket('Cofounder int test — missing changedFields')
    await expect(
      payload.update({
        id: t.id,
        collection: 'cofounder-sessions',
        req: makeReq(),
        context: { expectedVersion: 1 },
        data: { status: 'paused' },
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('audits a ticket_created event', async () => {
    const t = await createTicket('Cofounder int test — audit')
    const logs = await payload.find({
      collection: 'agent-logs',
      limit: 5,
      where: {
        and: [
          { event: { equals: 'ticket_created' } },
          { pageId: { equals: String(t.id) } },
        ],
      },
    })
    expect(logs.totalDocs).toBeGreaterThanOrEqual(1)
  })

  it('enqueues delegation jobs as QUEUED with cofounder source (spec §8 #8)', async () => {
    const t = await createTicket('Cofounder int test — delegation')
    const updated = (await payload.update({
      id: t.id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      data: {
        delegationQueue: [
          {
            jobId: 'job-g2-test-1',
            role: 'desk-researcher',
            brief: 'Desk research Stake.com: licensing, markets, support channels.',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })) as unknown as { delegationQueue: Array<{ jobId: string; role: string; source: string; status: string }> }
    expect(updated.delegationQueue).toHaveLength(1)
    expect(updated.delegationQueue[0]).toMatchObject({
      jobId: 'job-g2-test-1',
      role: 'desk-researcher',
      source: 'cofounder',
      status: 'QUEUED',
    })
  })

  it('links pinnedCases to research-queue cases', async () => {
    const caseFile = await payload.create({
      collection: 'research-queue',
      req: makeReq(),
      data: {
        // caseNumber must match #PS-YYYY-NNN (three digits) — random to avoid
        // unique collisions across test runs.
        caseNumber: `#PS-${new Date().getUTCFullYear()}-${100 + (Date.now() % 900)}`,
        operatorName: 'G2 Pin Test Casino',
        casinoType: 'traditional',
        status: 'queued',
      } as never,
    })

    const t = await createTicket('Cofounder int test — pinned')
    const updated = (await payload.update({
      id: t.id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      data: { pinnedCases: [caseFile.id] },
    })) as unknown as { pinnedCases: unknown[] }
    expect(updated.pinnedCases).toHaveLength(1)

    await payload.delete({ id: caseFile.id, collection: 'research-queue', req: makeReq() }).catch(() => {})
  })
})
