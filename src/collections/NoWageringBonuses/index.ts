import type { CollectionConfig } from 'payload'

import { revalidatePath } from 'next/cache'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { bonusCoreFields } from '../shared/bonusFields'
import { enforcePublishCompliance } from '../shared/publishGate'

/**
 * No-deposit / wager-free bonuses. Traditional Casino category only for
 * Phase A (ORG.md §3.4). "No wagering" does not mean "no terms" — every
 * field here is still exact, never a filter tag standing in for content
 * (see brief §3). Traditional/Crypto Casino category separation applies
 * equally here — a deliberately distinct collection, never a shared type
 * or listing with WageringBonuses or crypto bonus content.
 */
export const NoWageringBonuses: CollectionConfig<'no-wagering-bonuses'> = {
  slug: 'no-wagering-bonuses',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'operator', 'bonusAmount', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    ...bonusCoreFields(),
    {
      name: 'bonusAmount',
      type: 'text',
      admin: { description: 'Exact amount or spins, e.g. "€25 no-deposit" or "50 free spins".' },
      required: true,
    },
    {
      name: 'withdrawalConditions',
      type: 'textarea',
      admin: {
        description:
          'Even wager-free, winnings usually still have conditions before cashout (e.g. minimum deposit to unlock withdrawal, verification requirements). State them exactly, or state explicitly that none apply.',
      },
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
        'bonusAmount',
        'withdrawalConditions',
      ]),
    ],
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/bonuses/no-wagering')
          revalidatePath(`/bonuses/no-wagering/${doc.slug}`)
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) {
          revalidatePath('/bonuses/no-wagering')
          revalidatePath(`/bonuses/no-wagering/${doc.slug}`)
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
