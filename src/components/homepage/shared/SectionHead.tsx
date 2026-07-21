import React from 'react'

import { Reveal } from '@/components/Reveal'
import { Eyebrow } from './Eyebrow'

export const SectionHead: React.FC<{
  eyebrow: string
  heading: React.ReactNode
  className?: string
  /** Optional evidence-archive folio line, e.g. "Exhibit 01 — Scoring sheet". */
  folio?: string
}> = ({ eyebrow, heading, className, folio }) => (
  <Reveal className={`mb-12 max-w-[640px] sm:mb-14 ${className ?? ''}`}>
    {folio ? (
      <div className="mb-5 border-b border-line pb-2 font-mono text-[10.5px] uppercase tracking-[3px] text-paper-dim">
        {folio}
      </div>
    ) : null}
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="text-[26px] leading-[1.15] sm:text-[32px] lg:text-[40px]">{heading}</h2>
  </Reveal>
)
