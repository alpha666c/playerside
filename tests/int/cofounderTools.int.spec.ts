import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildCofounderPrompt,
  checkBannedPhrases,
} from '@/lib/cofounder/promptBundle'
import { executeCofounderTool } from '@/lib/cofounder/tools'

/**
 * Phase G (G.3) — Cofounder tool layer + prompt bundle tests (spec §8). The
 * chat route itself is exercised against the running server (gates + manual
 * smoke); here we test the server-side pieces the route composes: the
 * allowlisted tool dispatcher (create/resume/close/plan), the prompt bundle's
 * shape + thread trimming, and the banned-phrase output gate (§6.1).
 */

let payload: Payload
let reqUser: { id: number; email: string }
/** Fresh req per call — Payload merges `context` INTO req.context (test isolation). */
const makeReq = () => ({ user: { id: reqUser.id, email: reqUser.email } }) as never
const createdTicketIds: number[] = []
const TEST_EMAIL = 'cofounder-tools-test@example.invalid'

beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })

  const staleUsers = await payload.find({
    collection: 'users',
    limit: 50,
    where: { email: { equals: TEST_EMAIL } },
  })
  for (const u of staleUsers.docs) await payload.delete({ id: u.id, collection: 'users' })
  const staleTickets = await payload.find({
    collection: 'cofounder-sessions',
    limit: 50,
    where: { title: { like: '%Cofounder tool test%' } },
  })
  for (const t of staleTickets.docs) await payload.delete({ id: t.id, collection: 'cofounder-sessions' })

  const user = await payload.create({
    collection: 'users',
    data: { email: TEST_EMAIL, password: 'cofounder-tools-test-password-1', name: 'Cofounder Tools Test' },
  })
  reqUser = { id: user.id, email: TEST_EMAIL }
})

