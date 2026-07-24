import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import { authenticated } from '../../access/authenticated'
import { logEvent } from '@/lib/logEvent'
import { enforceOptimisticVersion } from './enforceOptimisticVersion'

/**
 * The per-operator case file that drives the Review Intelligence System
 * pipeline (MASTER-BLUEPRINT.md §3, §9.2): QUEUED → DESK-RESEARCH →
 * HANDS-ON-TESTING → EDITORIAL → INTEGRITY-CHECK → PUBLISHED → MONITORING.
 * Referred to as "CaseFile" in admin/UI copy (§8.1, §10) — `ResearchQueue`
 * is the collection/table name, "Case File" is what Viktor sees.
 *
 * `handsOnResults` includes the two-channel support test fields from
 * TEST-CASES.md (locked 2026-07-22), which explicitly names these as
 * `handsOnResults.support*` / email-channel fields on this collection.
 */
const CASE_NUMBER_PATTERN = /^#PS-\d{4}-(\d{3}|S\d{2})$/

/** The seven pipeline stages, in the strict order MASTER-BLUEPRINT.md §3 requires — "Every case moves through exactly these stages in order. No skipping." */
const STAGES = [
  'queued',
  'desk-research',
  'hands-on-testing',
  'editorial',
  'integrity-check',
  'published',
  'monitoring',
] as const

/** True if a value is meaningfully present — used by the stage entry gates below, not for general field validation. */
const isPopulated = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return Boolean(value)
}

type Stage = (typeof STAGES)[number]

/**
 * Stage-specific entry gates — each keyed to the stage being ENTERED,
 * checking the MASTER-BLUEPRINT.md §3 exit condition of the stage being
 * LEFT. A case cannot move into a stage until the work that stage depends
 * on actually exists, not just that the status field was flipped.
 */
const STAGE_ENTRY_GATES: Partial<Record<Stage, (merged: Record<string, unknown>) => string | null>> = {
  'hands-on-testing': (merged) =>
    isPopulated(merged.deskResearchOutput)
      ? null
      : 'Cannot enter hands-on-testing: deskResearchOutput is not populated (§3 DESK-RESEARCH exit condition: "all desk fields populated").',
  editorial: (merged) => {
    const hands = (merged.handsOnResults ?? {}) as Record<string, unknown>
    const requiredActuals = ['withdrawalActualHours', 'supportActualMinutes', 'kycActualDays', 'bonusActualWager']
    const missingActuals = requiredActuals.filter((key) => !isPopulated(hands[key]))
    if (missingActuals.length > 0) {
      return `Cannot enter editorial: handsOnResults is missing ${missingActuals.join(', ')} (§3 HANDS-ON-TESTING exit condition: "all test fields populated with real timestamps and evidence").`
    }
    if (!isPopulated(merged.evidenceRegister)) {
      return 'Cannot enter editorial: evidenceRegister has no entries — hands-on results require logged evidence (§3).'
    }
    return null
  },
  'integrity-check': (merged) =>
    isPopulated(merged.editorialDraft)
      ? null
      : 'Cannot enter integrity-check: editorialDraft is not populated (§3 EDITORIAL exit condition: "copy draft committed").',
  published: (merged) =>
    merged.integritySignOff === true
      ? null
      : 'Cannot enter published: integritySignOff is not true (§3 INTEGRITY-CHECK exit condition: "zero conflicts found; signed off").',
  monitoring: (merged) =>
    isPopulated(merged.publishedReviewId)
      ? null
      : 'Cannot enter monitoring: publishedReviewId is not set (§3 PUBLISHED exit condition: "review goes live").',
}

/**
 * Blocks any status change that isn't a move to exactly the next stage — no
 * skipping forward, no moving backward — then runs that stage's entry gate
 * (STAGE_ENTRY_GATES) against the document as it will exist after this
 * change, so a transition can't sneak in alongside the very data that
 * satisfies its own gate in a way that doesn't actually land.
 */
