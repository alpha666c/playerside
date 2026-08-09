'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React, { useRef } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

// Register lazily — ScrollTrigger.register reads window.matchMedia at module
// scope, which jsdom (vitest) doesn't implement; the browser path is unchanged.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger)
}

export interface PayoutEntry {
  operatorName: string
  logoUrl?: string
  testedTime: string
  method: string
  amount: string
  testedAt: string
  verificationStatus: 'verified' | 'corroborated'
  evidenceHash: string
}

const SAMPLE_PAYOUTS: PayoutEntry[] = [
  {
    operatorName: 'Aurora Bay Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'Fiat Bank Transfer (Sample)',
    amount: '€50.00 (Sample)',
    testedAt: '2026-07-22',
    verificationStatus: 'corroborated',
    evidenceHash: 'SAMPLE-REF-2026-S01',
  },
  {
    operatorName: 'Northlight Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'Trustly (Sample)',
    amount: '€50.00 (Sample)',
    testedAt: '2026-07-21',
    verificationStatus: 'corroborated',
    evidenceHash: 'SAMPLE-REF-2026-S02',
  },
  {
    operatorName: 'Ferrous Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'USDT TRC-20 (Sample)',
    amount: '$100.00 (Sample)',
    testedAt: '2026-07-20',
    verificationStatus: 'corroborated',
    evidenceHash: 'SAMPLE-REF-2026-S03',
  },
  {
    operatorName: 'Hollowpoint Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'Bitcoin Lightning (Sample)',
    amount: '0.001 BTC (Sample)',
    testedAt: '2026-07-19',
    verificationStatus: 'corroborated',
    evidenceHash: 'SAMPLE-REF-2026-S04',
  },
  {
    operatorName: 'Vantablack Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'SEPA Instant (Sample)',
    amount: '€100.00 (Sample)',
    testedAt: '2026-07-18',
    verificationStatus: 'verified',
    evidenceHash: 'SAMPLE-REF-2026-S05',
  },
  {
    operatorName: 'Ghostline Casino [Sample]',
    testedTime: 'Illustrative / Not Measured',
    method: 'Litecoin (Sample)',
    amount: '$75.00 (Sample)',
    testedAt: '2026-07-17',
    verificationStatus: 'verified',
    evidenceHash: 'SAMPLE-REF-2026-S06',
  },
]

export function LivePayoutLeaderboard({ onSelectEvidence }: { onSelectEvidence?: (entry: PayoutEntry) => void }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  // Desktop-only: pin the section and translate the card track horizontally
  // as the user scrolls — a gallery walkthrough instead of a static grid.
  useGSAP(
    () => {
      if (reducedMotion) return
      if (!window.matchMedia('(min-width: 1024px)').matches) return

      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track) return

      const getAmount = () => Math.max(track.scrollWidth - track.clientWidth, 0)
      if (getAmount() <= 0) return

      gsap.to(track, {
        x: () => -getAmount(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + getAmount() * 1.4,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <div
      className="panel space-y-5 p-6 backdrop-blur-xl lg:overflow-hidden"
      ref={sectionRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-evidence" />
            <h3 className="t-h3 text-paper">Sample Payout Measurement Protocol</h3>
          </div>
          <p className="t-caption mt-1">
            Illustrative testing protocol demonstration. Live operator reviews appear only when a CaseFile passes human publication.
          </p>
        </div>

        <span className="hud-chip">protocol_spec</span>
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:flex lg:flex-row lg:overflow-visible" ref={trackRef}>
        {SAMPLE_PAYOUTS.map((entry, idx) => (
          <div
            key={idx}
            className="hud-scan group flex flex-col space-y-3 rounded-[10px] border border-line bg-ink-2/90 p-4 transition-all duration-300 hover:border-evidence/60 hover:shadow-md lg:min-w-[300px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-paper transition-colors duration-200 group-hover:text-coral">
                {entry.operatorName}
              </span>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  entry.verificationStatus === 'verified'
                    ? 'border border-success/50 bg-success/10 text-success'
                    : 'border border-evidence/50 bg-evidence/10 text-evidence'
                }`}
              >
                {entry.verificationStatus}
              </span>
            </div>

            <div className="my-2">
              <div className="t-eyebrow">Measured Payout Speed</div>
              <div className="t-data text-2xl font-semibold tracking-tight text-coral">
                {entry.testedTime}
              </div>
            </div>

            <div className="space-y-1 border-t border-line pt-2 font-mono text-[11px] text-paper-dim">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="text-paper">{entry.method}</span>
              </div>
              <div className="flex justify-between">
                <span>Test Amount:</span>
                <span className="text-paper">{entry.amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence Ref:</span>
                <span className="text-[10px] text-evidence/90">{entry.evidenceHash}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectEvidence && onSelectEvidence(entry)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-[10px] border border-line bg-ink py-1.5 text-xs font-semibold text-paper-dim transition-all duration-200 hover:border-coral/60 hover:text-paper active:scale-[0.98]"
            >
              <span>Inspect Proof</span>
              <svg className="h-3 w-3 text-evidence transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
