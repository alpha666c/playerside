import React from 'react'

/**
 * Community sentiment — display-only, per grading-rubric.md's "Qualitative
 * context (not scored)" section. Deliberately reads `communitySentimentNote`,
 * a sibling field of `scores` (never a member of it), so it can never
 * contribute to `overallScore` — see computeOverallScore in reviewFields.ts,
 * which only ever reads from `scores`.
 */
export const QualitativeContext: React.FC<{ note?: string | null }> = ({ note }) => {
  if (!note) return null

  return (
    <div className="container mb-12 max-w-[760px] sm:mb-14">
      <div className="rounded-[var(--radius)] border border-line bg-ink-2/60 p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-normal uppercase tracking-[1.5px] text-paper-dim">
            Community sentiment
          </h2>
          <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Context only — not counted in the score
          </span>
        </div>
        <p className="mb-0 text-[13.5px] leading-relaxed text-paper-dim">{note}</p>
      </div>
    </div>
  )
}
