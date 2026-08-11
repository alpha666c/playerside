import type { Payload, PayloadRequest } from 'payload'

import { logEvent } from '@/lib/logEvent'
import { getSystemSettings } from '@/lib/reviewChat/settings'

/**
 * Phase I2 — read-only client for the self-hosted OpenSEO instance
 * (every-app/open-seo, MIT, https://openseo.so). OpenSEO exposes an MCP
 * server over HTTP (`POST {url}/mcp`, streamable JSON-RPC) — the documented
 * "connect with any agent" surface — backed by BYOK DataForSEO.
 *
 * Hard limits (spec I2.3 / reviewer S1+S2):
 * - READ-ONLY: only the three read tools are ever called
 *   (research_keywords / get_ranked_keywords / get_audit_issues) — never the
 *   write tools (create_project, save_keywords, add_rank_tracking_keywords…).
 * - DataForSEO bills PER ROW, not per call → the daily budget is a ROW budget
 *   (`seoRowCapPerDay`, default 500, counted via `seo_call` audit rows — the
 *   log IS the counter, mirroring llm.ts checkDailyCap), a per-turn cap of 3
 *   lookups lives in ToolContext.seoCallsUsed, and every call passes
 *   `limit ≤ 50` so a single response can never blow the budget.
 * - Untrusted web data: results are HTML-stripped, character-capped, and the
 *   caller wraps them with wrapUntrustedData before the model ever sees them.
 * - The model's tool args can never supply an arbitrary URL — base URL /
 *   project / key come from settings only (env-over-DB, see settings.ts).
 */

export type SeoMetric = 'keyword-volume' | 'rank' | 'audit'

/** Read-only OpenSEO MCP tool names per seo_lookup metric (spec I2.3). */
export const SEO_MCP_TOOL_BY_METRIC: Record<SeoMetric, string> = {
  'keyword-volume': 'research_keywords',
  rank: 'get_ranked_keywords',
  audit: 'get_audit_issues',
}

export const MAX_LOOKUPS_PER_TURN = 3
export const MAX_QUERY_CHARS = 120
export const MAX_LIMIT_ARG = 50
export const MAX_RESPONSE_CHARS = 8_000
export const DEFAULT_ROW_CAP_PER_DAY = 500
export const MCP_TIMEOUT_MS = 15_000

/** Thrown when the instance is unreachable / misconfigured (graceful path). */
export class OpenSeoUnavailableError extends Error {}

export interface OpenSeoConfig {
  /** Base URL of the self-hosted OpenSEO instance, e.g. http://10.0.0.5:3100 */
  url: string | null
  /** OpenSEO project id (research_keywords / get_ranked_keywords are project-scoped). */
  projectId: string | null
  /** DataForSEO BYOK key — base64 "email:password" (https://app.dataforseo.com/api-access). */
  dataForSeoKey: string | null
  /** Daily billable-row budget; 0 disables. */
  rowCapPerDay: number
}

/**
 * Env-over-DB resolution (same precedence as llm.ts getLlmConfig): an
 * explicit environment variable wins over the DB value from SystemSettings,
 * so CI/bootstrap can override without the admin, and local dev runs before
 * anything is saved. Secrets never leave the server.
 */
export const getOpenSeoConfig = async (
  payload: Payload,
  req: PayloadRequest,
): Promise<OpenSeoConfig> => {
  const db = await getSystemSettings(payload, req)
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const num = (v: unknown, fallback: number): number => {
    // null/undefined/'' mean "not configured" → fallback. Number(null) is 0,
    // which would silently DISABLE the cap — so null must be caught first.
    if (v === null || v === undefined || v === '') return fallback
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    url: str(process.env.OPENSEO_URL ?? db.openSeoUrl) || null,
    projectId: str(process.env.OPENSEO_PROJECT_ID ?? db.openSeoProjectId) || null,
    dataForSeoKey: str(process.env.DATAFORSEO_API_KEY ?? db.dataForSeoApiKey) || null,
    rowCapPerDay: num(
      process.env.SEO_ROW_CAP_PER_DAY ?? db.seoRowCapPerDay,
      DEFAULT_ROW_CAP_PER_DAY,
    ),
  }
}

