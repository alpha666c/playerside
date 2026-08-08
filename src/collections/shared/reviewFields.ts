import type { CollectionBeforeChangeHook, Field } from 'payload'

import type { RubricCategory } from '@/rubrics/traditional'

/**
 * Shared field factories for the two review collections. The collections
 * themselves stay structurally separate (ORG.md §3.4 — distinct types,
 * distinct URL namespaces); only the *shape* of a scored category is shared,
 * exactly as the rubrics share a shape on paper.
 *
 * §3.2: neither factory may ever grow a commission/deal-term field. Grading
 * data and commercial data do not share a collection, an API, or a screen.
 */

/** One group per rubric category: score (0–10), evidence reference, narrative. */
export const scoreFields = (rubric: RubricCategory[]): Field => ({
  name: 'scores',
  type: 'group',
  label: 'Category scores',
  fields: rubric.map(
    (category): Field => ({
      name: category.key,
      type: 'group',
      label: `${category.label} — ${category.weight}%`,
      fields: [
        {
          name: 'score',
          type: 'number',
          admin: { description: category.measures, step: 0.1 },
          max: 10,
          min: 0,
          required: true,
        },
        {
          name: 'evidence',
          type: 'text',
          admin: {
            description:
              'Logged evidence reference — a number with no traceable source is not a valid score.',
          },
          required: true,
        },
        {
          name: 'narrative',
          type: 'textarea',
          admin: {
            description:
              'The honest assessment for this category — what is actually good and actually bad.',
          },
          required: true,
        },
      ],
    }),
  ),
})

/** Recomputes the weighted overall score from the category scores on every save. */
export const computeOverallScore =
  (rubric: RubricCategory[]): CollectionBeforeChangeHook =>
  ({ data }) => {
    const scores = data?.scores
    if (!scores) return data
    let total = 0
    let weightCovered = 0
    for (const category of rubric) {
      const score = scores[category.key]?.score
      if (typeof score === 'number') {
        total += score * category.weight
        weightCovered += category.weight
      }
    }
    data.overallScore = weightCovered > 0 ? Math.round((total / weightCovered) * 10) / 10 : null
    return data
  }

/**
 * MASTER-BLUEPRINT.md §6 — Claims vs Reality. Claimed/measured pairs for the
 * four standardized hands-on tests. Both sides of each pair are optional:
 * an untested field stays NULL and the public page renders "Not yet tested —
 * pending hands-on verification" instead of a fabricated number (§6: no
 * guessing, no estimating). The verdict (met / partial / missed) is DERIVED
 * by src/lib/claimsVsReality.ts — never hand-set, like overallScore.
 */
export const claimsVsRealityFields = (): Field => ({
  name: 'claimsVsReality',
  type: 'group',
  label: 'Claims vs reality (blueprint §6)',
  admin: {
    description:
      'What the operator claims vs what our standardized hands-on tests actually measured. Leave measured blank until tested — never estimate.',
  },
  fields: [
    {
      name: 'withdrawal',
      type: 'group',
      label: 'Withdrawal speed',
      fields: [
        {
          name: 'claimedHours',
          type: 'number',
          admin: { description: 'Stated processing time, in hours.' },
          min: 0,
        },
        {
          name: 'measuredHours',
          type: 'number',
          admin: { description: 'Actual elapsed time in the standardized withdrawal test, in hours.' },
          min: 0,
        },
      ],
    },
    {
      name: 'support',
      type: 'group',
      label: 'Support response (live chat)',
      fields: [
        {
          name: 'claimedMinutes',
          type: 'number',
          admin: { description: 'Stated response time, in minutes.' },
          min: 0,
        },
        {
          name: 'measuredMinutes',
          type: 'number',
          admin: { description: 'Time to first HUMAN response in the RG live-chat test, in minutes.' },
          min: 0,
        },
      ],
    },
    {
      name: 'kyc',
      type: 'group',
      label: 'KYC turnaround',
      fields: [
        {
          name: 'claimedDays',
          type: 'number',
          admin: { description: 'Stated verification time, in days.' },
          min: 0,
        },
        {
          name: 'measuredDays',
          type: 'number',
          admin: { description: 'Actual approval time in the standardized KYC test, in days.' },
          min: 0,
        },
      ],
    },
    {
      name: 'bonus',
      type: 'group',
      label: 'Bonus wagering',
      fields: [
        {
          name: 'claimedWager',
          type: 'number',
          admin: { description: 'Stated wagering requirement, e.g. 35 for 35×.' },
          min: 0,
        },
        {
          name: 'measuredWager',
          type: 'number',
          admin: { description: 'Actual wagering requirement faced in the standardized bonus test.' },
          min: 0,
        },
      ],
    },
  ],
})

/** Fields every review shares outside the scoring block. */
export const reviewCoreFields = (): Field[] => [
  {
    name: 'summary',
    type: 'textarea',
    admin: { description: 'One-paragraph plain-language summary shown on listings.' },
    required: true,
  },
  {
    name: 'verdict',
    type: 'group',
    fields: [
      {
        name: 'whatsGood',
        type: 'array',
        fields: [{ name: 'point', type: 'text', required: true }],
        minRows: 1,
        required: true,
      },
      {
        name: 'whatsBad',
        type: 'array',
        admin: {
          description:
            'Required, minimum one row — a review with nothing bad to say is not finished.',
        },
        fields: [{ name: 'point', type: 'text', required: true }],
        minRows: 1,
        required: true,
      },
      { name: 'narrative', type: 'textarea', required: true },
    ],
  },
  {
    name: 'overallScore',
    type: 'number',
    admin: {
      description: 'Computed from category scores × rubric weights — never hand-set.',
      position: 'sidebar',
      readOnly: true,
    },
  },
  {
    name: 'communitySentimentNote',
    type: 'textarea',
    admin: {
      description:
        'Qualitative context only (grading-rubric.md "Qualitative context" section) — independent player sentiment, shown next to the score but never counted toward it. Deliberately a sibling of `scores`, not a member of it, so it is structurally impossible for computeOverallScore to read it.',
    },
  },
  {
    name: 'isIllustrativeSample',
    type: 'checkbox',
    admin: {
      description:
        'Renders a prominent "illustrative sample, not a real operator" banner. Stays on until a page describes a real onboarded operator with real logged evidence.',
      position: 'sidebar',
    },
    defaultValue: false,
  },
]
