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
      className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5 lg:overflow-hidden"
      ref={sectionRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h3 className="text-lg font-bold text-white tracking-tight">Sample Payout Measurement Protocol</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Illustrative testing protocol demonstration. Live operator reviews appear only when a CaseFile passes human publication.
          </p>
        </div>

        <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono font-bold rounded-lg">
          Protocol Spec
        </span>
      </div>


      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:flex lg:flex-row lg:overflow-visible" ref={trackRef}>
        {SAMPLE_PAYOUTS.map((entry, idx) => (
          <div
            key={idx}
            className="bg-zinc-950/90 border border-zinc-800/80 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:shadow-lg space-y-3 group lg:min-w-[300px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                {entry.operatorName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                {entry.verificationStatus}
              </span>
            </div>

            <div className="my-2">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Measured Payout Speed</div>
              <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">{entry.testedTime}</div>
            </div>

            <div className="space-y-1 text-[11px] font-mono text-zinc-400 border-t border-zinc-800/60 pt-2">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="text-zinc-200">{entry.method}</span>
              </div>
              <div className="flex justify-between">
                <span>Test Amount:</span>
                <span className="text-zinc-200">{entry.amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence Ref:</span>
                <span className="text-amber-400/80 text-[10px]">{entry.evidenceHash}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectEvidence && onSelectEvidence(entry)}
              className="w-full mt-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <span>Inspect Proof</span>
              <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
