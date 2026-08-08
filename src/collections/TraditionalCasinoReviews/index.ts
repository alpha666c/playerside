import type { CollectionConfig } from 'payload'

import { revalidatePath } from 'next/cache'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { traditionalRubric } from '@/rubrics/traditional'
import { enforcePublishCompliance } from '../shared/publishGate'
import { claimsVsRealityFields, computeOverallScore, reviewCoreFields, scoreFields } from '../shared/reviewFields'

/**
 * Traditional Casino reviews — licensed operators, NL/SE/DE/UK only
 * (categories/traditional/spec.md). A deliberately separate collection from
 * CryptoCasinoReviews (ORG.md §3.4): distinct type, distinct /casinos/*
 * namespace, never a shared listing or a category flag.
 *
 * Compliance (§3.3) is a hard publish gate: drafts save freely, but
 * publishing runs full validation, so a review cannot go live without its
 * license number/authority, markets, scores, evidence, and verdict. The
 * page-level constants (18+ notice, affiliate disclosure, self-exclusion
 * link per market) are enforced by the route template itself, which renders
 * them unconditionally — structural, not editorial.
 *
 * §3.2: this collection must never contain commission or deal-term fields.
 */
export const TraditionalCasinoReviews: CollectionConfig<'traditional-casino-reviews'> = {
  slug: 'traditional-casino-reviews',
  dbName: 'trad_casino_reviews',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'overallScore', 'markets', '_status', 'updatedAt'],
    useAsTitle: 'name',
  },
  defaultPopulate: {
    name: true,
    slug: true,
    overallScore: true,
    summary: true,
    markets: true,
    isIllustrativeSample: true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'markets',
      type: 'select',
      admin: {
        description:
          'Markets where this operator holds the required national license. Never list an operator here without one (spec.md).',
      },
      hasMany: true,
      options: [
        { label: 'Netherlands (KSA)', value: 'nl' },
        { label: 'Sweden (Spelinspektionen)', value: 'se' },
        { label: 'Germany (GGL)', value: 'de' },
        { label: 'United Kingdom (UKGC)', value: 'uk' },
      ],
      required: true,
    },
    {
      name: 'compliance',
      type: 'group',
      fields: [
        {
          name: 'licenseNumber',
          type: 'text',
          admin: {
            description:
              'Displayed on the page, not just linked (spec.md). Illustrative samples use an obviously-non-real SAMPLE-format.',
          },
          required: true,
        },
        {
          name: 'licenseAuthority',
          type: 'select',
          enumName: 'trad_license_authority',
          options: [
            { label: 'Kansspelautoriteit (KSA)', value: 'KSA' },
            { label: 'Spelinspektionen', value: 'Spelinspektionen' },
            { label: 'Gemeinsame Glücksspielbehörde der Länder (GGL)', value: 'GGL' },
            { label: 'UK Gambling Commission (UKGC)', value: 'UKGC' },
          ],
          required: true,
        },
      ],
    },
    scoreFields(traditionalRubric),
    ...reviewCoreFields(),
    claimsVsRealityFields(),
    slugField(),
  ],
  hooks: {
    beforeValidate: [
      enforcePublishCompliance([
        'markets',
        'compliance.licenseNumber',
        'compliance.licenseAuthority',
        'summary',
        'verdict.narrative',
      ]),
    ],
    beforeChange: [computeOverallScore(traditionalRubric)],
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/casinos')
          revalidatePath(`/casinos/${doc.slug}`)
          revalidatePath('/reviews')
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/casinos')
          revalidatePath(`/casinos/${doc.slug}`)
          revalidatePath('/reviews')
        }
        return doc
      },
    ],
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
