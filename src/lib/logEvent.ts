import type { Payload } from 'payload'

export type AgentLogEvent =
  | 'research_fetch'
  | 'draft_created'
  | 'draft_edited'
  | 'grade_assigned'
  | 'qa_check'
  | 'publish'
  | 'unpublish'
  | 'license_recheck'

export type LogEventInput = {
  agentId: string
  brand: string
  details?: Record<string, unknown>
  event: AgentLogEvent
  evidenceRef?: string
  operator?: string
  pageId?: string
  rubricCategory?: string
  score?: number
  siteCategory?: string
  timestamp?: string
}

/**
 * Single write path into the agent-logs collection (logging-spec.md, Task
 * 3). Callers pass whatever fields their event has — the collection's
 * beforeValidate hook rejects a grade_assigned event missing evidenceRef,
 * enforcing the audit trail requirement at the data layer rather than
 * relying on every caller to remember it.
 */
export const logEvent = (payload: Payload, input: LogEventInput) =>
  payload.create({
    collection: 'agent-logs',
    context: { disableRevalidate: true },
    data: { ...input, timestamp: input.timestamp ?? new Date().toISOString() },
  })
