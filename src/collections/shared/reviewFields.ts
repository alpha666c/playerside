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
