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
  const [ruleOpen, setRuleOpen] = useState(false)

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
      {/* The Redacted Field: the one figure blacked out on our own documents is
          the commission — activating it reveals the rule, never the number. */}
      <div className="mt-3 border-t border-line pt-3">
        <button
          aria-expanded={ruleOpen}
          className="flex w-full items-center gap-2 text-left font-mono text-[12px] text-paper-dim sm:text-[12.5px]"
          onClick={() => setRuleOpen((open) => !open)}
          type="button"
        >
          <span>COMMISSION:</span>
          <span aria-hidden="true" className="redaction w-[8ch]" />
          <span className="sr-only">withheld from graders — activate to see why</span>
          <span
            aria-hidden="true"
            className="ml-auto text-[10px] uppercase tracking-[1px] text-evidence"
          >
            {ruleOpen ? 'Rule −' : 'Why? +'}
          </span>
        </button>
        {ruleOpen ? (
          <p className="mb-0 mt-2.5 text-[12.5px] leading-relaxed text-paper-dim">
            Withheld from graders by design, not blacked out after the fact — the grading side has
            no field this number could ever appear in. Scores are locked before commercial terms
            exist.
          </p>
        ) : null}
      </div>
    </Reveal>
  )
}