/**
 * Strip HTML/markup from untrusted SERP content + character cap. Runs BEFORE
 * wrapUntrustedData so injected markup can't smuggle instructions through
 * formatting (reviewer S1 — hostile-SERP containment).
 */
export const sanitizeSeoText = (text: string): string => {
  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, MAX_RESPONSE_CHARS)
}

const todayStartIso = (): string => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/**
 * Daily ROW budget (spec I2.3 — DataForSEO bills per row). Sums `rows` from
 * today's `seo_call` audit events; the log IS the counter (same pattern as
 * llm.ts checkDailyCap — best-effort soft cap, not atomic; fine for the
 * single-admin surface). Cap <= 0 disables.
 */
export const checkSeoDailyCap = async (
  payload: Payload,
  req: PayloadRequest,
  rowCapPerDay: number,
): Promise<void> => {
  if (rowCapPerDay <= 0) return
  const since = todayStartIso()
  let usedRows = 0
  let cursor = 0
  const PAGE = 500
  while (true) {
    const page = await payload.find({
      collection: 'agent-logs',
      req,
      depth: 0,
      limit: PAGE,
      page: cursor + 1,
      sort: 'timestamp',
      where: {
        and: [
          { event: { equals: 'seo_call' } },
          { timestamp: { greater_than_equal: since } },
        ],
      },
    })
    for (const row of page.docs) {
      const details = (row.details ?? {}) as { rows?: unknown }
      usedRows += Number(details.rows ?? 1)
    }
    if (page.hasNextPage) {
      cursor = page.page ?? cursor
      continue
    }
    break
  }
  if (usedRows >= rowCapPerDay) {
    throw new Error(
      `seo_lookup: daily DataForSEO row budget reached (${usedRows}/${rowCapPerDay} rows today) — resets at UTC midnight. Set seoRowCapPerDay in System Settings to raise it (0 disables).`,
    )
  }
}

/** Record a spend row (the counter checkSeoDailyCap reads). Never contains result content. */
export const recordSeoCall = async (
  payload: Payload,
  req: PayloadRequest,
  input: { metric: SeoMetric; query: string; rows: number },
): Promise<void> => {
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'seo_call',
      details: { metric: input.metric, query: input.query.slice(0, 100), rows: input.rows },
    },
    req,
  )
}

// --- MCP transport (streamable HTTP over JSON-RPC 2.0) ----------------------

interface McpRpc {
  jsonrpc: '2.0'
  id?: number
  method?: string
  params?: Record<string, unknown>
  result?: {
    content?: Array<{ type?: string; text?: string }>
    isError?: boolean
    /** MCP streamable-HTTP handshake may carry the session id here. */
    _meta?: Record<string, unknown>
  }
  error?: { code?: number; message?: string }
}

const mcpPost = async (
  url: string,
  body: McpRpc,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'timed out' : err instanceof Error ? err.message : String(err)
    throw new OpenSeoUnavailableError(`OpenSEO instance unreachable at ${url} (${reason}).`)
  } finally {
    clearTimeout(timer)
  }
}

/** Parse a JSON-RPC response that may be plain JSON or MCP SSE (data: lines). */
const parseMcpBody = async (res: Response): Promise<McpRpc[]> => {
  const text = await res.text()
  if (res.headers.get('content-type')?.includes('text/event-stream') || text.includes('data:')) {
    return text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => {
        try {
          return JSON.parse(l.slice(5).trim()) as McpRpc
        } catch {
          return null
        }
      })
      .filter((m): m is McpRpc => m !== null)
  }
  try {
    return [JSON.parse(text) as McpRpc]
  } catch {
    throw new OpenSeoUnavailableError(`OpenSEO returned a non-JSON response (HTTP ${res.status}).`)
  }
}

