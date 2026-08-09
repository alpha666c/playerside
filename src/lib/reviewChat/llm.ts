import type { Payload, PayloadRequest } from 'payload'

import { logEvent } from '@/lib/logEvent'

/**
 * Phase G (G.1) — the shared LLM client (spec §1, §7.1).
 *
 * One OpenAI-compatible chat client used by the Cofounder AND the five
 * pipeline agents. Plain `fetch` to the configured provider (DeepSeek by
 * default) — deliberately no SDK dependency, matching the repo's existing
 * no-AI-dependency stance until a real reason appears.
 *
 * Guardrails (spec §7):
 * - `DEEPSEEK_API_KEY` required — a missing key throws a clear error, never
 *   silently falls back (a fake reply would poison the evidence discipline).
 * - Daily spend cap enforced before every call by counting today's
 *   `agent-logs` rows (event `llm_call`) — the log doubles as the counter,
 *   so the audit trail and the cap can't drift apart.
 * - Every call records one `agent-logs` row (metadata only — role, model,
 *   kind, usage — never message content, never PII).
 * - Per-role model override map: `LLM_MODEL_<ROLE>` env wins over
 *   `DEEPSEEK_MODEL` (spec §1 "per-role override map").
 */
export type LlmRole = 'system' | 'user' | 'assistant' | 'tool'

export interface LlmMessage {
  role: LlmRole
  content: string | null
  /** tool results carry the calling tool's id */
  toolCallId?: string
}

export interface LlmToolCall {
  id: string
  name: string
  arguments: string
}

export interface LlmToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface LlmOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: LlmToolDef[]
  /** role key for the per-role override map + the audit trail */
  agentRole?: string
}

export interface LlmResult {
  content: string | null
  toolCalls: LlmToolCall[]
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  /** agent-logs id of the llm_call event (audit linkage) */
  runId?: string
}

export class LlmConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmConfigurationError'
  }
}

export class LlmRateLimitError extends Error {
  used: number
  limit: number
  constructor(used: number, limit: number) {
    super(
      `Daily LLM call cap reached (${used}/${limit}) — resume tomorrow or raise LLM_SPEND_CAP_PER_DAY.`,
    )
    this.name = 'LlmRateLimitError'
    this.used = used
    this.limit = limit
  }
}

export class LlmApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(`LLM provider error ${status}: ${message}`)
    this.name = 'LlmApiError'
    this.status = status
  }
}

export interface LlmConfig {
  apiKey: string | null
  baseUrl: string
  model: string
  maxTokens: number
  dailyCap: number
}

export const getLlmConfig = (): LlmConfig => ({
  apiKey: process.env.DEEPSEEK_API_KEY?.trim() || null,
  baseUrl: (process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com').replace(/\/+$/, ''),
  model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash',
  maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 4000),
  dailyCap: Number(process.env.LLM_SPEND_CAP_PER_DAY ?? 1000),
})

export const isLlmConfigured = (): boolean => getLlmConfig().apiKey !== null

/** Per-role override map: LLM_MODEL_<ROLE_UPPER_SNAKE> env wins over DEEPSEEK_MODEL. */
export const resolveModel = (role?: string): string => {
  if (role) {
    const key = `LLM_MODEL_${role.toUpperCase().replace(/-/g, '_')}`
    const override = process.env[key]?.trim()
    if (override) return override
  }
  return getLlmConfig().model
}

/**
 * Default sampling temperature. Low on purpose (reviewer S3): pipeline
 * agents apply the locked rubric and the Cofounder follows strict rules —
 * creative defaults (1.0) produce drift. Callers may override per call.
 */
export const DEFAULT_TEMPERATURE = 0.3

const todayStartIso = (): string => {
  const now = new Date()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  return start.toISOString()
}

export interface CapStatus {
  used: number
  limit: number
  remaining: number
}

/**
 * Daily spend cap (spec §7.1). Counts today's `llm_call` rows in agent-logs;
 * the log IS the counter. Cap <= 0 disables the cap.
 *
 * Best-effort soft cap, not atomic (reviewer S2): the count happens before
 * the call and the audit row is written after, so concurrent requests can
 * overshoot by the concurrency factor — acceptable for the single-admin
 * surface; document if a hard gate is ever needed.
 */
