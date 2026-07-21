import type { CollectionConfig } from 'payload'

import { revalidatePath } from 'next/cache'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { cryptoRubric } from '@/rubrics/crypto'
import { enforcePublishCompliance } from '../shared/publishGate'
import { computeOverallScore, reviewCoreFields, scoreFields } from '../shared/reviewFields'

/**
 * Crypto Casino reviews — global/offshore operators, explicitly excluded
 * from NL/SE/DE/UK targeting (categories/crypto-casino/spec.md). A
 * deliberately separate collection from TraditionalCasinoReviews (ORG.md
 * §3.4): distinct type, distinct /crypto-casinos/* namespace, never a
 * shared listing or a category flag with Traditional.
 *
 * §3.2: this collection must never contain commission or deal-term fields.
 */
export const CryptoCasinoReviews: CollectionConfig<'crypto-casino-reviews'> = {
  slug: 'crypto-casino-reviews',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'overallScore', 'licenseAuthority', '_status', 'updatedAt'],
    useAsTitle: 'name',
  },
  defaultPopulate: {
    name: true,
    slug: true,
    overallScore: true,
    summary: true,
    isIllustrativeSample: true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'compliance',
      type: 'group',
      fields: [
        {
          name: 'licenseNumber',
          type: 'text',
          admin: {
            description:
              'Displayed on the page, verified against the live regulator register (spec.md). Illustrative samples use an obviously-non-real SAMPLE-format.',
          },
          required: true,
        },
        {
          name: 'licenseAuthority',
          type: 'text',
          admin: { description: 'e.g. Curaçao GCB. Verified at scoring time, not onboarding.' },
          required: true,
        },
        {
          name: 'notLicensedInRegulatedMarkets',
          type: 'checkbox',
          admin: {
            description:
              'Must be checked — explicit statement this operator/content is not directed at NL/SE/DE/UK (spec.md hard exclusion).',
          },
          required: true,
          validate: (value: boolean | null | undefined) =>
            value === true || 'Required — Crypto Casino content may never target NL/SE/DE/UK.',
        },
        {
          name: 'provablyFairInfo',
          type: 'text',
          admin: { description: 'How a user can verify fairness themselves, if offered.' },
        },
      ],
    },
    scoreFields(cryptoRubric),
    ...reviewCoreFields(),
    slugField(),
  ],
  hooks: {
    beforeValidate: [
      enforcePublishCompliance([
        'compliance.licenseNumber',
        'compliance.licenseAuthority',
        'compliance.notLicensedInRegulatedMarkets',
        'summary',
        'verdict.narrative',
      ]),
    ],
    beforeChange: [computeOverallScore(cryptoRubric)],
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/crypto-casinos')
          revalidatePath(`/crypto-casinos/${doc.slug}`)
          revalidatePath('/reviews')
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/crypto-casinos')
          revalidatePath(`/crypto-casinos/${doc.slug}`)
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
