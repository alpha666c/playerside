import Link from 'next/link'
import React from 'react'

import type { RubricCategory } from '@/rubrics/traditional'
import {
  topStrengths,
  weakestCategory,
  type CategoryScore,
} from '@/lib/reviewVerdict'

/**
 * Phase 1 (F1.1) + Phase C — the above-the-fold verdict box, now framed as a
 * field brief. Answers in ~15 seconds: who is this for, what is the catch,
 * is the license verified. Everything is DERIVED from rubric scores +
 * compliance fields — no hand-written marketing lines, keeping the
 * commission-blind promise structurally honest.
 */
export const VerdictBox: React.FC<{
  operatorName: string
  overallScore?: number | null
  scores: Record<string, CategoryScore | undefined>
  rubric: RubricCategory[]
  licenseAuthority?: string | null
  licenseNumber?: string | null
  categoryLabel: string
}> = ({
  operatorName,
  overallScore,
  scores,
  rubric,
  licenseAuthority,
  licenseNumber,
  categoryLabel,
}) => {
  const strengths = topStrengths(scores, rubric, 3)
  const weak = weakestCategory(scores, rubric)
  const licenseVerified = Boolean(licenseAuthority && licenseNumber)
  const weakScore = weak ? scores[weak.key]?.score : null

  return (
    <section
      aria-label={`Verdict for ${operatorName}`}
      className="hud-frame rounded-[var(--radius)] border border-line bg-dusk p-5 sm:p-6"
      id="verdict"
    >
      {/* Brief header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[1.5px] text-evidence">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-evidence" />
            field_brief // {categoryLabel}
          </p>
          <h2 className="t-h3 text-paper">{operatorName}</h2>
        </div>
        {/* Gold discipline note: the OVERALL score stays gold — it is the
            verified mark rendered beside the seal. Per-category scores are
            measured data and use evidence (see ScoreBreakdown). */}
        {typeof overallScore === 'number' ? (
          <div className="text-right">
            <div className="t-data text-3xl text-gold sm:text-4xl">
              {overallScore.toFixed(1)}
              <span className="text-sm text-paper-dim"> / 10</span>
            </div>
            <p className="t-eyebrow mt-0.5">weighted score</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {/* Intel: strengths */}
        {strengths.length > 0 ? (
          <div>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[1.5px] text-evidence">
              Intel // Excels at
            </p>
            <div className="space-y-2">
              {strengths.map((c) => (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="text-paper-dim">{c.label}</span>
                    <span className="t-data text-paper">{scores[c.key]?.score?.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-dusk-2">
                    <div
                      className="h-full rounded-full bg-evidence"
                      style={{ width: `${((scores[c.key]?.score ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Warning: the catch */}
        <div className="rounded-[10px] border border-coral/30 bg-coral/5 p-3">
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-coral">
            Warning // The catch
          </p>
          <p className="m-0 text-[13.5px] leading-relaxed text-paper-dim">
            {weak ? (
              <span>
                <span className="t-data font-semibold text-paper">{weak.label}</span> scores{' '}
                <span className="t-data font-semibold text-coral">{weakScore?.toFixed(1)}/10</span> — read
                the breakdown before you decide.
              </span>
            ) : (
              'See the full breakdown below.'
            )}
          </p>
        </div>

        {/* License status chip */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            License
          </span>
          {licenseVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-success">
              <svg aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Verified — {licenseAuthority}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-coral/40 bg-coral/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-coral">
              Not verified
            </span>
          )}
        </div>
      </div>

      <p className="mb-0 mt-4 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-paper-dim">
        Commission-blind scoring — affiliate terms never influence a score.{' '}
        <Link
          className="text-evidence underline decoration-evidence/40 underline-offset-2 hover:decoration-evidence"
          href="/#method"
        >
          How we grade →
        </Link>
      </p>
    </section>
  )
}
