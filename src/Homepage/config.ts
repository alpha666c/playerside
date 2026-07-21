import type { GlobalConfig } from 'payload'

import { revalidateHomepage } from './hooks/revalidateHomepage'

// Homepage-scoped marketing content only. Deliberately NOT a review/operator
// content type — the three "sampleOperators" below are illustrative, clearly
// fictional placeholders used to show what a Playerside review looks like
// (seal + score + evidence citation), reused compactly in the hero card stack
// and in full in the sample-reviews grid. Real review content types are
// separately-scoped future work.
export const Homepage: GlobalConfig = {
  slug: 'homepage',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Content',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'heroEyebrow',
              type: 'text',
              defaultValue: 'Commission-blind casino reviews',
            },
            {
              name: 'heroHeadline',
              type: 'textarea',
              defaultValue: "The review site that isn't secretly working for the casinos.",
            },
            {
              name: 'heroSubhead',
              type: 'textarea',
              defaultValue:
                'Every score traces back to logged evidence. Every bonus term is spelled out exactly — wagering, withdrawal caps, expiry, all of it. No "terms apply."',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'heroPrimaryCtaLabel',
                  type: 'text',
                  defaultValue: 'See how we grade',
                  admin: { width: '50%' },
                },
                {
                  name: 'heroPrimaryCtaHref',
                  type: 'text',
                  defaultValue: '/#method',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'heroSecondaryCtaLabel',
                  type: 'text',
                  defaultValue: 'Read the wall',
                  admin: { width: '50%' },
                },
                {
                  name: 'heroSecondaryCtaHref',
                  type: 'text',
                  defaultValue: '/#wall',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'stats',
              type: 'array',
              minRows: 1,
              maxRows: 4,
              defaultValue: [
                { value: '0', label: 'Commission data seen by graders' },
                { value: '8', label: 'Graded categories per operator' },
                { value: '100%', label: 'Bonus terms stated exactly' },
              ],
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'value', type: 'text', required: true, admin: { width: '35%' } },
                    { name: 'label', type: 'text', required: true, admin: { width: '65%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Sample operators',
          description:
            'Illustrative, clearly fictional placeholder operators — never real casino brands, licenses, or scores. Shown compactly in the hero card stack and in full in the sample-reviews grid.',
          fields: [
            {
              name: 'sampleOperators',
              type: 'array',
              minRows: 1,
              maxRows: 3,
              defaultValue: [
                {
                  name: 'Aurora Bay Casino',
                  score: 9.1,
                  market: 'licensed, NL',
                  evidenceNote: 'Withdrawal timing verified via test account, 07 Jul 2026',
                },
                {
                  name: 'Northlight Casino',
                  score: 8.7,
                  market: 'licensed, UK',
                  evidenceNote: 'Bonus T&Cs cross-checked against live account, 12 Jul 2026',
                },
                {
                  name: 'Ferrous Casino',
                  score: 7.4,
                  market: 'licensed, SE',
                  evidenceNote: 'Support response time logged across 3 contacts, 09 Jul 2026',
                },
              ],
              admin: {
                components: {
                  RowLabel: '@/Homepage/RowLabel#RowLabel',
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'market', type: 'text', required: true, admin: { width: '25%' } },
                    {
                      name: 'score',
                      type: 'number',
                      required: true,
                      min: 0,
                      max: 10,
                      admin: { width: '25%', step: 0.1 },
                    },
                  ],
                },
                {
                  name: 'evidenceNote',
                  type: 'text',
                  required: true,
                  label: 'Evidence citation',
                },
              ],
            },
          ],
        },
        {
          label: 'Closing CTA',
          fields: [
            {
              name: 'ctaHeading',
              type: 'text',
              defaultValue: 'This is the foundation. The reviews come next.',
            },
            {
              name: 'ctaSubtext',
              type: 'text',
              defaultValue:
                'Playerside — commission-blind, evidence-logged, exact about the terms that matter.',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ctaButtonLabel',
                  type: 'text',
                  defaultValue: 'Get notified at launch',
                  admin: { width: '50%' },
                },
                {
                  name: 'ctaButtonHref',
                  type: 'text',
                  defaultValue: '/#reviews',
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHomepage],
  },
}