const toolArgsFor = (metric: SeoMetric, projectId: string, query: string): Record<string, unknown> => {
  switch (metric) {
    case 'keyword-volume':
      // research_keywords: { projectId, seeds: [{ seed }] } — 1 seed, no clickstream
      return { projectId, seeds: [{ seed: query }] }
    case 'rank':
      // get_ranked_keywords: { projectId, target (domain/page), limit }
      return { projectId, target: query, limit: MAX_LIMIT_ARG }
    case 'audit':
      // get_audit_issues: { projectId, limit } — auditId omitted = most recent
      return { projectId, limit: MAX_LIMIT_ARG }
  }
}

/**
 * One read-only MCP tools/call against `{baseUrl}/mcp`. Returns the
 * concatenated text content of the tool result (already sanitized).
 */
export const callOpenSeoMcp = async (
  baseUrl: string,
  metric: SeoMetric,
  projectId: string,
  query: string,
): Promise<string> => {
  const base = baseUrl.replace(/\/+$/, '')
  const mcpUrl = `${base}/mcp`
  const headers: Record<string, string> = { Accept: 'application/json, text/event-stream' }

  // 1. initialize (streamable HTTP handshake; may return an mcp-session-id)
  const initRes = await mcpPost(
    mcpUrl,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'playerside-seo', version: '1.0.0' },
      },
    },
    headers,
    MCP_TIMEOUT_MS,
  )
  if (!initRes.ok && initRes.status !== 404) {
    throw new OpenSeoUnavailableError(`OpenSEO initialize failed (HTTP ${initRes.status}).`)
  }
  const sessionId = initRes.headers.get('mcp-session-id') ?? undefined
  if (sessionId) headers['mcp-session-id'] = sessionId
  const initBodies = initRes.ok ? await parseMcpBody(initRes).catch(() => []) : []
  // session id sometimes rides in result._meta instead of the header
  const metaSession = initBodies[0]?.result?._meta as { sessionId?: string } | undefined
  if (!sessionId && metaSession?.sessionId) headers['mcp-session-id'] = metaSession.sessionId

  // 2. notifications/initialized (fire-and-forget — no response expected)
  await mcpPost(
    mcpUrl,
    { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
    headers,
    5_000,
  ).catch(() => undefined)

  // 3. tools/call (read-only tool only)
  const toolRes = await mcpPost(
    mcpUrl,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: SEO_MCP_TOOL_BY_METRIC[metric], arguments: toolArgsFor(metric, projectId, query) },
    },
    headers,
    MCP_TIMEOUT_MS,
  )
  if (!toolRes.ok) {
    throw new OpenSeoUnavailableError(`OpenSEO tools/call failed (HTTP ${toolRes.status}).`)
  }
  const bodies = await parseMcpBody(toolRes)
  const result = bodies.find((b) => b.id === 2)?.result ?? bodies[0]?.result
  if (!result) {
    throw new OpenSeoUnavailableError('OpenSEO returned no tools/call result.')
  }
  if (result.isError) {
    const errText = (result.content ?? [])
      .map((c) => c.text ?? '')
      .join(' ')
      .slice(0, 300)
    throw new OpenSeoUnavailableError(`OpenSEO tool error: ${errText || 'unknown'}`)
  }
  const text = (result.content ?? [])
    .map((c) => (c.type === 'text' || c.type === 'table' ? c.text ?? '' : ''))
    .join('\n')
  return sanitizeSeoText(text)
}

/** Rough row count for the spend log (the MCP text output is a formatted table). */
export const approximateRows = (text: string): number => {
  const lines = text.split('\n').filter((l) => l.trim().length > 0).length
  // Floor at 0 — an empty/sanitized-away response is not billable rows.
  return Math.min(lines, MAX_LIMIT_ARG)
}
