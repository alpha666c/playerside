import Link from 'next/link'
import React from 'react'

import { CompareToggle, type CompareItem } from '@/components/compare/CompareToggle'
import { CategoryMarker, type CategoryKind } from '@/components/CategoryMarker/CategoryMarker'
import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'

export const ReviewListingCard: React.FC<{
  href: string
  name: string
  overallScore?: number | null
  summary?: string | null
  category: CategoryKind
  isIllustrativeSample?: boolean | null
  /** When set, renders the add-to-compare toggle (Phase 3 F3.2). */
  compare?: CompareItem | null
}> = ({ href, name, overallScore, summary, category, isIllustrativeSample, compare }) => (
  <div className="group relative rounded-[var(--radius)] border border-line bg-dusk transition-colors duration-fast hover:border-gold/50">
    <Link className="block p-6 sm:p-[26px]" href={href}>
      <VerificationSeal
        active
        className="absolute right-4 top-4"
        size={48}
        title={`${name} — verified score, evidence logged`}
      />
      <CategoryMarker className="mb-3" kind={category} />
      <h3 className="mb-1 pr-14 text-lg sm:text-xl">{name}</h3>
      {typeof overallScore === 'number' ? (
        <div className="my-2 font-mono text-2xl text-gold sm:text-[28px]">
          {overallScore.toFixed(1)} <span className="text-sm text-paper-dim">/ 10</span>
        </div>
      ) : null}
      {summary ? (
        <p className="mb-0 mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-paper-dim">
          {summary}
        </p>
      ) : null}
      {isIllustrativeSample ? (
        <p className="mb-0 mt-3 font-mono text-[10.5px] uppercase tracking-[1px] text-coral">
          Illustrative sample
        </p>
      ) : null}
    </Link>
    {compare ? (
      <div className="absolute left-4 top-4">
        <CompareToggle item={compare} />
      </div>
    ) : null}
  </div>
)
