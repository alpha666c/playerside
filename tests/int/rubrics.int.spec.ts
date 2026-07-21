import { describe, expect, it } from 'vitest'

import { computeOverallScore } from '@/collections/shared/reviewFields'
import { cryptoRubric } from '@/rubrics/crypto'
import { traditionalRubric } from '@/rubrics/traditional'

/**
 * Verifies the locked rubric weights (grading-rubric.md v2, 2026-07-21) are
 * correctly reflected in code, and that Community sentiment — removed from
 * scoring per that decision — cannot silently feed the computed score, even
 * defensively against stray/legacy data.
 */

const sumWeights = (rubric: { weight: number }[]) =>
  Math.round(rubric.reduce((total, category) => total + category.weight, 0) * 100) / 100

describe('Traditional Casino rubric', () => {
  it('has exactly 8 categories', () => {
    expect(traditionalRubric).toHaveLength(8)
  })

  it('weights sum to exactly 100', () => {
    expect(sumWeights(traditionalRubric)).toBe(100)
  })

  it('does not include communitySentiment', () => {
    expect(traditionalRubric.some((c) => c.key === 'communitySentiment')).toBe(false)
  })
})

describe('Crypto Casino rubric', () => {
  it('has exactly 9 categories', () => {
    expect(cryptoRubric).toHaveLength(9)
  })

  it('weights sum to exactly 100', () => {
    expect(sumWeights(cryptoRubric)).toBe(100)
  })

  it('does not include communitySentiment', () => {
    expect(cryptoRubric.some((c) => c.key === 'communitySentiment')).toBe(false)
  })
})

describe('computeOverallScore', () => {
  it('computes a correct weighted average for a full set of Traditional scores', () => {
    const data: Record<string, unknown> = {
      scores: Object.fromEntries(traditionalRubric.map((c) => [c.key, { score: 8 }])),
    }
    computeOverallScore(traditionalRubric)({ data } as never)
    // Every category scored 8 — weighted average of a uniform score is that score, regardless of weights.
    expect(data.overallScore).toBe(8)
  })

  it('a stray legacy communitySentiment score does not change the computed result', () => {
    const baseScores = Object.fromEntries(traditionalRubric.map((c, i) => [c.key, { score: 5 + i }]))

    const clean: Record<string, unknown> = { scores: { ...baseScores } }
    computeOverallScore(traditionalRubric)({ data: clean } as never)

    const withStrayCommunitySentiment: Record<string, unknown> = {
      scores: { ...baseScores, communitySentiment: { score: 10 } },
    }
    computeOverallScore(traditionalRubric)({ data: withStrayCommunitySentiment } as never)

    expect(withStrayCommunitySentiment.overallScore).toBe(clean.overallScore)
  })

  it('produces the same result for the Crypto rubric regardless of a stray communitySentiment score', () => {
    const baseScores = Object.fromEntries(cryptoRubric.map((c, i) => [c.key, { score: 4 + i }]))

    const clean: Record<string, unknown> = { scores: { ...baseScores } }
    computeOverallScore(cryptoRubric)({ data: clean } as never)

    const withStray: Record<string, unknown> = {
      scores: { ...baseScores, communitySentiment: { score: 0 } },
    }
    computeOverallScore(cryptoRubric)({ data: withStray } as never)

    expect(withStray.overallScore).toBe(clean.overallScore)
  })
})
