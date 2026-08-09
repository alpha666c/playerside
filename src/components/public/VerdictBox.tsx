import Link from 'next/link'
import React from 'react'

import type { RubricCategory } from '@/rubrics/traditional'
import {
  topStrengths,
  weakestCategory,
  type CategoryScore,
} from '@/lib/reviewVerdict'

/**
 * Phase 1 (F1.1) — the above-the-fold verdict box. Answers in ~15 seconds:
 * who is this for, what is the catch, is the license verified. Everything is
 * DERIVED from rubric scores + compliance fields — no hand-written marketing
 * lines, keeping the commission-blind promise structurally honest.
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
      className="rounded-[var(--radius)] border border-line bg-dusk p-5 sm:p-6"
      id="verdict"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Verdict — {categoryLabel}
          </p>
          <h2 className="text-[19px] font-semibold text-paper sm:text-[22px]">{operatorName}</h2>
        </div>
        {typeof overallScore === 'number' ? (
          <div className="text-right">
            <div className="font-mono text-3xl text-gold sm:text-4xl">
              {overallScore.toFixed(1)}
              <span className="text-sm text-paper-dim"> / 10</span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[1.5px] text-paper-dim/70">
              Weighted score
            </p>
          </div>
        ) : null}
      </div>

      <dl className="m-0 mt-4 grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
        {strengths.length > 0 ? (
          <div>
            <dt className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-evidence">
              Excels at
            </dt>
            <dd className="m-0 space-y-1">
              {strengths.map((c) => (
                <div className="flex items-baseline justify-between gap-3" key={c.key}>
                  <span className="text-paper-dim">{c.label}</span>
                  <span className="font-mono text-paper">
                    {scores[c.key]?.score?.toFixed(1)}
                  </span>
                </div>
              ))}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-coral">
            The catch
          </dt>
          <dd className="m-0 text-paper-dim">
            {weak ? (
              <span>
                {weak.label} scores {weakScore?.toFixed(1)}/10 — read the breakdown before you
                decide.
              </span>
            ) : (
              'See the full breakdown below.'
            )}
          </dd>
          <dt className="mb-1 mt-3 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            License
          </dt>
          <dd className="m-0 text-paper">
            {licenseVerified ? (
              <span className="text-success">Verified — {licenseAuthority}</span>
            ) : (
              <span className="text-coral">Not verified</span>
            )}
          </dd>
        </div>
      </dl>

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
