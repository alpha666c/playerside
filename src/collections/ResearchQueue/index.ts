import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import { authenticated } from '../../access/authenticated'
import { logEvent } from '@/lib/logEvent'

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

/** Blocks any status change that isn't a move to exactly the next stage — no skipping forward, no moving backward. */
const enforceStatusTransition: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
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
  const nextIndex = STAGES.indexOf(nextStatus)
  if (nextIndex !== prevIndex + 1) {
    throw new APIError(
      `Cannot move a case from "${prevStatus}" to "${nextStatus}" — cases move through exactly one stage at a time, in order (MASTER-BLUEPRINT.md §3: "No skipping"). Expected next stage: "${STAGES[prevIndex + 1] ?? '(none — monitoring is terminal)'}".`,
      400,
    )
  }
  return data
}

/** Top-level fields whose changes are audit-logged as `case_updated`. `status` gets its own dedicated `status_transition` event instead. */
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
  'chatHistory',
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

  const changedFields = MATERIAL_FIELDS.filter(
    (field) => JSON.stringify(previousDoc[field] ?? null) !== JSON.stringify(doc[field] ?? null),
  )
  if (changedFields.length > 0) {
    await logEvent(
      payload,
      {
        ...commonFields,
        event: 'case_updated',
        details: { caseNumber: doc.caseNumber, changedFields },
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
          'Structured evidence register — every fact this case relies on should trace to one entry here, sourced and labelled (DESK-RESEARCHER.md confidence convention).',
      },
      fields: [
        { name: 'label', type: 'text', admin: { description: 'What this evidence supports or verifies.' }, required: true },
        { name: 'mediaRef', type: 'relationship', admin: { description: 'Screenshot or upload, if applicable.' }, relationTo: 'media' },
        { name: 'sourceUrl', type: 'text', admin: { description: 'Direct URL to the source, if applicable (e.g. regulator register page).' } },
        { name: 'accessDate', type: 'date' },
        {
          name: 'verificationStatus',
          type: 'select',
          defaultValue: 'unverified',
          options: [
            { label: 'Verified', value: 'verified' },
            { label: 'Unverified', value: 'unverified' },
          ],
          required: true,
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
          admin: { description: 'A description of the account used, e.g. "Viktor\'s personal Stake account (Platinum 2)" — never a username or password.' },
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
      name: 'chatHistory',
      type: 'array',
      admin: {
        description:
          'AI chat panel history for this case (§10) — foundation field for Phase 2B; no chat UI or API route exists yet.',
        readOnly: true,
      },
      fields: [
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'User', value: 'user' },
            { label: 'Assistant', value: 'assistant' },
          ],
          required: true,
        },
        { name: 'message', type: 'textarea', required: true },
        { name: 'timestamp', type: 'date', defaultValue: () => new Date().toISOString(), required: true },
      ],
    },
  ],
  hooks: {
    beforeChange: [enforceStatusTransition],
    afterChange: [syncOperatorKnownBrands, auditCaseFileChanges],
  },
  timestamps: true,
}
