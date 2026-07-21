import React from 'react'

/** Prominent, unmissable marker for Phase A sample content — never confused with a real operator or offer. */
export const IllustrativeBanner: React.FC<{ subject?: string }> = ({
  subject = 'operator',
}) => (
  <div className="rounded-[var(--radius)] border border-dashed border-coral/50 bg-coral/10 px-5 py-3.5 font-mono text-[12px] uppercase tracking-[1.5px] text-coral sm:text-[12.5px]">
    Illustrative sample — not a real {subject}. Built to prove the format; no real evidence
    was logged.
  </div>
)
