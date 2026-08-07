import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'

/**
 * vex-ledger: mission definitions. The `steps` field holds a JSON array of
 * validator configs (QuizStep | WageringMathStep from
 * src/gamification/validators.ts) — kept as JSON so the discriminated union
 * stays flexible, validated by pure functions at submit time.
 */
export const Quests: CollectionConfig<'quests'> = {
  slug: 'quests',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['missionId', 'title', 'rewardXp', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'missionId',
      type: 'text',
      admin: { description: 'Stable machine id, e.g. bonus_hunter. Unique per mission.' },
      required: true,
      unique: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'brief',
      type: 'textarea',
      admin: { description: 'One-paragraph player-facing brief (vex-canon copy).' },
      required: true,
    },
    {
      name: 'rewardXp',
      type: 'number',
      admin: { description: 'XP minted once, server-side, on full completion.' },
      defaultValue: 60,
      min: 0,
      required: true,
    },
    {
      name: 'pageTarget',
      type: 'select',
      admin: { description: 'Where this mission can be offered.' },
      options: [
        { label: 'Casino review', value: 'casino-review' },
        { label: 'Crypto review', value: 'crypto-review' },
        { label: 'Homepage', value: 'homepage' },
      ],
      defaultValue: 'casino-review',
      required: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      admin: { description: 'Feature flag for this mission (vex_enabled).' },
      defaultValue: false,
    },
    {
      name: 'steps',
      type: 'json',
      admin: {
        description:
          'QuestStep[] JSON — { kind: "quiz", options, correctKey, rgExplain } or { kind: "wagering_math", bonusSlug, depositAmount, options, rgExplain }. Answers are validated by src/gamification/validators.ts.',
      },
      required: true,
    },
  ],
  hooks: {
    afterChange: [
      ({ doc }) => {
        // Steps are machine-validated at submit; nothing to revalidate here.
        return doc
      },
    ],
  },
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
}
