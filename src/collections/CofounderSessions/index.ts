import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
} from 'payload'

import { authenticated } from '../../access/authenticated'
import { logEvent } from '@/lib/logEvent'
import { makeEnforceOptimisticVersion } from '../ResearchQueue/enforceOptimisticVersion'

/**
 * Phase G (G.2) — the Cofounder's ticket = the unit of resumability
 * (spec §2, §4.1). Slug `cofounder-sessions`; tickets render as `#CF-YYMMDD-NN`.
 *
 * - Admin-only access (same posture as research-queue); no public exposure.
 * - Plan/thread writes reuse the research-queue optimistic-version contract
 *   (`version` + `req.context.expectedVersion`/`changedFields`, 409 on
 *   conflict) — the admin is multi-tab and the Cofounder may stream a reply
 *   while Viktor edits the plan (spec test #11).
 * - `delegationQueue` (spec §4.1): the Cofounder PROPOSES jobs (QUEUED);
 *   execution requires human/orchestrator approval. No autonomous work.
 * - Every create/status-change/material update logs an agent-logs audit event
 *   (`ticket_created` / `ticket_status_change` / `ticket_updated`).
 */

const TICKET_NUMBER_PATTERN = /^#CF-\d{6}-\d{2,}$/

/**
 * Date-prefixed ticket number: `#CF-YYMMDD-NN` (QA S2-4 — no shared counter,
 * no create races; increment per day, retried on collision).
 *
 * Runs as a FIELD-LEVEL beforeValidate hook: Payload validates fields inside
 * its "beforeValidate - Fields" step (create.js), which runs BEFORE the
 * collection-level beforeValidate hooks — so a collection hook would assign
 * the number too late for the `required`/`validate` checks. A field hook runs
 * just before that field's own validation, so the generated value is seen by
 * validation. Returns the value (field-hook contract); empty only on create,
 * updates keep the existing number.
 */
const assignTicketNumber: FieldHook = async ({ value, operation, req }) => {
  if (operation !== 'create') return value
  if (value) return value

  const now = new Date()
  // YYMMDD in UTC — consistent with the llm_call daily-cap window (toISOString
  // yields "2026-08-09T…" → strip the dashes → "260809").
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '')
  const prefix = `#CF-${yymmdd}-`
  const { totalDocs } = await req.payload.count({
    collection: 'cofounder-sessions',
    where: { ticketNumber: { like: `${prefix}%` } },
  })
  return `${prefix}${String(totalDocs + 1).padStart(2, '0')}`
}

/** Keep `lastActiveAt` fresh on every write — powers the "resume" surface. */
const touchLastActive: CollectionBeforeChangeHook = ({ data }) => {
  data.lastActiveAt = new Date().toISOString()
  return data
}

/** Read-only provenance: always stamp the acting user on create — never trust a caller-supplied createdBy (reviewer S3). */
const stampCreatedBy: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user?.id) {
    data.createdBy = req.user.id
  }
  return data
}

const auditTicketChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const { payload, user } = req
  const agentId = user?.email ?? 'system'
  const commonFields = { agentId, brand: '01-playerside', pageId: String(doc.id) }

  if (operation === 'create') {
    await logEvent(
      payload,
      {
        ...commonFields,
        event: 'ticket_created',
        details: { ticketNumber: doc.ticketNumber, sessionType: doc.sessionType, status: doc.status },
      },
      req,
    )
    return doc
  }

  if (!previousDoc) return doc

  if (previousDoc.status !== doc.status) {
    await logEvent(
      payload,
      {
        ...commonFields,
        event: 'ticket_status_change',
        details: {
          ticketNumber: doc.ticketNumber,
          previousStatus: previousDoc.status,
          newStatus: doc.status,
        },
      },
      req,
    )
    return doc
  }

  // Reviewer S3: include a compact top-level field diff so the audit matches
  // the repo's before/after discipline (ResearchQueue MATERIAL_FIELDS) without
  // serializing the large plan/thread arrays wholesale.
  const materialFields = ['title', 'sessionType', 'plan', 'pinnedCases', 'thread', 'delegationQueue']
  const changedFields = materialFields.filter(
    (field) =>
      JSON.stringify(previousDoc[field] ?? null) !== JSON.stringify(doc[field] ?? null),
  )
  await logEvent(
    payload,
    {
      ...commonFields,
      event: 'ticket_updated',
      details: {
        ticketNumber: doc.ticketNumber,
        title: doc.title,
        sessionType: doc.sessionType,
        changedFields,
      },
    },
    req,
  )
  return doc
}