const createTicketViaTool = async (title: string) => {
  const res = await executeCofounderTool(
    payload,
    makeReq() as never,
    'create_ticket',
    { title, sessionType: 'review-run' },
    {},
  )
  expect(res.ok).toBe(true)
  const out = res.output as { ticketNumber: string; id: number }
  createdTicketIds.push(out.id)
  return out
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

describe('Cofounder tools (spec §4 — ticket-scoped set)', () => {
  it('create_ticket returns a #CF number', async () => {
    const { ticketNumber } = await createTicketViaTool('Cofounder tool test — create')
    expect(ticketNumber).toMatch(/^#CF-\d{6}-\d{2,}$/)
  })

  it('create_ticket requires a title', async () => {
    const res = await executeCofounderTool(payload, makeReq() as never, 'create_ticket', {}, {})
    expect(res.ok).toBe(false)
  })

  it('set_plan_item appends to the current ticket (guarded write bumps version)', async () => {
    const { id } = await createTicketViaTool('Cofounder tool test — plan append')
    const before = await payload.findByID({
      collection: 'cofounder-sessions',
      id,
      req: makeReq(),
      depth: 0,
    })

    const res = await executeCofounderTool(
      payload,
      makeReq() as never,
      'set_plan_item',
      { kind: 'casino-review', target: 'Stake.com', status: 'todo' },
      { ticketId: id },
    )
    expect(res.ok).toBe(true)

    const after = await payload.findByID({
      collection: 'cofounder-sessions',
      id,
      req: makeReq(),
      depth: 0,
    })
    const plan = after.plan as Array<{ kind: string; target: string }>
    expect(plan).toHaveLength(1)
    expect(plan[0]).toMatchObject({ kind: 'casino-review', target: 'Stake.com' })
    // guarded write -> version advanced (the tool reads fresh + passes expectedVersion)
    expect(Number(after.version)).toBeGreaterThan(Number(before.version))
  })

  it('set_plan_item fails cleanly without a ticketId', async () => {
    const res = await executeCofounderTool(
      payload,
      makeReq() as never,
      'set_plan_item',
      { kind: 'ops' },
      {},
    )
    expect(res.ok).toBe(false)
  })

  it('resume_ticket by number marks it active and returns plan', async () => {
    const { id, ticketNumber } = await createTicketViaTool('Cofounder tool test — resume')
    await payload.update({
      id,
      collection: 'cofounder-sessions',
      req: makeReq(),
      data: { status: 'paused' },
    })
    const res = await executeCofounderTool(
      payload,
      makeReq() as never,
      'resume_ticket',
      { ticketNumber },
      {},
    )
    expect(res.ok).toBe(true)
    const out = res.output as { status: string; ticketNumber: string }
    expect(out.status).toBe('active')
    expect(out.ticketNumber).toBe(ticketNumber)
  })

  it('close_ticket refuses with open plan items unless confirm:true', async () => {
    const { id } = await createTicketViaTool('Cofounder tool test — close')
    await executeCofounderTool(
      payload,
      makeReq() as never,
      'set_plan_item',
      { kind: 'casino-review', target: 'Unfinished Casino' },
      { ticketId: id },
    )

    const refused = await executeCofounderTool(
      payload,
      makeReq() as never,
      'close_ticket',
      {},
      { ticketId: id },
    )
    expect(refused.ok).toBe(false)

    const closed = await executeCofounderTool(
      payload,
      makeReq() as never,
      'close_ticket',
      { confirm: true },
      { ticketId: id },
    )
    expect(closed.ok).toBe(true)
    expect((closed.output as { status: string }).status).toBe('done')
  })

  it('get_today_plan returns today tickets with plan items', async () => {
    await createTicketViaTool('Cofounder tool test — today plan')
    const res = await executeCofounderTool(payload, makeReq() as never, 'get_today_plan', {}, {})
    expect(res.ok).toBe(true)
    const out = res.output as { tickets: number; plan: unknown[] }
    expect(out.tickets).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(out.plan)).toBe(true)
  })

  it('audits a tool_call event per invocation', async () => {
    await executeCofounderTool(payload, makeReq() as never, 'get_today_plan', {}, {})
    const logs = await payload.find({
      collection: 'agent-logs',
      limit: 5,
      where: { event: { equals: 'tool_call' } },
    })
    expect(logs.totalDocs).toBeGreaterThanOrEqual(1)
  })
})

describe('Cofounder prompt bundle (spec §6)', () => {
  it('builds a system prompt with the locked rules + session state', () => {
    const messages = buildCofounderPrompt({
      userMessage: 'Today we review 5 casinos.',
      ticket: { ticketNumber: '#CF-260809-01', status: 'active', sessionType: 'review-run', plan: [], pinnedCases: [] },
    })
    expect(messages[0].role).toBe('system')
    const system = String(messages[0].content ?? '')
    expect(system).toContain('#CF-260809-01')
    expect(system).toContain('Pipeline: every case moves')
    expect(system).toContain('untrusted_data')
    expect(messages[messages.length - 1]).toMatchObject({
      role: 'user',
      content: 'Today we review 5 casinos.',
    })
  })

  it('trims the thread from the front to the budget', () => {
    // Thread budget is (PROMPT_BUDGET_TOKENS − 6_000) × 4 chars ≈ 24_000
    // chars. Two ~14k-char turns exceed it, so the oldest turns must drop.
    const longTurn = { role: 'user', content: 'x'.repeat(14_000) }
    const thread = [
      { role: 'user', content: 'OLDEST — must be trimmed' },
      longTurn,
      longTurn,
      { role: 'assistant', content: 'newest' },
    ]
    const messages = buildCofounderPrompt({ userMessage: 'hi', thread, ticket: null })
    const kept = messages.slice(1, -1)
    expect(kept.some((m) => String(m.content).includes('OLDEST'))).toBe(false)
    expect(kept[kept.length - 1]?.content).toBe('newest')
    expect(kept.length).toBe(2) // the two oldest long turns were trimmed
  })
})

describe('Output gate (spec §6.1)', () => {
  it('flags banned phrases', () => {
    expect(checkBannedPhrases('This has a guaranteed win claim and no risk at all.')).toEqual(
      expect.arrayContaining(['guaranteed win', 'no risk']),
    )
  })

  it('passes clean copy', () => {
    expect(checkBannedPhrases('Compare terms, check the wagering, and set a deposit limit.')).toEqual([])
  })
})
