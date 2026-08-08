import { describe, it, expect } from 'vitest'

import { cumulativeXpForLevel, levelFromXp, progressWithinLevel, rankTitleForLevel, xpRequiredForLevel } from '@/gamification/curve'
import {
  parseLabelAsNumber,
  requiredTurnover,
  validateCasinoFilterMatch,
  validateLicenseFieldMatch,
  validateQuizStep,
  validateWageringMathStep,
} from '@/gamification/validators'

describe('vex-ledger: XP curve', () => {
  it('xp_required(L) = floor(100 * L^1.5)', () => {
    expect(xpRequiredForLevel(1)).toBe(100)
    expect(xpRequiredForLevel(2)).toBe(Math.floor(100 * 2 ** 1.5)) // 282
    expect(xpRequiredForLevel(4)).toBe(Math.floor(100 * 4 ** 1.5)) // 800
  })

  it('level 1 is the floor; level rises only when cumulative XP is reached', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(cumulativeXpForLevel(3) - 1)).toBe(2)
    expect(levelFromXp(cumulativeXpForLevel(3))).toBe(3)
  })

  it('progressWithinLevel stays within 0..1', () => {
    expect(progressWithinLevel(0)).toBe(0)
    expect(progressWithinLevel(50)).toBeGreaterThan(0)
    expect(progressWithinLevel(100)).toBeLessThanOrEqual(1)
  })

  it('rank ladder maps level to canon title, capped at the top', () => {
    expect(rankTitleForLevel(1)).toBe('Street Scout')
    expect(rankTitleForLevel(2)).toBe('Odds Runner')
    expect(rankTitleForLevel(999)).toBe('Pit Boss Emeritus')
  })
})

describe('vex-ledger: validators', () => {
  const quizStep = {
    kind: 'quiz' as const,
    prompt: 'What multiplier?',
    options: [
      { key: 'a', label: '20×' },
      { key: 'b', label: '35×' },
      { key: 'c', label: '50×' },
    ],
    correctKey: 'b',
    rgExplain: 'The multiplier is in the terms.',
  }

  const mathStep = {
    kind: 'wagering_math' as const,
    prompt: 'Turnover?',
    bonusSlug: 'aurora-bay-100-match',
    depositAmount: 200,
    options: [
      { key: 'a', label: '€7,000' },
      { key: 'b', label: '€14,000' },
      { key: 'c', label: '€21,000' },
    ],
    rgExplain: 'Recheck the multiplier.',
  }

  const bonus35Combined = { wageringMultiplier: 35, wageringAppliesTo: 'bonus_plus_deposit' as const }
  const bonus20BonusOnly = { wageringMultiplier: 20, wageringAppliesTo: 'bonus_only' as const }

  it('quiz: correct key passes, wrong key fails with teaching beat', () => {
    expect(validateQuizStep(quizStep, 'b').pass).toBe(true)
    const fail = validateQuizStep(quizStep, 'a')
    if (fail.pass) throw new Error('expected failure')
    expect(fail.rgExplain).toBe('The multiplier is in the terms.')
  })

  it('quiz: "chase losses" answer style (a) grants 0 XP — pass is never implied', () => {
    const tiltStep = { ...quizStep, correctKey: 'c' }
    expect(validateQuizStep(tiltStep, 'a').pass).toBe(false)
  })

  it('wagering_math: 35× on bonus+deposit, €200 deposit ⇒ €14,000', () => {
    expect(requiredTurnover(bonus35Combined, 200)).toBe(14000)
    const ok = validateWageringMathStep(mathStep, bonus35Combined, 'b')
    if (!ok.pass) throw new Error('expected pass')
    expect(ok.correctValue).toBe(14000)
  })

  it('wagering_math: bonus_only doubles nothing (20× bonus-only ⇒ €4,000 on €200)', () => {
    const step = { ...mathStep, options: [{ key: 'a', label: '€4,000' }] }
    expect(requiredTurnover(bonus20BonusOnly, 200)).toBe(4000)
    expect(validateWageringMathStep(step, bonus20BonusOnly, 'a').pass).toBe(true)
  })

  it('wagering_math: wrong answer fails and cites the expected value', () => {
    const fail = validateWageringMathStep(mathStep, bonus35Combined, 'a')
    if (fail.pass) throw new Error('expected failure')
    expect(fail.rgExplain).toBe('Recheck the multiplier.')

    // Without a custom rgExplain, the default cites the computed value.
    const noExplain = { ...mathStep, rgExplain: undefined }
    const fallback = validateWageringMathStep(noExplain, bonus35Combined, 'a')
    if (fallback.pass) throw new Error('expected failure')
    expect(fallback.rgExplain).toContain('14,000')
  })

  it('wagering_math: fails closed when mission config drifts from bonus data', () => {
    const driftStep = { ...mathStep, options: [{ key: 'a', label: '€1' }] }
    expect(validateWageringMathStep(driftStep, bonus35Combined, 'a').pass).toBe(false)
  })

  it('parseLabelAsNumber handles currency formatting', () => {
    expect(parseLabelAsNumber('€14,000')).toBe(14000)
    expect(parseLabelAsNumber('$7,000')).toBe(7000)
    expect(parseLabelAsNumber('14000')).toBe(14000)
  })
})

