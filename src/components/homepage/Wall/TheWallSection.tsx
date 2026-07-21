import React from 'react'

import { Reveal } from '@/components/Reveal'
import { SectionHead } from '@/components/homepage/shared/SectionHead'
import { WallDivider } from './WallDivider'

const gradingSees = [
  'License status & regulator standing',
  'Published T&Cs, wagering terms',
  'Support response times, tested directly',
  'Logged evidence for every score',
]

const businessSees = [
  'Commission rates & deal terms',
  'Which operators to onboard',
  'Partnership negotiations',
  'Never a grading score, before or after',
]

/**
 * "The Wall" — the commission-blind architecture split (ORG.md §3.2), made
 * literal: grading team on one side, commercial/business-development data on
 * the other, a dashed gold line between them, nothing crossing. This is the
 * brand's single most important section — its evidence-of-substance moment.
 */
export const TheWallSection: React.FC = () => (
  <section className="scroll-mt-24 py-16 sm:py-20 lg:py-24" id="wall">
    <div className="container">
      <SectionHead
        eyebrow="The commission-blind wall"
        heading="Our grading team has never seen a commission rate. That's not a policy. It's a wall built into the system."
      />

      <Reveal className="grid items-stretch gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-0">
        <div className="rounded-[var(--radius)] border border-coral/35 bg-dusk p-6 sm:p-8">
          <h3 className="mb-4 text-lg sm:text-xl">Grading team sees</h3>
          <ul className="m-0 list-disc space-y-3 pl-[18px] text-[14.5px] leading-relaxed text-paper-dim">
            {gradingSees.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <WallDivider />

        <div className="rounded-[var(--radius)] border border-evidence/35 bg-dusk p-6 sm:p-8">
          <h3 className="mb-4 text-lg sm:text-xl">Business team sees</h3>
          <ul className="m-0 list-disc space-y-3 pl-[18px] text-[14.5px] leading-relaxed text-paper-dim">
            {businessSees.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  </section>
)
