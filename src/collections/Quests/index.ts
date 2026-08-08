import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

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
    // REST read is admin-only (FIX-01, audit 2026-08-07): the raw `steps`
    // JSON contains correctKey / bonusSlug / rgExplain, so a public read of
    // published docs would leak every mission's answers via Payload's default
    // /api/quests surface. Public mission data flows ONLY through the
    // sanitized /api/gamification/* endpoints, which call with
    // overrideAccess: true and are unaffected by this restriction.
    read: authenticated,
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
