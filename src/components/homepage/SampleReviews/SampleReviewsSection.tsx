import React from 'react'

import type { Homepage } from '@/payload-types'

import { SectionHead } from '@/components/homepage/shared/SectionHead'
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
              key={operator.id ?? operator.name}
              name={operator.name}
              score={operator.score}
            />
          ))}
        </div>
        <p className="mt-6 text-[13px] italic text-paper-dim">
          Illustrative examples — not real operators, licenses, or scores.
        </p>
      </div>
    </section>
  )
}
