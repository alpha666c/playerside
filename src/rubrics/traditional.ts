/**
 * Traditional Casino grading rubric — single source of truth for the CMS
 * collection config, the homepage methodology section, and review pages.
 * Mirrors brands/01-playerside/categories/traditional/grading-rubric.md
 * (v2 [LOCKED] — weights confirmed by Viktor 2026-07-21). Any future change
 * to categories or weights is an ORG.md "ask first", not an edit.
 *
 * Community sentiment is deliberately absent — locked out of the scored set
 * per the grading-rubric.md v2 decision. It's tracked as qualitative,
 * display-only context (see `communitySentimentNote` on the review
 * collections / reviewFields.ts), never as an input to `overallScore`.
 *
 * §3.2 note: this file describes how grading works. Nothing in this codebase
 * may ever hold or receive commission/deal-term data alongside it.
 */
export type RubricCategory = {
  key: string
  label: string
  weight: number
  measures: string
}

export const traditionalRubric: RubricCategory[] = [
  {
    key: 'promotions',
    label: 'Promotions & bonus transparency',
    weight: 18,
    measures: 'How exactly and completely bonus terms are stated — not just how generous',
  },
  {
    key: 'licensing',
    label: 'Licensing & regulatory standing',
    weight: 14,
    measures: 'Current license status, past sanctions, complaint-resolution record',
  },
  {
    key: 'support',
    label: 'Support',
    weight: 14,
    measures: 'Channels, response time, resolution quality, language coverage',
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    weight: 12,
    measures: 'Methods offered, stated vs. actual processing time, any withdrawal caps',
  },
  {
    key: 'kyc',
    label: 'KYC process',
    weight: 12,
    measures: 'Speed, document requirements, clarity of what is needed upfront',
  },
  {
    key: 'gameVariety',
    label: 'Game variety',
    weight: 12,
    measures: 'Number and range of games, provider diversity, RTP transparency',
  },
  {
    key: 'deposits',
    label: 'Deposits',
    weight: 10,
    measures: 'Methods offered, minimums, processing speed, fees',
  },
  {
    key: 'liveCasino',
    label: 'Live casino quality',
    weight: 8,
    measures: 'Studio quality, dealer languages, table limits, uptime',
  },
]