export const checkDailyCap = async (
  payload: Payload,
  req: PayloadRequest,
  config: LlmConfig = getLlmConfig(),
): Promise<CapStatus> => {
  if (config.dailyCap <= 0) return { used: 0, limit: 0, remaining: Number.POSITIVE_INFINITY }
  const result = await payload.count({
    collection: 'agent-logs',
    req,
    where: {
      event: { equals: 'llm_call' },
      timestamp: { greater_than_equal: todayStartIso() },
    },
  })
  const used = result.totalDocs
  if (used >= config.dailyCap) throw new LlmRateLimitError(used, config.dailyCap)
  return { used, limit: config.dailyCap, remaining: config.dailyCap - used }
}

const recordLlmCall = async (
  payload: Payload,
  req: PayloadRequest,
  input: {
    agentRole?: string
    model: string
    kind: 'chat' | 'stream'
    promptTokens?: number
    completionTokens?: number
  },
): Promise<string> => {
  const event = await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'llm_call',
      details: {
        role: input.agentRole ?? 'cofounder',
        model: input.model,
        kind: input.kind,
        promptTokens: input.promptTokens ?? null,
        completionTokens: input.completionTokens ?? null,
      },
    },
    req,
  )
  return String(event.id ?? '')
}

const buildBody = (
  messages: LlmMessage[],
  opts: LlmOptions,
  config: LlmConfig,
  stream: boolean,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    model: opts.model ?? resolveModel(opts.agentRole),
    messages,
    max_tokens: opts.maxTokens ?? config.maxTokens,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : DEFAULT_TEMPERATURE,
    stream,
  }
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools
    body.tool_choice = 'auto'
  }
  return body
}

