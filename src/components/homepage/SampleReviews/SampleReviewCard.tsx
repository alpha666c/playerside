'use client'

import React, { useState } from 'react'

import { Reveal } from '@/components/Reveal'
import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'

export const SampleReviewCard: React.FC<{
  name: string
  score: number
  evidenceNote: string
  delayMs?: number
}> = ({ name, score, evidenceNote, delayMs = 0 }) => {
  const [stampActive, setStampActive] = useState(false)

  return (
    <Reveal
      className="relative overflow-hidden rounded-[var(--radius)] border border-line bg-dusk p-6 sm:p-[26px]"
      delayMs={delayMs}
      onReveal={() => setStampActive(true)}
    >
      <VerificationSeal
        active={stampActive}
        className="absolute right-4 top-4"
        size={56}
        title={`${name} — verified score, evidence logged`}
      />
      <h3 className="mb-1 pr-16 text-lg sm:text-xl">{name}</h3>
      <div className="my-2.5 font-mono text-2xl text-gold sm:my-3.5 sm:text-[30px]">
        {score.toFixed(1)} <span className="text-sm text-paper-dim sm:text-[15px]">/ 10</span>
      </div>
      <div className="mt-3.5 border-t border-line pt-3.5 font-mono text-[12px] text-evidence sm:text-[12.5px]">
        EVIDENCE: {evidenceNote}
      </div>
    </Reveal>
  )
}
