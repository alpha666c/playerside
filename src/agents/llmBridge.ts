import type { Payload, PayloadRequest } from 'payload'

import { chatLlm, type LlmMessage, type LlmOptions, type LlmResult } from '@/lib/reviewChat/llm'

/**
 * Phase G (G.5) — the shared bridge between the five pipeline agents and the
 * LLM client (spec §5). The agents' role files are the system prompts; this
 * module supplies the mechanics that keep a real model call safe inside the
 * evidence discipline:
 *
 * - `parseJsonLoose` — tolerant extraction of the model's JSON reply
 *   (markdown fences, trailing prose, nested braces in strings).
 * - `forceUnverifiedDiscipline` — QA S1-2 / test #10: a model call may change
 *   the prose, never the evidence discipline. Every `confidence` /
 *   `verificationStatus` the model emits is forced back to `unverified`.
 * - `guardClaimValue` / `mergeSkeletonWithModel` — no fabricated findings
 *   (spec §0): a claim value only survives when the model cites a source URL
 *   or the value is already present in the case context. Everything else
 *   stays null and the deterministic skeleton carries the shape.
 * - `runAgentLlm` — the one real `chatLlm` call shared by all five agents
 *   (per-role model override via `agentRole`, audit + daily cap built in).
 */

/**
 * Extract the first balanced top-level JSON object from a model reply.
 * Handles ```json fences, surrounding prose, and braces inside string
 * literals. Returns null when no parseable object exists.
 */
export const parseJsonLoose = (text: string | null | undefined): Record<string, unknown> | null => {
  if (!text) return null
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < t.length; i++) {
    const c = t[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(start, i + 1)) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** Collect every scalar string/number in the context for the no-invention guard. */
export const contextValueSet = (context: Record<string, unknown>): Set<string> => {
  const set = new Set<string>()
  const walk = (v: unknown): void => {
    if (v === null || v === undefined) return
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase()
      if (s.length >= 4) set.add(s)
      return
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      set.add(String(v).toLowerCase())
      return
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item)
      return
    }
    if (typeof v === 'object') {
      for (const key of Object.keys(v as object)) walk((v as Record<string, unknown>)[key])
    }
  }
  walk(context)
  return set
}

/**
 * QA S1-2 / spec test #10 — a model call can never self-verify. Deep-walk the
 * model's parsed output and force `confidence` and `verificationStatus` back
 * to `unverified`, filling empty `unverifiedReason`s with the given note.
 */
export const forceUnverifiedDiscipline = (obj: unknown, note: string): void => {
  if (Array.isArray(obj)) {
    for (const item of obj) forceUnverifiedDiscipline(item, note)
    return
  }
  if (obj && typeof obj === 'object') {
    const rec = obj as Record<string, unknown>
    for (const [key, value] of Object.entries(rec)) {
      if (key === 'confidence') rec[key] = 'unverified'
      else if (key === 'verificationStatus') rec[key] = 'unverified'
      else if (key === 'unverifiedReason' && (value === null || value === undefined || value === '')) {
        rec[key] = note
      } else {
        forceUnverifiedDiscipline(value, note)
      }
    }
  }
}

/**
 * No-fabrication guard (spec §0, §6.1): a model-supplied claim value only
 * survives when it is supported — the claim cites its own public source URL
 * (still unverified until a human confirms) OR the value string appears in
 * the case context. A bare invented value (e.g. a fabricated licence number
 * with no source) drops to null and never lands in the draft.
 */
/**
 * Reviewer S3 — a "cited source" must at least look like a URL. Blocks a
 * hostile model attaching garbage ("not-a-url") to keep an invented value,
 * while preserving the honest-citation path. The claim stays `unverified`
 * either way — the URL is never validated as reachable.
 */
const isPlausibleUrl = (s: string): boolean =>
  /^https?:\/\/[^/\s]+\.[^/\s]+/i.test(s.trim())

export const guardClaimValue = (
  value: unknown,
  sourceUrl: unknown,
  contextValues: Set<string>,
): unknown => {
  if (value === null || value === undefined || value === '') return null
  if (typeof sourceUrl === 'string' && isPlausibleUrl(sourceUrl)) return value
  const s = String(value).trim().toLowerCase()
  if (s.length === 0) return null
  if (contextValues.has(s)) return value
  if (s.length >= 6) {
    for (const cv of contextValues) {
      if (cv.includes(s)) return value
    }
  }
  return null
}

/**
 * Merge a model claim over a skeleton claim object. The skeleton owns the
 * schema (every field always exists); the model may supply value / sourceUrl
 * / accessDate / unverifiedReason, but the value passes through the
 * no-invention guard. Callers run forceUnverifiedDiscipline afterwards.
 */
