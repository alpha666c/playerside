import React from 'react'

import { Reveal } from '@/components/Reveal'
import { SectionHead } from '@/components/homepage/shared/SectionHead'
import { PressureTest } from '@/components/homepage/PressureTest/PressureTest'

const accessMap = [
  {
    side: 'Grading team sees',
    tone: 'text-evidence',
    items: [
      'License status & regulator standing',
      'Published T&Cs, wagering terms',
      'Support response times, tested directly',
      'Logged evidence for every score',
    ],
  },
  {
    side: 'Business team sees',
    tone: 'text-coral',
    items: [
      'Commission rates & deal terms',
      'Which operators to onboard',
      'Partnership negotiations',
      'Never a grading score, before or after',
    ],
  },
]

/**
 * "The Wall" — the commission-blind architecture (ORG.md §3.2), demonstrated
 * rather than described: the Pressure Test lets a visitor escalate simulated
 * commission offers and watch every one get sealed at the boundary while the
 * score stands still. The access map beneath states the same rule as plain
 * fact. This is the brand's single most important section.
 */
export const TheWallSection: React.FC = () => (
  <section className="scroll-mt-24 py-16 sm:py-20 lg:py-24" id="wall">
    <div className="container">
      <SectionHead
        eyebrow="The commission-blind wall"
        folio="Exhibit 02 — The wall, tested"
        heading="Our grading team has never seen a commission rate. Try to change that."
      />

      <Reveal>
        <PressureTest />
      </Reveal>

      <Reveal
        as="div"
        className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-10"
        delayMs={120}
      >
        {accessMap.map((column) => (
          <div key={column.side}>
            <h3
              className={`mb-3 font-mono text-[11px] font-normal uppercase tracking-[2px] ${column.tone}`}
            >
              {column.side}
            </h3>
            <ul className="m-0 list-none space-y-2 text-[13.5px] leading-relaxed text-paper-dim">
              {column.items.map((item) => (
                <li className="border-b border-line/60 pb-2" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </div>
  </section>
)
