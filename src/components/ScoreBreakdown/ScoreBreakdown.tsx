import React from 'react'

import type { RubricCategory } from '@/rubrics/traditional'

type CategoryScore = {
  score?: number | null
  evidence?: string | null
  narrative?: string | null
}

/**
 * Full per-category breakdown for a review page — the "9 categories, each
 * with its evidence citation, plus genuine narrative assessment" the brief
 * calls for. Reuses the same RubricCategory shape as the homepage
 * methodology bars, so the rubric itself has one definition (src/rubrics).
 */
export const ScoreBreakdown: React.FC<{
  rubric: RubricCategory[]
  scores: Record<string, CategoryScore | undefined>
}> = ({ rubric, scores }) => (
  <div className="space-y-5">
    {rubric.map((category) => {
      const entry = scores[category.key]
      if (!entry) return null
      return (
        <div className="rounded-[var(--radius)] border border-line bg-dusk p-5 sm:p-6" key={category.key}>
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-[15px] font-semibold text-paper sm:text-base">{category.label}</h3>
            <span className="font-mono text-lg text-gold sm:text-xl">
              {entry.score?.toFixed(1) ?? '—'}
              <span className="text-[11px] text-paper-dim"> / 10</span>
            </span>
          </div>
          <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-dusk-2">
            <div
              className="h-full rounded-full bg-evidence"
              style={{ width: `${((entry.score ?? 0) / 10) * 100}%` }}
            />
          </div>
          {entry.narrative ? (
            <p className="mb-3 text-[13.5px] leading-relaxed text-paper-dim">{entry.narrative}</p>
          ) : null}
          {entry.evidence ? (
            <p className="mb-0 font-mono text-[11.5px] text-evidence">EVIDENCE: {entry.evidence}</p>
          ) : null}
          <p className="mb-0 mt-2 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Weight: {category.weight}%
          </p>
        </div>
      )
    })}
  </div>
)
