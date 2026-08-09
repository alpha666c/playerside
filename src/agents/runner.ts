// Basic agent runner utilities: load role file, create aiRun records, update aiRun status, and helper to apply draft updates via the concurrency contract.
import fs from 'fs/promises'
import path from 'path'
import type { Payload, PayloadRequest } from 'payload'

export async function loadRoleFile(role: string): Promise<string> {
  // Map role to the canonical filename in docs/review-agents
  const roleFilenameMap: Record<string, string> = {
    'desk-research': 'DESK-RESEARCHER.md',
    'desk-researcher': 'DESK-RESEARCHER.md',
    'score-analyst': 'SCORE-ANALYST.md',
    editorial: 'EDITORIAL-WRITER.md',
    'editorial-writer': 'EDITORIAL-WRITER.md',
    'integrity-check': 'INTEGRITY-CHECKER.md',
    'integrity-checker': 'INTEGRITY-CHECKER.md',
    monitor: 'MONITOR.md',
    monitoring: 'MONITOR.md',
  }
  const selected = roleFilenameMap[role] ?? `${role}.md`
  const filePath = path.join(process.cwd(), 'docs', 'review-agents', selected)
  return fs.readFile(filePath, 'utf8')
}

type ValidAgentRole =
  | 'desk-researcher'
  | 'score-analyst'
  | 'editorial-writer'
  | 'integrity-checker'
  | 'monitor'
  | 'chat'

export async function startAiRun(
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  agentRole: ValidAgentRole,
) {
  const runId = crypto.randomUUID()
  // Read existing aiRuns and append a new entry atomically via update
  const existing = await payload
    .findByID({ collection: 'research-queue', id: caseId, req })
    .catch(() => null)
  const existingRuns = (existing && (existing as any).aiRuns) || []
  const newEntry = {
    runId,
    agentRole,
    version: 1,
    status: 'pending' as const,
    startedAt: new Date().toISOString(),
    input: {},
    output: null,
    messages: [],
  }
  await payload.update({
    collection: 'research-queue',
    id: caseId,
    data: {
      aiRuns: [...existingRuns, newEntry],
    },
    req,
  })
  return runId
}

/**
 * Mark a run complete. `complete-with-warning` (G.5): the model call failed
 * or was not parseable and the agent fell back to its deterministic skeleton.
 * Convention: the agents put `_fallback: true` + `_fallbackReason` on the
 * output when that happens — consumers must check `_fallback === true` (the
 * key is omitted when there is no fallback).
 */
export async function completeAiRun(
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  runId: string,
  output: Record<string, unknown>,
  status: 'complete' | 'complete-with-warning' = 'complete',
) {
  const existing = await payload
    .findByID({ collection: 'research-queue', id: caseId, req })
    .catch(() => null)
  const existingRuns = (existing && (existing as any).aiRuns) || []
  const updatedRuns = existingRuns.map((r: any) =>
    r.runId === runId
      ? { ...r, status, completedAt: new Date().toISOString(), output }
      : r,
  )
  await payload.update({
    collection: 'research-queue',
    id: caseId,
    data: {
      aiRuns: updatedRuns,
    },
    req,
  })
}

/**
 * Record a user → assistant turn on an existing aiRun (blueprint §10 chat
 * history continuity). The user's prompt lands in `input.message` (what was
 * sent) and both turns append to the run's `messages` array so the panel can
 * rebuild the thread across sessions. No-op if the run is gone (the agent
 * output itself already succeeded — never fail the exchange over history).
 *
 * Single-writer assumption (documented, same as completeAiRun/startAiRun):
 * the aiRuns read-modify-write is NOT atomic and does not use the version
 * gate — a concurrent writer between completeAiRun and this write could
 * clobber a run. Acceptable: the chat panel is a single-user admin surface
 * and each exchange is sequential within its request. The version gate
 * protects the APPLY write path, which is where concurrent human edits
 * would actually collide.
 */
export async function recordChatTurn(
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  runId: string,
  turn: { userMessage: string; assistantSummary: string },
) {
  const existing = await payload
    .findByID({ collection: 'research-queue', id: caseId, req })
    .catch(() => null)
  const existingRuns: any[] = (existing && (existing as any).aiRuns) || []

  let touched = false
  const now = new Date().toISOString()
  const updatedRuns = existingRuns.map((r: any) => {
    if (r.runId !== runId) return r
    touched = true
    const messages = Array.isArray(r.messages) ? r.messages : []
    return {
      ...r,
      input: { ...(r.input ?? {}), message: turn.userMessage },
      messages: [
        ...messages,
        { role: 'user', content: turn.userMessage, timestamp: now },
        { role: 'assistant', content: turn.assistantSummary, timestamp: now },
      ],
    }
  })

  if (!touched) return

  await payload.update({
    collection: 'research-queue',
    id: caseId,
    data: { aiRuns: updatedRuns },
    req,
  })
}

export async function applyDraft(
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  data: Record<string, unknown>,
  expectedVersion: number,
  changedFields: string[],
) {
  return payload.update({
    collection: 'research-queue',
    id: caseId,
    context: { expectedVersion, changedFields },
    data,
    req,
  })
}