const authHeaders = (config: LlmConfig): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${config.apiKey}`,
})

/**
 * Non-streaming chat completion. Returns content + parsed tool calls.
 * Records one llm_call audit row on success (runId links to it).
 */
export const chatLlm = async (
  payload: Payload,
  req: PayloadRequest,
  messages: LlmMessage[],
  opts: LlmOptions = {},
): Promise<LlmResult> => {
  const config = getLlmConfig()
  if (!config.apiKey) {
    throw new LlmConfigurationError(
      'DEEPSEEK_API_KEY is not configured — add it to the environment to use the Cofounder or pipeline agents.',
    )
  }
  await checkDailyCap(payload, req, config)

  const model = opts.model ?? resolveModel(opts.agentRole)
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify(buildBody(messages, { ...opts, model }, config, false)),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new LlmApiError(res.status, text.slice(0, 300))
  }
  const data = (await res.json()) as Record<string, unknown>
  const choices = data.choices as Array<{ message?: { content?: string | null; tool_calls?: unknown } }> | undefined
  const choice = choices?.[0]
  const usage = data.usage as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined

  const toolCalls: LlmToolCall[] = Array.isArray(choice?.message?.tool_calls)
    ? (choice.message.tool_calls as Array<{
        id?: string
        function?: { name?: string; arguments?: string }
      }>).map((tc) => ({
        id: String(tc.id ?? ''),
        name: String(tc.function?.name ?? ''),
        arguments: String(tc.function?.arguments ?? '{}'),
      }))
    : []

  const runId = await recordLlmCall(payload, req, {
    agentRole: opts.agentRole,
    model,
    kind: 'chat',
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  }).catch((err: unknown) => {
    // Reviewer S2: never fully silent — a dropped audit row is an uncounted
    // call (the log IS the cap counter). Log it, don't fail the reply.
    payload.logger.error({ err, message: 'llm_call audit write failed — call was not counted' })
    return ''
  })

  return {
    content:
      typeof choice?.message?.content === 'string' && choice.message.content.length > 0
        ? choice.message.content
        : null,
    toolCalls,
    model: typeof data.model === 'string' ? data.model : model,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
        }
      : null,
    runId: runId || undefined,
  }
}

/**
 * Streaming chat completion (SSE from the provider). Re-emits delta text as
 * `data: {"delta":"..."}\n\n` and terminates with `data: {"done":true}\n\n` —
 * a stable client contract for the admin chat UI regardless of provider.
 */
export const streamLlm = async (
  payload: Payload,
  req: PayloadRequest,
  messages: LlmMessage[],
  opts: LlmOptions = {},
): Promise<ReadableStream<Uint8Array>> => {
  const config = getLlmConfig()
  if (!config.apiKey) {
    throw new LlmConfigurationError(
      'DEEPSEEK_API_KEY is not configured — add it to the environment to use the Cofounder or pipeline agents.',
    )
  }
  await checkDailyCap(payload, req, config)

  const model = opts.model ?? resolveModel(opts.agentRole)
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify(buildBody(messages, { ...opts, model }, config, true)),
    signal: AbortSignal.timeout(170_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new LlmApiError(res.status, text.slice(0, 300))
  }
  if (!res.body) throw new LlmApiError(500, 'LLM provider returned no stream body')
  // 170s provider timeout leaves headroom under the route's 190s wall-clock
  // budget (spec §3.1, QA S1-3) so the route cap, not the provider timeout,
  // is the outer bound.

  void recordLlmCall(payload, req, { agentRole: opts.agentRole, model, kind: 'stream' }).catch(
    (err: unknown) => {
      // Reviewer S2: never fully silent — a dropped audit row is an uncounted call.
      payload.logger.error({ err, message: 'llm_call audit write failed (stream) — call was not counted' })
    },
  )

  const provider = res.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payloadLine: unknown): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payloadLine)}\n\n`))
      }
      let buffer = ''
      try {
        for (;;) {
          const { done, value } = await provider.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const payloadStr = line.slice(5).trim()
            if (payloadStr === '[DONE]') continue
            try {
              const sse = JSON.parse(payloadStr) as {
                choices?: Array<{ delta?: { content?: unknown } }>
              }
              const delta = sse.choices?.[0]?.delta?.content
              if (typeof delta === 'string' && delta.length > 0) emit({ delta })
            } catch {
              continue
            }
          }
        }
        emit({ done: true })
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

export interface HealthResult {
  ok: boolean
  keyConfigured: boolean
  resolvedModel: string
  baseUrl: string
  message: string
  latencyMs?: number
}

/**
 * Model-id self-check (spec §1, QA S0-1). Never throws for configuration —
 * the admin UI renders a helpful state instead. With a key, fires one tiny
 * call to verify the configured model id is actually served by the endpoint.
 *
 * Health pings are deliberately NOT counted against the daily cap and write
 * no audit row (reviewer S3) — admin-only and cheap; a monitor polling this
 * endpoint bypasses the cap by design.
 */
export const healthCheck = async (
  payload: Payload,
  req: PayloadRequest,
): Promise<HealthResult> => {
  const config = getLlmConfig()
  if (!config.apiKey) {
    return {
      ok: false,
      keyConfigured: false,
      resolvedModel: config.model,
      baseUrl: config.baseUrl,
      message:
        'DEEPSEEK_API_KEY is not set — add it (Vercel env or .env.local) to verify the model id.',
    }
  }
  const startedAt = Date.now()
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        keyConfigured: true,
        resolvedModel: config.model,
        baseUrl: config.baseUrl,
        message: `Provider rejected the check (${res.status}): ${text.slice(0, 200)}`,
      }
    }
    const data = (await res.json().catch(() => null)) as { model?: string } | null
    return {
      ok: true,
      keyConfigured: true,
      resolvedModel: data?.model ?? config.model,
      baseUrl: config.baseUrl,
      message: 'LLM client reachable — model id resolved.',
      latencyMs: Date.now() - startedAt,
    }
  } catch (err) {
    return {
      ok: false,
      keyConfigured: true,
      resolvedModel: config.model,
      baseUrl: config.baseUrl,
      message: err instanceof Error ? err.message : 'Unknown health-check failure',
    }
  }
}
