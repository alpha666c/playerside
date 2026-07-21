import Link from 'next/link'
import React from 'react'

import type { Homepage } from '@/payload-types'

import { SectionHead } from '@/components/homepage/shared/SectionHead'
import { toKebabCase } from '@/utilities/toKebabCase'
import { SampleReviewCard } from './SampleReviewCard'

export const SampleReviewsSection: React.FC<{ operators: Homepage['sampleOperators'] }> = ({
  operators,
}) => {
  const items = (operators ?? []).slice(0, 3)

  return (
    <section className="scroll-mt-24 py-16 sm:py-20 lg:py-24" id="reviews">
      <div className="container">
        <SectionHead
          eyebrow="Example reviews"
          folio="Exhibit 03 — Filed findings"
          heading="What a Playerside review actually shows."
        />
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {items.map((operator, i) => (
            <SampleReviewCard
              delayMs={i * 100}
              evidenceNote={operator.evidenceNote}
              href={`/casinos/${toKebabCase(operator.name)}`}
              key={operator.id ?? operator.name}
              name={operator.name}
              score={operator.score}
            />
          ))}
        </div>
        <p className="mt-6 text-[13px] italic text-paper-dim">
          Illustrative examples — not real operators, licenses, or scores.
        </p>
        <Link
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-[14.5px] font-semibold text-paper transition-colors duration-200 hover:border-gold"
          href="/casinos"
        >
          Browse the full index →
        </Link>
      </div>
    </section>
  )
}
