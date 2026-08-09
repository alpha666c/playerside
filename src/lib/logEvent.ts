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
  | 'llm_call'
  // Phase G (G.2): CofounderSessions audit (spec §7.2)
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_status_change'
  // Phase G (G.3): Cofounder tool invocations (spec §7.2)
  | 'tool_call'

export type LogEventInput = {
  agentId: string
  brand: string
  correctsEventId?: string
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
 * Sets `context.internalWrite`, the flag agent-logs' access control
 * requires for create (governance hardening, Phase 2A) — this IS the
 * "server-generated only" boundary: nothing else may set it, so a direct
 * REST POST or manual admin create is denied regardless of auth state.
 * agent-logs also has no update/delete access at all; a correction is a new
 * event with `correctsEventId` set, never an edit of the original.
 *
 * Pass `req` when calling from inside another collection's hook so the
 * audit write joins that operation's existing transaction — both commit or
 * roll back together, and it avoids opening a second pooled connection that
 * can lock-wait against the still-open outer transaction.
 */
export const logEvent = (payload: Payload, input: LogEventInput, req?: PayloadRequest) =>
  payload.create({
    collection: 'agent-logs',
    context: { disableRevalidate: true, internalWrite: true },
    data: { ...input, timestamp: input.timestamp ?? new Date().toISOString() },
    req,
  })