export const enforceStatusTransition: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {

  const nextStatus = data?.status
  if (!nextStatus) return data

  if (operation === 'create') {
    if (nextStatus !== STAGES[0]) {
      throw new APIError(
        `New cases must start at status "${STAGES[0]}" (MASTER-BLUEPRINT.md §3) — got "${nextStatus}".`,
        400,
      )
    }
    return data
  }

  const prevStatus = originalDoc?.status
  if (nextStatus === prevStatus) return data

  const prevIndex = STAGES.indexOf(prevStatus)
  const nextIndex = STAGES.indexOf(nextStatus as Stage)
  if (nextIndex !== prevIndex + 1) {
    throw new APIError(
      `Cannot move a case from "${prevStatus}" to "${nextStatus}" — cases move through exactly one stage at a time, in order (MASTER-BLUEPRINT.md §3: "No skipping"). Expected next stage: "${STAGES[prevIndex + 1] ?? '(none — monitoring is terminal)'}".`,
      400,
    )
  }

  const merged: Record<string, unknown> = { ...(originalDoc ?? {}) }
  for (const key of Object.keys(data ?? {})) {
    merged[key] = (data as Record<string, unknown>)[key]
  }

  const gate = STAGE_ENTRY_GATES[nextStatus as Stage]
  const gateFailure = gate?.(merged)
  if (gateFailure) {
    throw new APIError(gateFailure, 400)
  }

  return data
}

/**
 * Material-field audit policy (governance requirement, Phase 2A hardening):
 * every one of these top-level fields is audit-logged, with before/after
 * values and actor data, on any change. This list IS the policy — a field
 * not on it is not covered by `case_updated`, deliberately (bookkeeping
 * fields like `id`/`updatedAt`/`createdAt` don't need an audit entry for
 * their own sake). `status` is excluded here because it gets its own
 * dedicated `status_transition` event instead, with the same before/after
 * + actor guarantee.
 */
const MATERIAL_FIELDS = [
  'caseNumber',
  'operatorName',
  'operatorUrl',
  'casinoType',
  'parentCompany',
  'licenseJurisdiction',
  'licenseNumber',
  'assignedReviewer',
  'deskResearchOutput',
  'handsOnResults',
  'computedScores',
  'editorialDraft',
  'integritySignOff',
  'publishedReviewId',
  'internalNotes',
  'monitorLog',
  'evidenceRegister',
  'accountProfile',
  'aiRuns',
] as const

/**
 * Append-only audit trail (governance requirement, Phase 2A) for every
 * material change to a case file — routed through the existing AgentLogs
 * store (logEvent.ts) rather than a second, parallel logging mechanism.
 * Passes `req` through to logEvent() so each audit write joins the same
 * transaction as the case-file change: they commit or roll back together
 * (and it avoids opening a second pooled connection that would otherwise
 * lock-wait against this still-open outer transaction).
 */
const auditCaseFileChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const { payload, user } = req
  const agentId = user?.email ?? 'system'
  const commonFields = { agentId, brand: '01-playerside', operator: doc.operatorName, pageId: String(doc.id) }

  if (operation === 'create') {
    await logEvent(
      payload,
      {
        ...commonFields,
        event: 'case_created',
        details: { caseNumber: doc.caseNumber, casinoType: doc.casinoType, status: doc.status },
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
        event: 'status_transition',
        details: { caseNumber: doc.caseNumber, previousStatus: previousDoc.status, newStatus: doc.status },
      },
      req,
    )
  }

  const changes = MATERIAL_FIELDS.map((field) => ({
    field,
    before: previousDoc[field] ?? null,
    after: doc[field] ?? null,
  })).filter((change) => JSON.stringify(change.before) !== JSON.stringify(change.after))

  if (changes.length > 0) {
    await logEvent(
      payload,
      {
        ...commonFields,
        event: 'case_updated',
        details: { caseNumber: doc.caseNumber, changes },
      },
      req,
    )
  }

  return doc
}

/** `knownBrands` comes back as numeric IDs or populated docs depending on query depth. */
const extractIds = (relations: unknown): number[] =>
  Array.isArray(relations)
    ? relations.map((item) => (typeof item === 'object' && item !== null ? (item as { id: number }).id : item))
    : []

