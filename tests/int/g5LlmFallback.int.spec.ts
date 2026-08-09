import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Phase G (G.5) — reviewer S3: the agent fallback path. When the model replies
 * with non-JSON (or a call throws), runAgentLlm must report `fallback: true`
 * and a null `parsed` so the agents can complete with the deterministic
 * skeleton instead of crashing or fabricating. chatLlm is mocked; the other
 * bridge pieces run for real.
 */

const chatLlmMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/reviewChat/llm', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, chatLlm: chatLlmMock }
})

const payloadStub = { logger: { warn: vi.fn(), error: vi.fn() } }
const req = { user: { email: 'test@example.invalid' } } as never

beforeAll(async () => {
  // ensure the bridge module picks up the mock (fresh import after hoist)
  vi.resetModules()
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('runAgentLlm fallback path', () => {
  it('reports fallback=true when the model returns non-JSON prose', async () => {
    vi.resetModules()
    chatLlmMock.mockResolvedValue({
      content: 'I cannot produce JSON right now.',
      toolCalls: [],
      model: 'mock/deepseek-v4-flash',
      usage: null,
    })
    const { runAgentLlm } = await import('@/agents/llmBridge')
    const res = await runAgentLlm(payloadStub as never, req, {
      agentRole: 'desk-researcher',
      roleFile: '# role file',
      context: { operatorName: 'Stake' },
      task: 'Return JSON.',
    })
    expect(res.parsed).toBeNull()
    expect(res.fallback).toBe(true)
  })

  it('returns parsed JSON when the model complies', async () => {
    vi.resetModules()
    chatLlmMock.mockResolvedValue({
      content: '```json\n{"licensing": {"primary": {"value": "X"}}}\n```',
      toolCalls: [],
      model: 'mock/deepseek-v4-flash',
      usage: null,
    })
    const { runAgentLlm } = await import('@/agents/llmBridge')
    const res = await runAgentLlm(payloadStub as never, req, {
      agentRole: 'desk-researcher',
      roleFile: '# role file',
      context: { operatorName: 'Stake' },
      task: 'Return JSON.',
    })
    expect(res.parsed).toEqual({ licensing: { primary: { value: 'X' } } })
    expect(res.fallback).toBe(false)
  })
})
