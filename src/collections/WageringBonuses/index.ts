import type { CollectionConfig } from 'payload'

import { revalidatePath } from 'next/cache'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { bonusCoreFields } from '../shared/bonusFields'
import { enforcePublishCompliance } from '../shared/publishGate'

/**
 * Deposit-linked bonuses with a wagering requirement. Traditional Casino
 * category only for Phase A (ORG.md §3.4 — crypto bonuses get their own
 * namespace when Crypto Casino bonus content is built).
 *
 * spec.md's highest-scrutiny content type: exact multiplier, exact
 * applies-to (bonus only vs. bonus+deposit), exact cap, exact clearance
 * window, exact contributing games — never "terms apply" as a substitute
 * for any of these (ORG.md §3.5).
 */
export const WageringBonuses: CollectionConfig<'wagering-bonuses'> = {
  slug: 'wagering-bonuses',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'operator', 'wageringMultiplier', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    ...bonusCoreFields(),
    {
      name: 'wageringMultiplier',
      type: 'number',
      admin: { description: 'e.g. 35 for a 35x requirement.' },
      required: true,
    },
    {
      name: 'wageringAppliesTo',
      type: 'select',
      admin: { description: 'What the multiplier is calculated against.' },
      options: [
        { label: 'Bonus amount only', value: 'bonus_only' },
        { label: 'Bonus + deposit combined', value: 'bonus_plus_deposit' },
      ],
      required: true,
    },
    {
      name: 'wageringTimeLimit',
      type: 'text',
      admin: { description: 'Exact time limit to clear the wagering requirement, e.g. "30 days from credit".' },
      required: true,
    },
    {
      name: 'contributingGames',
      type: 'array',
      admin: { description: 'Which games count toward wagering, and at what rate — required per game category, not a blanket "all games".' },
      fields: [
        { name: 'gameCategory', type: 'text', required: true },
        { name: 'contributionPercent', type: 'number', max: 100, min: 0, required: true },
      ],
      minRows: 1,
      required: true,
    },
    slugField(),
  ],
  hooks: {
    beforeValidate: [
      enforcePublishCompliance([
        'operator',
        'eligibility',
        'expiry',
        'maxWithdrawal',
        'wageringMultiplier',
        'wageringAppliesTo',
        'wageringTimeLimit',
      ]),
    ],
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/bonuses/wagering')
          revalidatePath(`/bonuses/wagering/${doc.slug}`)
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/bonuses/wagering')
          revalidatePath(`/bonuses/wagering/${doc.slug}`)
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
