import type { Access, CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * Governance hardening (Phase 2A): agent-logs is server-generated only.
 * `logEvent()` — the single canonical write path (src/lib/logEvent.ts) —
 * sets `context.internalWrite`; nothing else does. A direct POST to
 * /api/agent-logs, or a manual admin "create new", carries no such context
 * and is denied here, regardless of the requester's auth state. This is
 * enforced at the access-control layer, not just by convention.
 */
const internalWriteOnly: Access = ({ req }) => req.context?.internalWrite === true

/** No update or delete, ever — corrections must be new events (governance hardening, Phase 2A). */
const neverAllowed: Access = () => false

/**
 * The logging store required by logging-spec.md (Task 3, Phase 1) and the
 * infrastructure the audit trail requirement (logging-spec.md, [LOCKED —
 * principle]) depends on: any published grading score must be traceable, in
 * one hop, back to the evidence that justified it.
 *
 * Event shape follows logging-spec.md's table exactly. Fields that vary by
 * event type (source_url, extracted, draft_version, inputs_used, qa_checks,
 * qa_check_ref, previous_status, current_status, source_checked) live in
 * `details` rather than as one column per event type — most would be null
 * on most rows, and the spec's own JSON-lines example is a flat, per-event
 * shape, not a fixed schema. `evidenceRef`, `rubricCategory`, `score`,
 * `operator`, and `pageId` are first-class columns because those are what
 * the audit trail requirement and compliance queries actually filter on.
 *
 * No agent pipeline writes here yet (VertiX Air Suite doesn't exist —
 * ORG.md §4). This collection plus `src/lib/logEvent.ts` is the store and
 * write path; wiring real agents to call it is later work.
 */
const enforceGradeEvidence: CollectionBeforeValidateHook = ({ data }) => {
  if (data?.event === 'grade_assigned' && !data?.evidenceRef) {
    throw new APIError(
      'Cannot log a grade_assigned event without evidenceRef — every grading score must be traceable to its evidence (logging-spec.md audit trail requirement).',
      400,
    )
  }
  return data
}

const complianceEvents = new Set([
  'grade_assigned',
  'qa_check',
  'publish',
  'unpublish',
  'license_recheck',
  'case_created',
  'status_transition',
  'case_updated',
])

const computeRetentionClass: CollectionBeforeChangeHook = ({ data }) => {
  data.retentionClass = complianceEvents.has(data.event) ? 'compliance' : 'operational'
  return data
}

export const AgentLogs: CollectionConfig<'agent-logs'> = {
  slug: 'agent-logs',
  access: {
    create: internalWriteOnly,
    delete: neverAllowed,
    read: authenticated,
    update: neverAllowed,
  },
  admin: {
    defaultColumns: ['event', 'brand', 'siteCategory', 'operator', 'agentId', 'timestamp'],
    description:
      'Append-only, immutable agent activity log (logging-spec.md). Server-generated only via logEvent() — no manual create, no update, no delete, ever; corrections must be new events (see correctsEventId). Compliance-relevant events (grades, QA checks, publish/unpublish, license rechecks, case creation/status transitions/material updates) are retained indefinitely; operational events are not.',
    useAsTitle: 'event',
  },
  fields: [
    {
      name: 'event',
      type: 'select',
      options: [
        { label: 'Research fetch', value: 'research_fetch' },
        { label: 'Draft created', value: 'draft_created' },
        { label: 'Draft edited', value: 'draft_edited' },
        { label: 'Grade assigned', value: 'grade_assigned' },
        { label: 'QA/compliance check', value: 'qa_check' },
        { label: 'Publish', value: 'publish' },
        { label: 'Unpublish', value: 'unpublish' },
        { label: 'License recheck', value: 'license_recheck' },
        { label: 'Case created', value: 'case_created' },
        { label: 'Status transition', value: 'status_transition' },
        { label: 'Case updated', value: 'case_updated' },
        // Phase G (G.1): every LLM invocation (Cofounder + pipeline agents)
        // logs one row — doubles as the daily spend-cap counter (spec §1/§7.1).
        // Operational class (not compliance); metadata only, never message content.
        { label: 'LLM call', value: 'llm_call' },
      ],
      required: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      defaultValue: () => new Date().toISOString(),
      index: true,
      required: true,
    },
    { name: 'agentId', type: 'text', required: true },
    {
      name: 'brand',
      type: 'text',
      admin: { description: "e.g. '01-playerside' (ORG.md brand directory naming)." },
      required: true,
      index: true,
    },
    {
      name: 'siteCategory',
      type: 'text',
      admin: {
        description:
          "Category within the brand, e.g. 'traditional' or 'crypto-casino'. Kept distinct from rubricCategory (logging-spec.md field naming note).",
      },
      index: true,
    },
    { name: 'operator', type: 'text', index: true },
    { name: 'pageId', type: 'text' },
    { name: 'rubricCategory', type: 'text' },
    { name: 'score', type: 'number' },
    {
      name: 'evidenceRef',
      type: 'text',
      admin: {
        description:
          'Link to the research fetch or source that justifies a grade_assigned event. Required whenever event is grade_assigned — enforced by hook, not just this description.',
      },
    },
    {
      name: 'correctsEventId',
      type: 'text',
      admin: {
        description:
          'The id of the agent-logs event this one corrects, if any. Since entries are immutable, a correction is always a new event referencing the one it supersedes — never an edit.',
      },
    },
    {
      name: 'details',
      type: 'json',
      admin: {
        description:
          'Event-specific fields per logging-spec.md: source_url/extracted (research fetch), draft_version/inputs_used (draft events), qa_checks (per-field pass/fail + reason), qa_check_ref (publish/unpublish), previous_status/current_status/source_checked (license recheck).',
      },
    },
    {
      name: 'retentionClass',
      type: 'select',
      admin: {
        description: 'Computed from event type on every save — never hand-set.',
        readOnly: true,
      },
      options: [
        { label: 'Compliance (retain indefinitely)', value: 'compliance' },
        { label: 'Operational (90-day default)', value: 'operational' },
      ],
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [enforceGradeEvidence],
    beforeChange: [computeRetentionClass],
  },
  timestamps: true,
}
