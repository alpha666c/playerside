import type { RubricCategory } from '@/rubrics/traditional'

export type CategoryScore = {
  score?: number | null
  evidence?: string | null
  narrative?: string | null
}

/** Highest-scoring rubric categories — the "excels at" list for the verdict box. */
export const topStrengths = (
  scores: Record<string, CategoryScore | undefined>,
  rubric: RubricCategory[],
  n = 3,
): RubricCategory[] =>
  rubric
    .filter((c) => typeof scores[c.key]?.score === 'number')
    .sort((a, b) => (scores[b.key]?.score ?? 0) - (scores[a.key]?.score ?? 0))
    .slice(0, n)

/** Lowest-scoring category — the honest "the catch" line. */
export const weakestCategory = (
  scores: Record<string, CategoryScore | undefined>,
  rubric: RubricCategory[],
): RubricCategory | null =>
  rubric
    .filter((c) => typeof scores[c.key]?.score === 'number')
    .sort((a, b) => (scores[a.key]?.score ?? 0) - (scores[b.key]?.score ?? 0))[0] ?? null