export const CofounderSessions: CollectionConfig<'cofounder-sessions'> = {
  slug: 'cofounder-sessions',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['ticketNumber', 'title', 'sessionType', 'status', 'lastActiveAt'],
    description:
      'The Cofounder\'s tickets (Phase G §2) — one ticket per work session, resumable by #CF-YYMMDD-NN. Plan items, thread, pinned cases and the delegation queue live here. Admin-only.',
    useAsTitle: 'ticketNumber',
  },
  fields: [
    {
      name: 'ticketNumber',
      type: 'text',
      admin: { description: 'Format #CF-YYMMDD-NN — assigned automatically on create (§2).' },
      required: true,
      unique: true,
      validate: (value: string | null | undefined) => {
        if (!value) return 'Ticket number is required.'
        return TICKET_NUMBER_PATTERN.test(value) || 'Ticket number must match #CF-YYMMDD-NN.'
      },
      hooks: {
        // field-level beforeValidate runs before THIS field's validation —
        // see assignTicketNumber doc above.
        beforeValidate: [assignTicketNumber],
      },
    },
    { name: 'title', type: 'text', admin: { description: 'e.g. "Tuesday review run — 5 casinos + 4 no-deposit".' }, required: true },
    {
      name: 'sessionType',
      type: 'select',
      defaultValue: 'review-run',
      options: [
        { label: 'Review run', value: 'review-run' },
        { label: 'Research brief', value: 'research-brief' },
        { label: 'Ops', value: 'ops' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Done', value: 'done' },
      ],
    },
    {
      name: 'plan',
      type: 'array',
      admin: { description: 'The structured to-do list for this session (§2).' },
      fields: [
        {
          name: 'kind',
          type: 'select',
          options: [
            { label: 'Casino review', value: 'casino-review' },
            { label: 'No-deposit bonus', value: 'no-deposit-bonus' },
            { label: 'Research', value: 'research' },
            { label: 'Delegation', value: 'delegation' },
            { label: 'Ops', value: 'ops' },
          ],
          required: true,
        },
        { name: 'target', type: 'text', admin: { description: 'Operator/bonus name, or free text.' } },
        {
          name: 'caseId',
          type: 'relationship',
          admin: { description: 'Linked research-queue case when applicable.' },
          relationTo: 'research-queue',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'todo',
          options: [
            { label: 'To do', value: 'todo' },
            { label: 'In progress', value: 'in-progress' },
            { label: 'Blocked', value: 'blocked' },
            { label: 'Done', value: 'done' },
          ],
        },
        { name: 'delegationRef', type: 'text', admin: { description: 'Id of an enqueued delegation job (§5) if this item was delegated.' } },
        { name: 'notes', type: 'textarea' },
      ],
    },
    {
      name: 'pinnedCases',
      type: 'relationship',
      admin: { description: 'Cases this session touches — deep links into their pipeline stage.' },
      hasMany: true,
      relationTo: 'research-queue',
    },
    {
      name: 'thread',
      type: 'array',
      admin: { description: 'Turn-by-turn record — same shape as aiRuns.messages.' },
      fields: [
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'User', value: 'user' },
            { label: 'Assistant', value: 'assistant' },
            { label: 'System', value: 'system' },
          ],
          required: true,
        },
        { name: 'content', type: 'textarea', required: true },
        { name: 'timestamp', type: 'date', defaultValue: () => new Date().toISOString(), required: true },
      ],
    },
    {
      name: 'delegationQueue',
      type: 'array',
      admin: { description: 'Spec §4.1 — the Cofounder PROPOSES jobs (QUEUED); approval + execution is human/orchestrator-side.' },
      fields: [
        { name: 'jobId', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'QA', value: 'qa' },
            { label: 'Reviewer', value: 'reviewer' },
            { label: 'Researcher', value: 'researcher' },
            { label: 'Content writer', value: 'content-writer' },
            { label: 'Desk researcher', value: 'desk-researcher' },
            { label: 'Score analyst', value: 'score-analyst' },
            { label: 'Editorial writer', value: 'editorial-writer' },
            { label: 'Integrity checker', value: 'integrity-checker' },
            { label: 'Monitor', value: 'monitor' },
          ],
          required: true,
        },
        { name: 'brief', type: 'textarea', admin: { description: 'Structured per agent-roster.md: context, deliverable, output contract.' }, required: true },
        {
          name: 'source',
          // text, NOT select (reviewer S2): a single-value select becomes a
          // Postgres enum — the exact footgun that broke System Settings saves
          // today (enum_system_settings_llm_provider). Provenance metadata;
          // expected value today: 'cofounder'.
          type: 'text',
          defaultValue: 'cofounder',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'QUEUED',
          options: [
            { label: 'Queued', value: 'QUEUED' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Running', value: 'RUNNING' },
            { label: 'Done', value: 'DONE' },
            { label: 'Rejected', value: 'REJECTED' },
          ],
        },
        { name: 'caseId', type: 'relationship', relationTo: 'research-queue' },
        { name: 'outputRef', type: 'text', admin: { description: 'Where the completed work lands (case draft, file path, report id).' } },
        { name: 'createdAt', type: 'date' },
        { name: 'approvedAt', type: 'date' },
        { name: 'completedAt', type: 'date' },
        { name: 'notes', type: 'textarea', admin: { description: 'Decision context: BLOCKED_CONFLICT, wrong-stage notes, reject reason.' } },
      ],
    },
    { name: 'lastActiveAt', type: 'date', admin: { description: 'For the "resume" surface — bumped on every write.' } },
    {
      name: 'createdBy',
      type: 'relationship',
      admin: { description: 'The user who created this ticket (read-only).', readOnly: true },
      relationTo: 'users',
    },
    {
      name: 'version',
      type: 'number',
      admin: {
        description:
          'Optimistic-concurrency token (same contract as research-queue §3.1) — bumped atomically on expectedVersion-guarded writes. Not editorial data; never set this by hand.',
        readOnly: true,
      },
      defaultValue: 1,
    },
  ],
  hooks: {
    beforeChange: [
      makeEnforceOptimisticVersion('cofounder_sessions', 'cofounder-sessions'),
      touchLastActive,
      stampCreatedBy,
    ],
    afterChange: [auditTicketChanges],
  },
  timestamps: true,
}
