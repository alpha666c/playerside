/**
 * Traditional Casino grading rubric — single source of truth for the CMS
 * collection config, the homepage methodology section, and review pages.
 * Mirrors brands/01-playerside/categories/traditional/grading-rubric.md
 * (v1 [DRAFT] — categories locked, weights open for revision). Any change to
 * categories or weights is an ORG.md "ask first", not an edit.
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
    key: 'withdrawals',
    label: 'Withdrawals',
    weight: 15,
    measures: 'Methods offered, stated vs. actual processing time, any withdrawal caps',
  },
  {
    key: 'promotions',
    label: 'Promotions & bonus transparency',
    weight: 15,
    measures: 'How exactly and completely bonus terms are stated — not just how generous',
  },
  {
    key: 'support',
    label: 'Support',
    weight: 12,
    measures: 'Channels, response time, resolution quality, language coverage',
  },
  {
    key: 'licensing',
    label: 'Licensing & regulatory standing',
    weight: 12,
    measures: 'Current license status, past sanctions, complaint-resolution record',
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
    weight: 10,
    measures: 'Number and range of games, provider diversity, RTP transparency',
  },
  {
    key: 'liveCasino',
    label: 'Live casino quality',
    weight: 8,
    measures: 'Studio quality, dealer languages, table limits, uptime',
  },
  {
    key: 'deposits',
    label: 'Deposits',
    weight: 8,
    measures: 'Methods offered, minimums, processing speed, fees',
  },
  {
    key: 'communitySentiment',
    label: 'Community sentiment',
    weight: 8,
    measures: 'Independent player sentiment, recency-weighted, fake-review-discounted',
  },
]
