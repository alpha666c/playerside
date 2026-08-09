'use client'

import React, { useState } from 'react'

import type { RubricCategory } from '@/rubrics/traditional'

type CategoryScore = {
  score?: number | null
  evidence?: string | null
  narrative?: string | null
}

/**
 * Full per-category breakdown for a review page — the "8/9 categories, each
 * with its evidence citation, plus genuine narrative assessment" the brief
 * calls for. Phase 1 (F1.3): upgraded to an accordion so a long review stays
 * scannable — the first category opens by default and the rest collapse.
 * Narrative + evidence stay in the DOM (hidden, not unmounted) so the full
 * content remains crawlable for SEO.
 *
 * Phase C: the accordion now reads as a tactical readout — mono CAT indices
 * (01/08…), evidence-colored scores, per-category bars, and the weight shown
 * as a HUD chip.
 */
export const ScoreBreakdown: React.FC<{
  rubric: RubricCategory[]
  scores: Record<string, CategoryScore | undefined>
}> = ({ rubric, scores }) => {
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(rubric[0] ? [rubric[0].key] : []),
  )
  const total = rubric.length

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="space-y-3">
      {rubric.map((category, idx) => {
        const entry = scores[category.key]
        if (!entry) return null
        const open = openKeys.has(category.key)
        return (
          <div
            className="rounded-[var(--radius)] border border-line bg-dusk p-5 transition-colors duration-fast hover:border-evidence/40 sm:p-6"
            key={category.key}
          >
            <button
              aria-expanded={open}
              aria-controls={`score-${category.key}-body`}
              className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 text-left"
              onClick={() => toggle(category.key)}
              type="button"
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim/60">
                  cat {String(idx + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-semibold text-paper sm:text-base">
                  {category.label}
                </span>
              </span>
              {/* Category scores are measured data -> evidence; only the
                  overall verified score uses gold (see VerdictBox). */}
              <span className="flex items-center gap-3">
                <span className="t-data text-lg text-evidence sm:text-xl">
                  {entry.score?.toFixed(1) ?? '—'}
                  <span className="text-[11px] text-paper-dim"> / 10</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`font-mono text-[11px] text-paper-dim transition-transform duration-fast ${open ? 'rotate-180' : ''}`}
                >
                  ▾
                </span>
              </span>
            </button>
            <div className="mb-3 mt-2 h-[5px] overflow-hidden rounded-full bg-dusk-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-coral to-evidence transition-[width] duration-slow"
                style={{ width: `${((entry.score ?? 0) / 10) * 100}%` }}
              />
            </div>
            <div hidden={!open} id={`score-${category.key}-body`}>
              {entry.narrative ? (
                <p className="mb-3 text-[13.5px] leading-relaxed text-paper-dim">{entry.narrative}</p>
              ) : null}
              {entry.evidence ? (
                <p className="mb-0 font-mono text-[11.5px] text-evidence">
                  EVIDENCE: {entry.evidence}
                </p>
              ) : null}
              <p className="mb-0 mt-3 inline-flex">
                <span className="hud-chip">weight {category.weight}%</span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