const syncOperatorKnownBrands: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const { payload } = req
  const prevOperatorId =
    previousDoc?.parentCompany && typeof previousDoc.parentCompany === 'object'
      ? previousDoc.parentCompany.id
      : previousDoc?.parentCompany
  const nextOperatorId =
    doc?.parentCompany && typeof doc.parentCompany === 'object' ? doc.parentCompany.id : doc?.parentCompany

  if (prevOperatorId === nextOperatorId) return doc

  if (prevOperatorId) {
    const prevOperator = await payload.findByID({ id: prevOperatorId, collection: 'operators', req }).catch(() => null)
    if (prevOperator) {
      const knownBrands = extractIds(prevOperator.knownBrands)
      await payload.update({
        id: prevOperatorId,
        collection: 'operators',
        context: { disableRevalidate: true },
        data: { knownBrands: knownBrands.filter((id) => id !== doc.id) },
        req,
      })
    }
  }

  if (nextOperatorId) {
    const nextOperator = await payload.findByID({ id: nextOperatorId, collection: 'operators', req }).catch(() => null)
    if (nextOperator) {
      const knownBrands = extractIds(nextOperator.knownBrands)
      if (!knownBrands.includes(doc.id)) {
        await payload.update({
          id: nextOperatorId,
          collection: 'operators',
          context: { disableRevalidate: true },
          data: { knownBrands: [...knownBrands, doc.id] },
          req,
        })
      }
    }
  }

  return doc
}

