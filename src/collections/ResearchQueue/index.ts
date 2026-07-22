import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

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
    const prevOperator = await payload.findByID({ id: prevOperatorId, collection: 'operators' }).catch(() => null)
    if (prevOperator) {
      const knownBrands = extractIds(prevOperator.knownBrands)
      await payload.update({
        id: prevOperatorId,
        collection: 'operators',
        context: { disableRevalidate: true },
        data: { knownBrands: knownBrands.filter((id) => id !== doc.id) },
      })
    }
  }

  if (nextOperatorId) {
    const nextOperator = await payload.findByID({ id: nextOperatorId, collection: 'operators' }).catch(() => null)
    if (nextOperator) {
      const knownBrands = extractIds(nextOperator.knownBrands)
      if (!knownBrands.includes(doc.id)) {
        await payload.update({
          id: nextOperatorId,
          collection: 'operators',
          context: { disableRevalidate: true },
          data: { knownBrands: [...knownBrands, doc.id] },
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
  ],
  hooks: {
    afterChange: [syncOperatorKnownBrands],
  },
  timestamps: true,
}
