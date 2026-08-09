'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Phase 1 (F1.4) — sticky CTA bar. Honest, in-site actions (commission-blind;
 * the outbound clicks flow is still planned, so the bar never fake-promises
 * an affiliate CTA): jump to the verdict, the full breakdown, or bonus terms.
 * Zero layout shift — fixed positioning contributes nothing to the document
 * flow. The floating pill clears the Vex dock (bottom-right) on every size.
 */
export const StickyCtaBar: React.FC<{
  operatorName: string
  overallScore?: number | null
  bonusHref?: string | null
  bonusLabel?: string | null
}> = ({ operatorName, overallScore, bonusHref, bonusLabel }) => {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div aria-hidden="true" ref={sentinelRef} />
      <div
        // Hidden state: `visibility:hidden` (not just opacity:0) removes the
        // bar from the keyboard tab order, the a11y tree AND pointer events —
        // otherwise its links stay focusable while invisible (a11y S2 found
        // in review pass). Visibility is IN the transition list, and CSS
        // discrete transitions keep it 'visible' until the 250ms fade-out
        // finishes, then flip to hidden — so both directions animate.
        className="fixed bottom-3 left-0 right-24 z-40 flex justify-center"
        style={{
          opacity: visible ? 1 : 0,
          visibility: visible ? 'visible' : 'hidden',
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 250ms ease, transform 250ms ease, visibility 250ms',
        }}
      >
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-ink-2/95 px-4 py-2 shadow-2xl backdrop-blur-xl">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-paper">{operatorName}</p>
            {typeof overallScore === 'number' ? (
              <p className="font-mono text-[10.5px] text-paper-dim">{overallScore.toFixed(1)} / 10 weighted</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              className="rounded-lg border border-line px-3 py-2 text-[11.5px] font-semibold text-paper-dim transition-colors hover:border-evidence/50 hover:text-paper"
              href="#verdict"
            >
              Verdict
            </a>
            <a
              className="rounded-lg border border-line px-3 py-2 text-[11.5px] font-semibold text-paper-dim transition-colors hover:border-evidence/50 hover:text-paper"
              href="#breakdown"
            >
              Breakdown
            </a>
            {bonusHref ? (
              <a
                className="rounded-lg bg-coral px-3 py-2 text-[11.5px] font-bold text-ink-2 transition-colors hover:bg-coral/90"
                href={bonusHref}
              >
                {bonusLabel ?? 'Bonus terms'}
              </a>
            ) : null}
          </div>
        </div>
        <p className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-paper-dim/70">
          18+ · Commission-blind — scores are never influenced by affiliate terms.
        </p>
      </div>
    </>
  )
}
