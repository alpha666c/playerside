import { describe, it, expect } from 'vitest'

import { computeWageringReality, formatEur } from '@/lib/wagering'
import { topStrengths, weakestCategory } from '@/lib/reviewVerdict'
import { traditionalRubric } from '@/rubrics/traditional'

/**
 * Phase 1 (review page 2.0) — pure logic behind the verdict box (F1.1) and
 * the bonus reality calculator (F1.5). No DB required.
 */
describe('Phase 1 F1.5: wagering reality math', () => {
  it('bonus + deposit combined: 35× on €200 deposit, 100% match ⇒ €14,000 turnover', () => {
    const r = computeWageringReality({
      deposit: 200,
      matchPercent: 100,
      multiplier: 35,
      appliesTo: 'bonus_plus_deposit',
    })
    expect(r.bonusAmount).toBe(200)
    expect(r.baseAmount).toBe(400)
    expect(r.requiredTurnover).toBe(14000)
  })

  it('bonus only: the multiplier applies to the bonus alone', () => {
    const r = computeWageringReality({
      deposit: 200,
      matchPercent: 100,
      multiplier: 20,
      appliesTo: 'bonus_only',
    })
    expect(r.bonusAmount).toBe(200)
    expect(r.baseAmount).toBe(200)
    expect(r.requiredTurnover).toBe(4000)
  })

  it('clamps deposit to ≥0 and match to 0..200 (no invented numbers)', () => {
    const r = computeWageringReality({
      deposit: -50,
      matchPercent: 999,
      multiplier: 10,
      appliesTo: 'bonus_only',
    })
    expect(r.bonusAmount).toBe(0)
    expect(r.requiredTurnover).toBe(0)
  })

  it('formatEur renders thousands separators', () => {
    expect(formatEur(14000)).toBe('€14,000')
  })
})

describe('Phase 1 F1.1: verdict derivation', () => {
  const scores = {
    promotions: { score: 9 },
    licensing: { score: 6 },
    support: { score: 8 },
    withdrawals: { score: 7 },
  }

  it('topStrengths returns the highest-scoring categories, in order', () => {
    const top = topStrengths(scores, traditionalRubric, 2)
    expect(top[0].key).toBe('promotions')
    expect(top[1].key).toBe('support')
  })

  it('weakestCategory returns the lowest-scoring category (the catch)', () => {
    const weak = weakestCategory(scores, traditionalRubric)
    expect(weak?.key).toBe('licensing')
  })

  it('handles partial score sets gracefully', () => {
    const partial = { promotions: { score: 8 } }
    expect(weakestCategory(partial, traditionalRubric)?.key).toBe('promotions')
    expect(topStrengths(partial, traditionalRubric, 3)).toHaveLength(1)
  })
})
