import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  LlmApiError,
  LlmConfigurationError,
  LlmRateLimitError,
  chatLlm,
  getLlmConfig,
  healthCheck,
  isLlmConfigured,
  resolveModel,
  streamLlm,
} from '@/lib/reviewChat/llm'
import { resetSystemSettingsCache } from '@/lib/reviewChat/settings'

/**
 * Phase G (G.1) — shared LLM client tests (spec §8, tests 2/3/12).
 *
 * All model/network interactions are mocked — no live key, no network, no DB
 * (the payload instance is stubbed). Locks: daily-cap 429, no-key failure,
 * per-role model resolution, tool-call parsing, provider errors, and the
 * stream contract (`data: {"delta":...}` → `data: {"done":true}`).
 */

beforeAll(async () => {
  // jsdom does not ship ReadableStream; use Node's spec-compliant one so the
  // module's stream usage is exercisable in this environment. Awaited so the
  // polyfill is in place before any test constructs a stream.
  if (typeof globalThis.ReadableStream === 'undefined') {
    const { ReadableStream } = await import('node:stream/web')
    globalThis.ReadableStream = ReadableStream as typeof globalThis.ReadableStream
  }
})

const stubPayload = (overrides: Record<string, unknown> = {}) => {
  const p: Record<string, unknown> = {
    count: vi.fn().mockResolvedValue({ totalDocs: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    // no admin System Settings saved by default -> env vars + defaults apply
    findGlobal: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
  return p
}

const stubReq = () => ({ user: { email: 'tester@playerside.test' } })

const sseBody = (lines: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n\n`))
      controller.close()
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  // the settings getter caches for 15s — drop it so findGlobal stubs are fresh
  resetSystemSettingsCache()
})

describe('llm config', () => {
  it('reads env with documented defaults', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    vi.stubEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/')
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-v4-flash')
    const c = await getLlmConfig(stubPayload() as never, stubReq() as never)
    expect(c.apiKey).toBe('sk-test')
    expect(c.keySource).toBe('env')
    expect(c.baseUrl).toBe('https://api.deepseek.com') // trailing slash stripped
    expect(c.model).toBe('deepseek-v4-flash')
    expect(c.maxTokens).toBe(4000)
    expect(c.dailyCap).toBe(1000)
    expect(await isLlmConfigured(stubPayload() as never, stubReq() as never)).toBe(true)
  })

  it('falls back to the admin System Settings when no env key exists', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    vi.stubEnv('DEEPSEEK_MODEL', '')
    const payload = stubPayload({
      findGlobal: vi.fn().mockResolvedValue({
        llmDeepSeekApiKey: 'db-key',
        llmModel: 'db-model',
        llmSpendCapPerDay: 25,
      }),
    })
    const c = await getLlmConfig(payload as never, stubReq() as never)
    expect(c.apiKey).toBe('db-key')
    expect(c.keySource).toBe('database')
    expect(c.model).toBe('db-model')
    expect(c.dailyCap).toBe(25)
  })

  it('env wins over the admin System Settings', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'env-key')
    vi.stubEnv('DEEPSEEK_MODEL', 'env-model')
    const payload = stubPayload({
      findGlobal: vi.fn().mockResolvedValue({
        llmDeepSeekApiKey: 'db-key',
        llmModel: 'db-model',
      }),
    })
    const c = await getLlmConfig(payload as never, stubReq() as never)
    expect(c.apiKey).toBe('env-key')
    expect(c.keySource).toBe('env')
    expect(c.model).toBe('env-model')
  })

  it('is not configured without a key', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    expect(await isLlmConfigured(stubPayload() as never, stubReq() as never)).toBe(false)
  })

  it('resolves per-role model overrides before the default', async () => {
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-v4-flash')
    vi.stubEnv('LLM_MODEL_DESK_RESEARCHER', 'deepseek-chat')
    const req = stubReq() as never
    expect(await resolveModel(stubPayload() as never, req, 'desk-researcher')).toBe('deepseek-chat')
    expect(await resolveModel(stubPayload() as never, req, 'cofounder')).toBe('deepseek-v4-flash')
    expect(await resolveModel(stubPayload() as never, req)).toBe('deepseek-v4-flash')
  })
})

describe('chatLlm', () => {
  it('throws a clear configuration error when no key is set', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    await expect(chatLlm(stubPayload() as never, stubReq() as never, [{ role: 'user', content: 'hi' }])).rejects.toThrow(
      LlmConfigurationError,
    )
  })

  it('returns content + parsed tool calls and audits the call', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-v4-flash')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl-1',
          model: 'deepseek-v4-flash',
          choices: [
            {
              message: {
                content: 'Hello there',
                tool_calls: [
                  { id: 'call-1', function: { name: 'get_today_plan', arguments: '{}' } },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const payload = stubPayload()

    const result = await chatLlm(payload as never, stubReq() as never, [
      { role: 'user', content: 'plan today' },
    ])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body.model).toBe('deepseek-v4-flash')
    expect(body.stream).toBe(false)
    expect(result.content).toBe('Hello there')
    expect(result.toolCalls).toEqual([{ id: 'call-1', name: 'get_today_plan', arguments: '{}' }])
    expect(result.usage?.totalTokens).toBe(17)
    // audit row written + runId linked
    expect(result.runId).toBe('log-1')
    expect((payload.create as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      collection: 'agent-logs',
    })
  })

  it('enforces the daily cap before calling the provider (429 semantics)', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    vi.stubEnv('LLM_SPEND_CAP_PER_DAY', '3')
    const payload = stubPayload({ count: vi.fn().mockResolvedValue({ totalDocs: 3 }) })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(chatLlm(payload as never, stubReq() as never, [{ role: 'user', content: 'hi' }])).rejects.toThrow(
      LlmRateLimitError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces provider HTTP errors with status', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 })),
    )
    await expect(chatLlm(stubPayload() as never, stubReq() as never, [{ role: 'user', content: 'hi' }])).rejects.toMatchObject(
      { name: 'LlmApiError', status: 401 },
    )
  })
})

describe('healthCheck', () => {
  it('reports key-missing state without throwing', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    const r = await healthCheck(stubPayload() as never, stubReq() as never)
    expect(r.ok).toBe(false)
    expect(r.keyConfigured).toBe(false)
    expect(r.keySource).toBe('none')
    expect(r.resolvedModel).toBe('deepseek-v4-flash')
  })

  it('verifies the model id with a tiny call when a key is present', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ model: 'deepseek-v4-flash' }), { status: 200 }),
      ),
    )
    const r = await healthCheck(stubPayload() as never, stubReq() as never)
    expect(r.ok).toBe(true)
    expect(r.keyConfigured).toBe(true)
    expect(r.resolvedModel).toBe('deepseek-v4-flash')
    expect(typeof r.latencyMs).toBe('number')
  })
})

describe('streamLlm', () => {
  it('emits delta text events and a done event', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
    const payload = stubPayload()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          sseBody([
            'data: {"choices":[{"delta":{"content":"Hel"}}]}',
            'data: {"choices":[{"delta":{"content":"lo"}}]}',
            'data: {"choices":[{"delta":{"role":"assistant"}}]}',
            'data: [DONE]',
          ]),
          { status: 200 },
        ),
      ),
    )

    const stream = await streamLlm(payload as never, stubReq() as never, [
      { role: 'user', content: 'stream please' },
    ])
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let out = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
    }
    expect(out).toContain('data: {"delta":"Hel"}')
    expect(out).toContain('data: {"delta":"lo"}')
    expect(out).toContain('data: {"done":true}')
    expect(out).not.toContain('[DONE]')
    // stream also audits a row
    expect(payload.create).toHaveBeenCalled()
  })

  it('rejects without a key before opening a stream', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    await expect(
      streamLlm(stubPayload() as never, stubReq() as never, [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow(LlmConfigurationError)
  })
})
