import type { Payload, PayloadRequest } from 'payload'

export type AgentLogEvent =
  | 'research_fetch'
  | 'draft_created'
  | 'draft_edited'
  | 'grade_assigned'
  | 'qa_check'
  | 'publish'
  | 'unpublish'
  | 'license_recheck'
  | 'case_created'
  | 'status_transition'
  | 'case_updated'

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
 *
 * Pass `req` when calling from inside another collection's hook so the
 * audit write joins that operation's existing transaction — both commit or
 * roll back together, and it avoids opening a second pooled connection that
 * can lock-wait against the still-open outer transaction.
 */
export const logEvent = (payload: Payload, input: LogEventInput, req?: PayloadRequest) =>
  payload.create({
    collection: 'agent-logs',
    context: { disableRevalidate: true },
    data: { ...input, timestamp: input.timestamp ?? new Date().toISOString() },
    req,
  })