export const ResearchQueue: CollectionConfig<'research-queue'> = {
  slug: 'research-queue',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['caseNumber', 'operatorName', 'casinoType', 'status', 'updatedAt'],
    description: 'Review Intelligence System case files (MASTER-BLUEPRINT.md §3). Referred to as "Case File" in agent role docs.',
    useAsTitle: 'caseNumber',
  },
  fields: [
    {
      name: 'caseNumber',
      type: 'text',
      admin: { description: 'Format #PS-YYYY-NNN (real cases) or #PS-YYYY-SNN (seed/illustrative cases) — §2.' },
      required: true,
      unique: true,
      validate: (value: string | null | undefined) => {
        if (!value) return 'Case number is required.'
        return CASE_NUMBER_PATTERN.test(value) || 'Case number must match #PS-YYYY-NNN (or #PS-YYYY-SNN for seed cases).'
      },
    },
    { name: 'operatorName', type: 'text', required: true },
    { name: 'operatorUrl', type: 'text' },
    {
      name: 'casinoType',
      type: 'select',
      options: [
        { label: 'Traditional', value: 'traditional' },
        { label: 'Crypto', value: 'crypto' },
      ],
      required: true,
    },
    {
      name: 'parentCompany',
      type: 'relationship',
      admin: { description: 'The Operator (parent/holding company) this brand belongs to (§8.1).' },
      relationTo: 'operators',
    },
    { name: 'licenseJurisdiction', type: 'text' },
    { name: 'licenseNumber', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Desk research', value: 'desk-research' },
        { label: 'Hands-on testing', value: 'hands-on-testing' },
        { label: 'Editorial', value: 'editorial' },
        { label: 'Integrity check', value: 'integrity-check' },
        { label: 'Published', value: 'published' },
        { label: 'Monitoring', value: 'monitoring' },
      ],
      required: true,
    },
    { name: 'assignedReviewer', type: 'text', defaultValue: 'Viktor' },
    {
      name: 'version',
      type: 'number',
      admin: {
        description:
          'Optimistic-concurrency token (docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md §3.1) — bumped atomically by enforceOptimisticVersion.ts on every update. Not editorial data; never set this by hand.',
        readOnly: true,
      },
      // Not `required: true` deliberately — every existing call site that
      // creates a research-queue doc (this app's own scripts, and any
      // future caller) relies on Payload applying this default rather than
      // passing version explicitly. Real NOT NULL enforcement lives in the
      // migration's DB-level default + constraint, not this TS-facing flag.
      defaultValue: 1,
    },
    {
      name: 'deskResearchOutput',
      type: 'json',
      admin: { description: 'Populated by the Desk Researcher agent (DESK-RESEARCHER.md output format).' },
    },
    {
      name: 'handsOnResults',
      type: 'group',
      fields: [
        { name: 'withdrawalClaimedHours', type: 'number' },
        { name: 'withdrawalActualHours', type: 'number' },
        { name: 'withdrawalEvidenceRef', type: 'relationship', relationTo: 'media' },
        {
          name: 'supportClaimedMinutes',
          type: 'number',
          admin: { description: 'Operator-claimed live chat response time.' },
        },
        {
          name: 'supportActualMinutes',
          type: 'number',
          admin: { description: 'Live chat (RG test, TEST-CASES.md §Channel 1) — time to first human response.' },
        },
        { name: 'supportEvidenceRef', type: 'relationship', relationTo: 'media' },
        {
          name: 'supportQualityScore',
          type: 'select',
          admin: { description: 'Sub-questions answered by the RG live chat test (TEST-CASES.md §Channel 1).' },
          options: [
            { label: '0/3', value: '0' },
            { label: '1/3', value: '1' },
            { label: '2/3', value: '2' },
            { label: '3/3', value: '3' },
          ],
        },
        { name: 'supportEmpathyFlag', type: 'checkbox', defaultValue: false },
        { name: 'supportRGResourcesFlag', type: 'checkbox', defaultValue: false },
        {
          name: 'emailSupportActualHours',
          type: 'number',
          admin: { description: 'Email (KYC/privacy test, TEST-CASES.md §Channel 2) — time to first response, in hours.' },
        },
        {
          name: 'emailQualityScore',
          type: 'select',
          admin: { description: 'Sub-questions answered by the KYC/privacy email test (TEST-CASES.md §Channel 2).' },
          options: [
            { label: '0/3', value: '0' },
            { label: '1/3', value: '1' },
            { label: '2/3', value: '2' },
            { label: '3/3', value: '3' },
          ],
        },
        { name: 'emailGDPRFlag', type: 'checkbox', defaultValue: false },
        {
          name: 'emailPolicyAccuracyFlag',
          type: 'select',
          admin: {
            description:
              'Desk Researcher cross-check: does the stated retention period match the live Privacy Policy? (TEST-CASES.md §Cross-check)',
          },
          options: [
            { label: 'Match', value: 'match' },
            { label: 'Conflict', value: 'conflict' },
            { label: 'Not yet checked', value: 'not-checked' },
          ],
        },
        { name: 'kycClaimedDays', type: 'number' },
        { name: 'kycActualDays', type: 'number' },
        { name: 'kycEvidenceRef', type: 'relationship', relationTo: 'media' },
        { name: 'bonusClaimedWager', type: 'number' },
        { name: 'bonusActualWager', type: 'number' },
        { name: 'bonusEvidenceRef', type: 'relationship', relationTo: 'media' },
      ],
    },
    {
      name: 'computedScores',
      type: 'json',
      admin: { description: 'Populated by the Score Analyst agent (SCORE-ANALYST.md output format).' },
    },
    {
      name: 'editorialDraft',
      type: 'richText',
      admin: { description: 'Populated by the Editorial Writer agent — draft until Viktor + Integrity Checker sign off.' },
    },
    {
      name: 'integritySignOff',
      type: 'checkbox',
      admin: { description: 'Set once the Integrity Checker agent output is INTEGRITY: PASS and Viktor confirms.' },
      defaultValue: false,
    },
    {
      name: 'publishedReviewId',
      type: 'relationship',
      admin: { description: 'The live review this case became, once published.' },
      relationTo: ['traditional-casino-reviews', 'crypto-casino-reviews'],
    },
    {
      name: 'internalNotes',
      type: 'richText',
      admin: { description: 'Never published — internal case notes only.' },
    },
    {
      name: 'monitorLog',
      type: 'array',
      admin: { description: 'Monitor agent entries post-publish (MONITOR.md).' },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'flagType', type: 'text', required: true },
        { name: 'summary', type: 'textarea', required: true },
        { name: 'agentRef', type: 'text' },
      ],
    },
    {
      name: 'evidenceRegister',
      type: 'array',
      admin: {
        description:
          'Structured evidence register — every fact this case relies on should trace to one entry here, sourced and labelled (DESK-RESEARCHER.md confidence convention). Each row has a real Payload-generated id; supersedesEvidenceId references that id to build a correction lineage.',
      },
      fields: [
        { name: 'label', type: 'text', admin: { description: 'What this evidence supports or verifies.' }, required: true },
        {
          name: 'claimKey',
          type: 'text',
          admin: { description: 'Short identifier for the specific claim this evidence backs, e.g. "licenseNumber" or "withdrawalSpeed".' },
        },
        { name: 'claimSummary', type: 'textarea', admin: { description: 'The claim itself, in plain language.' } },
        {
          name: 'sourceType',
          type: 'select',
          admin: { description: 'What kind of source this is (DESK-RESEARCHER.md sourcing rules).' },
          options: [
            { label: 'Regulator register', value: 'regulator-register' },
            { label: 'Operator primary source (T&C, site)', value: 'operator-primary' },
            { label: 'Community source (forum, complaint site)', value: 'community-source' },
            { label: 'Hands-on test', value: 'hands-on-test' },
            { label: 'Other', value: 'other' },
          ],
        },
        { name: 'mediaRef', type: 'relationship', admin: { description: 'Screenshot or upload, if applicable.' }, relationTo: 'media' },
        { name: 'sourceUrl', type: 'text', admin: { description: 'Direct URL to the source, if applicable (e.g. regulator register page).' } },
        { name: 'archiveRef', type: 'text', admin: { description: 'Archive permalink (e.g. Wayback Machine), where practical.' } },
        { name: 'contentHash', type: 'text', admin: { description: 'Hash of the captured content, for integrity verification, where practical.' } },
        { name: 'accessDate', type: 'date', admin: { description: 'When the researcher reviewed/verified the source.' } },
        { name: 'capturedAt', type: 'date', admin: { description: 'When the evidence artifact itself (screenshot, log) was captured — may differ from accessDate.' } },
        { name: 'capturedBy', type: 'text', admin: { description: 'Who or what captured this evidence — a name or agent id.' } },
        {
          name: 'verificationStatus',
          type: 'select',
          defaultValue: 'unverified',
          options: [
            { label: 'Verified', value: 'verified' },
            { label: 'Corroborated', value: 'corroborated' },
            { label: 'Unverified', value: 'unverified' },
          ],
          required: true,
        },
        {
          name: 'isCurrent',
          type: 'checkbox',
          admin: { description: 'Whether this is still the active evidence for its claimKey, or has been superseded.' },
          defaultValue: true,
        },
        {
          name: 'supersedesEvidenceId',
          type: 'text',
          admin: { description: 'The id of the evidence row this entry replaces, if any (correction lineage).' },
        },
        {
          name: 'retractionReason',
          type: 'textarea',
          admin: { description: 'Why this evidence was retracted/superseded, if applicable.' },
        },
        { name: 'notes', type: 'textarea' },
      ],
    },
    {
      name: 'accountProfile',
      type: 'group',
      admin: {
        description:
          'Internal-only test-account metadata (CREDENTIAL-LOG.md). Never store passwords, 2FA seeds, or other secrets here — password manager only. This group holds labels/identifiers, not credentials.',
      },
      fields: [
        {
          name: 'liveChatAccountLabel',
          type: 'text',
          admin: { description: 'A description of the account used — never a username or password.' },

        },
        {
          name: 'emailTestAddress',
          type: 'text',
          admin: { description: 'The clean test address for the email channel, per CREDENTIAL-LOG.md convention.' },
        },
        {
          name: 'accountStatus',
          type: 'select',
          defaultValue: 'not-created',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Suspended', value: 'suspended' },
            { label: 'Closed', value: 'closed' },
            { label: 'Not created', value: 'not-created' },
          ],
        },
        { name: 'notes', type: 'textarea' },
      ],
    },
    {
      name: 'aiRuns',
      type: 'array',
      admin: {
        description:
          'Versioned AI agent run records for this case (§10 data-model foundation only — no chat route, provider integration, or frontend UI exists yet; nothing writes here).',
        readOnly: true,
      },
      fields: [
        { name: 'runId', type: 'text', admin: { description: 'Unique identifier for this run.' }, required: true },
        {
          name: 'agentRole',
          type: 'select',
          options: [
            { label: 'Desk Researcher', value: 'desk-researcher' },
            { label: 'Score Analyst', value: 'score-analyst' },
            { label: 'Editorial Writer', value: 'editorial-writer' },
            { label: 'Integrity Checker', value: 'integrity-checker' },
            { label: 'Monitor', value: 'monitor' },
            { label: 'Chat', value: 'chat' },
          ],
          required: true,
        },
        { name: 'version', type: 'number', defaultValue: 1, required: true },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Complete', value: 'complete' },
            { label: 'Failed', value: 'failed' },
          ],
          required: true,
        },
        { name: 'startedAt', type: 'date' },
        { name: 'completedAt', type: 'date' },
        { name: 'input', type: 'json', admin: { description: 'What was sent to the agent for this run.' } },
        { name: 'output', type: 'json', admin: { description: 'What the agent returned for this run.' } },
        {
          name: 'messages',
          type: 'array',
          admin: { description: 'Turn-by-turn record for this run.' },
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
      ],
    },
  ],
  hooks: {
    beforeChange: [enforceOptimisticVersion, enforceStatusTransition],
    afterChange: [syncOperatorKnownBrands, auditCaseFileChanges],
  },
  timestamps: true,
}
