import { traditionalRubric } from '@/rubrics/traditional'

/**
 * Homepage methodology display — derived directly from `traditionalRubric`
 * (the single source of truth, mirroring
 * brands/01-playerside/categories/traditional/grading-rubric.md, v2
 * [LOCKED] 2026-07-21) rather than a hand-copied duplicate, so this display
 * can't silently drift from the rubric the way the old hardcoded constant
 * did. Two columns of four, in rubric (descending-weight) order.
 */
export const methodologyColumns: { label: string; weight: number }[][] = [
  traditionalRubric.slice(0, 4).map(({ label, weight }) => ({ label, weight })),
  traditionalRubric.slice(4).map(({ label, weight }) => ({ label, weight })),
]
