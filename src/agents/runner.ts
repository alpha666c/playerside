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

export async function completeAiRun(
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  runId: string,
  output: Record<string, unknown>,
) {
  const existing = await payload
    .findByID({ collection: 'research-queue', id: caseId, req })
    .catch(() => null)
  const existingRuns = (existing && (existing as any).aiRuns) || []
  const updatedRuns = existingRuns.map((r: any) =>
    r.runId === runId
      ? { ...r, status: 'complete' as const, completedAt: new Date().toISOString(), output }
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