describe('vex-ledger: license_field_match validator (Phase 4 F4.4)', () => {
  const step = {
    kind: 'license_field_match' as const,
    prompt: 'Who issued the licence?',
    reviewSlug: 'aurora-bay-casino',
    expectedField: 'licenseAuthority' as const,
    options: [
      { key: 'a', label: 'Kansspelautoriteit (KSA)' },
      { key: 'b', label: 'UK Gambling Commission' },
      { key: 'c', label: 'Spelinspektionen' },
    ],
    rgExplain: 'Check the licence line.',
  }
  const review = { compliance: { licenseAuthority: 'KSA', licenseNumber: 'SAMPLE-ABC' } }

  it('passes when the answer matches the LIVE review compliance field', () => {
    const ok = validateLicenseFieldMatch(step, review, 'a')
    if (!ok.pass) throw new Error('expected pass')
    expect(ok.correctValue).toBe('KSA')
  })

  it('fails on a wrong answer with the teaching beat', () => {
    const fail = validateLicenseFieldMatch(step, review, 'b')
    if (fail.pass) throw new Error('expected failure')
    expect(fail.rgExplain).toBe('Check the licence line.')
  })

  it('fails closed when the review doc is missing — never mints', () => {
    expect(validateLicenseFieldMatch(step, null, 'a').pass).toBe(false)
    expect(validateLicenseFieldMatch(step, undefined, 'a').pass).toBe(false)
  })

  it('fails closed when the expected field is absent', () => {
    const empty = { compliance: {} }
    expect(validateLicenseFieldMatch(step, empty, 'a').pass).toBe(false)
  })

  it('matches licenseNumber fields too (label contains the number)', () => {
    const numStep = {
      ...step,
      expectedField: 'licenseNumber' as const,
      options: [
        { key: 'a', label: 'SAMPLE-ABC (shown on the review)' },
        { key: 'b', label: 'SAMPLE-XYZ' },
      ],
    }
    const ok = validateLicenseFieldMatch(numStep, review, 'a')
    if (!ok.pass) throw new Error('expected pass')
    expect(ok.correctValue).toBe('SAMPLE-ABC')
  })

  it('normalizes labels and values (case + punctuation-insensitive)', () => {
    const spaced = { ...step, options: [{ key: 'a', label: 'KSA — the Dutch regulator' }] }
    expect(validateLicenseFieldMatch(spaced, review, 'a').pass).toBe(true)
  })
})

describe('vex-ledger: casino_filter_match validator (Phase 4 F4.4)', () => {
  const step = {
    kind: 'casino_filter_match' as const,
    prompt: 'Passes a 30× ceiling?',
    bonusSlug: 'aurora-bay-100-match',
    filter: { wageringLte: 30 },
    passKey: 'a',
    failKey: 'b',
    options: [
      { key: 'a', label: 'Passes the filter' },
      { key: 'b', label: 'Fails the filter' },
    ],
    rgExplain: 'Recheck the multiplier.',
  }

  it('Glass Cannon: 35× fails a wagering ≤ 30× filter (correctKey = failKey)', () => {
    const ok = validateCasinoFilterMatch(step, { wageringMultiplier: 35 }, 'b')
    if (!ok.pass) throw new Error('expected pass')
    expect(ok.correctValue).toBe('fail')
    // The 'passes' answer must be wrong here.
    expect(validateCasinoFilterMatch(step, { wageringMultiplier: 35 }, 'a').pass).toBe(false)
  })

  it('passes the filter when the multiplier is under the ceiling', () => {
    const ok = validateCasinoFilterMatch(step, { wageringMultiplier: 25 }, 'a')
    if (!ok.pass) throw new Error('expected pass')
    expect(ok.correctValue).toBe('pass')
  })

  it('boundary: a multiplier exactly at the ceiling passes', () => {
    expect(validateCasinoFilterMatch(step, { wageringMultiplier: 30 }, 'a').pass).toBe(true)
  })

  it('fails closed when the bonus doc is missing', () => {
    expect(validateCasinoFilterMatch(step, null, 'a').pass).toBe(false)
    expect(validateCasinoFilterMatch(step, undefined, 'a').pass).toBe(false)
  })

  it('fails closed when the filter carries no criteria', () => {
    const empty = { ...step, filter: {} }
    expect(validateCasinoFilterMatch(empty, { wageringMultiplier: 25 }, 'a').pass).toBe(false)
  })
})