export const applyClaimGroup = (
  skeleton: Record<string, unknown>,
  modelClaim: unknown,
  contextValues: Set<string>,
): Record<string, unknown> => {
  const base = { ...skeleton }
  const m =
    modelClaim && typeof modelClaim === 'object' && !Array.isArray(modelClaim)
      ? (modelClaim as Record<string, unknown>)
      : {}
  const sourceUrl = m.sourceUrl !== undefined ? m.sourceUrl : base.sourceUrl
  if (m.value !== undefined) base.value = guardClaimValue(m.value, sourceUrl, contextValues)
  if (m.sourceUrl !== undefined) base.sourceUrl = sourceUrl ?? null
  if (m.accessDate !== undefined) base.accessDate = m.accessDate ?? base.accessDate
  if (m.unverifiedReason !== undefined && m.unverifiedReason !== null) {
    base.unverifiedReason = m.unverifiedReason
  }
  return base
}

/**
 * Recursive skeleton merge: the skeleton is the schema contract; the model's
 * parsed JSON overlays it. Claim objects (objects with a `value` key) merge
 * via `applyClaimGroup`; nested objects recurse.
 *
 * Arrays are intentionally skeleton-only (reviewer S3): model-supplied
 * `secondary` licenses / `complaints` / `reportedFriction` rows are dropped
 * rather than merged — they are evidence lists, and an ungrounded list looks
 * exactly like a grounded one. Structured evidence belongs in the evidence
 * register, where every row passes the sourceUrl/context ground guard. This
 * is the safer behavior; keep it explicit.
 */
export const mergeSkeletonWithModel = (
  skeleton: unknown,
  model: unknown,
  contextValues: Set<string>,
): unknown => {
  if (
    skeleton === null ||
    typeof skeleton !== 'object' ||
    model === null ||
    typeof model !== 'object' ||
    Array.isArray(skeleton)
  ) {
    return skeleton
  }
  const base = skeleton as Record<string, unknown>
  const m = model as Record<string, unknown>
  const out: Record<string, unknown> = { ...base }
  for (const [key, baseValue] of Object.entries(base)) {
    const modelValue = m[key]
    if (modelValue === undefined) continue
    const isClaim =
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      'value' in (baseValue as object)
    if (isClaim) {
      out[key] = applyClaimGroup(baseValue as Record<string, unknown>, modelValue, contextValues)
    } else if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof modelValue === 'object' &&
      modelValue !== null &&
      !Array.isArray(modelValue)
    ) {
      out[key] = mergeSkeletonWithModel(baseValue, modelValue, contextValues)
    }
    // scalar leaves + arrays: skeleton default wins (arrays like
    // licensing.secondary are reassembled by the caller when needed)
  }
  return out
}

export interface AgentLlmInput {
  /** role key for the per-role model override map + the audit trail */
  agentRole: string
  /** the role file from docs/review-agents/ — becomes the system prompt */
  roleFile: string
  /** optional extra system-prompt context appended to the role file */
  systemAppend?: string
  /** allowlisted case context (the only source of case facts) */
  context: Record<string, unknown>
  /** what to produce: schema + rules, written by the caller per agent */
  task: string
  maxTokens?: number
  temperature?: number
}

export interface AgentLlmResult {
  content: string | null
  /** parsed JSON when the model returned parseable JSON, else null */
  parsed: Record<string, unknown> | null
  model: string
  runId?: string
  /** true when the model replied with text but no parseable JSON */
  fallback: boolean
}

const buildUserPrompt = (task: string, context: Record<string, unknown>): string =>
  [
    task.trim(),
    '',
    'CASE CONTEXT (JSON) — the only source of case facts:',
    JSON.stringify(context, null, 2),
  ].join('\n')

/**
 * The single real model call shared by the five agents. Role file = system
 * prompt; task + case context = user prompt; per-role model override via
 * `agentRole`; audit + daily cap come from chatLlm itself. Throws on
 * configuration/API errors — callers decide whether to surface or fall back.
 */
export const runAgentLlm = async (
  payload: Payload,
  req: PayloadRequest,
  input: AgentLlmInput,
): Promise<AgentLlmResult> => {
  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: input.systemAppend?.trim()
        ? `${input.roleFile}\n\n---
Founder voice / house context:
${input.systemAppend.trim()}`
        : input.roleFile,
    },
    { role: 'user', content: buildUserPrompt(input.task, input.context) },
  ]
  const opts: LlmOptions = {
    agentRole: input.agentRole,
    ...(typeof input.maxTokens === 'number' ? { maxTokens: input.maxTokens } : {}),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
  }
  const res: LlmResult = await chatLlm(payload, req, messages, opts)
  const parsed = parseJsonLoose(res.content)
  return {
    content: res.content,
    parsed,
    model: res.model,
    runId: res.runId,
    fallback: res.content !== null && parsed === null,
  }
}
