import type { RubricCategory } from './traditional'

/**
 * Crypto Casino grading rubric — mirrors
 * brands/01-playerside/categories/crypto-casino/grading-rubric.md
 * (v2 [LOCKED] — weights confirmed 2026-07-21). 9 categories, deliberately
 * different from Traditional (ORG.md §3.4) — license legitimacy split out
 * and weighted heavier, provably-fair and geo-compliance added. Changes are
 * an ORG.md "ask first".
 *
 * Community sentiment is deliberately absent — see traditional.ts's note;
 * same qualitative-context treatment, never scored. Per grading-rubric.md's
 * own annotation, this specific removal was extended to Crypto by analogy
 * with the Traditional decision rather than separately confirmed — treat as
 * provisional even though the rest of this rubric is locked.
 */
export const cryptoRubric: RubricCategory[] = [
  {
    key: 'licenseLegitimacy',
    label: 'License legitimacy',
    weight: 15,
    measures: 'Is the license real, current, and verifiable right now — not just claimed',
  },
  {
    key: 'promotions',
    label: 'Promotions & bonus transparency',
    weight: 15,
    measures: 'Exact terms, no exceptions — same bar as Traditional',
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    weight: 14,
    measures: 'Crypto withdrawal speed, network fees, caps, fiat off-ramp options',
  },
  {
    key: 'kycApproach',
    label: 'KYC / verification approach',
    weight: 14,
    measures: 'Clarity and consistency of the stated policy — not strictness itself',
  },
  {
    key: 'provablyFair',
    label: 'Provably-fair verification',
    weight: 10,
    measures: 'Verifiable fairness a user can actually check, not just a claim',
  },
  {
    key: 'support',
    label: 'Support',
    weight: 10,
    measures: 'Channels, response time, resolution quality',
  },
  {
    key: 'deposits',
    label: 'Deposits',
    weight: 8,
    measures: 'Supported chains/coins, minimums, confirmation-time requirements',
  },
  {
    key: 'gameVariety',
    label: 'Game variety',
    weight: 8,
    measures: 'Range and quality of games and providers',
  },
  {
    key: 'geoCompliance',
    label: 'Geo-compliance posture',
    weight: 6,
    measures: 'Does the operator itself exclude the regulated markets we do',
  },
]
