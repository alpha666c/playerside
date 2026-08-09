import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cofounderTools, executeCofounderTool, PIPELINE_AGENT_ROLES } from '@/lib/cofounder/tools'

/**
 * Phase G (G.5) — T7 `run_pipeline_agent` tool contract (spec §4 T7 / §7.4).
 * The desk researcher is hoisted-mocked so the tool's call to the real agent
 * can be asserted: it must be DRAFT-ONLY (never `apply`), audited, and mapped
 * to a compact summary the Cofounder can relay.
 */

const deskResearcherMock = vi.hoisted(() => vi.fn())

vi.mock('@/agents/deskResearcher', () => ({
  runDeskResearch: deskResearcherMock,
}))

const payloadStub = {
  findByID: vi.fn(),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  logger: { error: vi.fn() },
}
const req = { user: { email: 'test@example.invalid' } } as never

beforeAll(() => {
  payloadStub.findByID.mockResolvedValue({ id: 7 })
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('T7 run_pipeline_agent', () => {
  it('exposes the five pipeline roles', () => {
    expect(PIPELINE_AGENT_ROLES).toEqual([
      'desk-researcher',
      'score-analyst',
      'editorial-writer',
      'integrity-checker',
      'monitor',
    ])
  })

  it('spec test #5 — the tool surface contains no case-write/publish tool', () => {
    const names = cofounderTools.map((t) => t.function.name)
    expect(names).not.toContain('apply_draft')
    expect(names).not.toContain('publish')
    expect(names).not.toContain('update_case')
    expect(names).not.toContain('grant_xp')
    // run_pipeline_agent is draft-only by construction — assert its presence
    expect(names).toContain('run_pipeline_agent')
    // every exposed tool is handled by the dispatcher (no dead/unaudited tools)
    for (const name of names) {
      expect(['get_today_plan', 'set_plan_item', 'create_ticket', 'resume_ticket', 'close_ticket', 'run_pipeline_agent']).toContain(name)
    }
  })

  it('refuses to run an agent when the turn budget is nearly exhausted', async () => {
    const res = await executeCofounderTool(
      payloadStub as never,
      req,
      'run_pipeline_agent',
      { caseId: 7, role: 'desk-researcher' },
      { budgetRemainingMs: 5_000 },
    )
    expect(res.ok).toBe(false)
    expect(String(res.output)).toContain('budget')
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown role without calling any agent', async () => {
    const res = await executeCofounderTool(
      payloadStub as never,
      req,
      'run_pipeline_agent',
      { caseId: 7, role: 'writer' },
      {},
    )
    expect(res.ok).toBe(false)
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('rejects a missing case without calling any agent', async () => {
    payloadStub.findByID.mockResolvedValueOnce(null)
    const res = await executeCofounderTool(
      payloadStub as never,
      req,
      'run_pipeline_agent',
      { caseId: 999, role: 'desk-researcher' },
      {},
    )
    expect(res.ok).toBe(false)
    expect(deskResearcherMock).not.toHaveBeenCalled()
  })

  it('calls the real agent DRAFT-ONLY (no apply) and returns a mapped summary', async () => {
    deskResearcherMock.mockResolvedValue({
      runId: 'run-123',
      deskResearchOutput: {},
      evidenceRegister: [{ label: 'x' }],
    })
    const res = await executeCofounderTool(
      payloadStub as never,
      req,
      'run_pipeline_agent',
      { caseId: 7, role: 'desk-researcher' },
      {},
    )
    expect(res.ok).toBe(true)
    expect(deskResearcherMock).toHaveBeenCalledTimes(1)
    // (payload, req, caseId) — and NO 4th opts argument: apply is impossible here
    const callArgs = deskResearcherMock.mock.calls[0]
    expect(callArgs.slice(0, 3)).toEqual([payloadStub, req, 7])
    expect(callArgs).toHaveLength(3)

    const output = res.output as { runId: string; role: string; status: string; summary: string }
    expect(output.runId).toBe('run-123')
    expect(output.role).toBe('desk-researcher')
    expect(output.status).toBe('draft')
    expect(output.summary).toContain('1 evidence row')
    // the tool_call audit row was written
    expect(payloadStub.create).toHaveBeenCalled()
  })

})
