import type { Field } from 'payload'

/** Fields shared by both bonus collections — everything a compliant bonus page needs, no "terms apply" substitute. */
export const bonusCoreFields = (): Field[] => [
  { name: 'title', type: 'text', required: true },
  {
    name: 'operator',
    type: 'relationship',
    admin: { description: 'The reviewed operator this bonus belongs to.' },
    relationTo: 'traditional-casino-reviews',
    required: true,
  },
  {
    name: 'summary',
    type: 'textarea',
    admin: { description: 'Plain-language summary — the exact terms still live in the fields below.' },
    required: true,
  },
  {
    name: 'eligibility',
    type: 'textarea',
    admin: { description: 'Who qualifies — new players only, region restrictions, deposit method restrictions, etc.' },
    required: true,
  },
  {
    name: 'expiry',
    type: 'text',
    admin: { description: 'Exact time limit to claim the bonus itself (separate from wagering clearance time, if applicable).' },
    required: true,
  },
  {
    name: 'maxWithdrawal',
    type: 'text',
    admin: { description: 'Exact maximum withdrawal from bonus winnings, if capped. State "uncapped" explicitly if true — never leave blank.' },
    required: true,
  },
  {
    name: 'isIllustrativeSample',
    type: 'checkbox',
    admin: {
      description: 'Renders a prominent "illustrative sample, not a real offer" banner.',
      position: 'sidebar',
    },
    defaultValue: false,
  },
]
