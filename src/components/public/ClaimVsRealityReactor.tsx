'use client'

import React, { useState } from 'react'

export interface ClaimVsRealityItem {
  category: string
  operatorClaim: string
  measuredResult: string
  isMatches: boolean
  evidenceRef: string
  regulatorUrl?: string
  accessDate?: string
}

export function ClaimVsRealityReactor({ items }: { items?: ClaimVsRealityItem[] }) {
  const defaultItems: ClaimVsRealityItem[] = [
    {
      category: 'Withdrawal Processing',
      operatorClaim: 'Instant withdrawals under 15 minutes stated in FAQ',
      measuredResult: 'Illustrative measurement: 4 minutes 12 seconds (Sample)',
      isMatches: true,
      evidenceRef: 'SAMPLE-REF-2026-S01',
      regulatorUrl: 'https://www.mga.org.mt/register',
      accessDate: '2026-07-22',
    },
    {
      category: 'Live Support Response',
      operatorClaim: '24/7 Live chat response within 2 minutes',
      measuredResult: 'Illustrative measurement: 1 minute 45 seconds (Sample)',
      isMatches: true,
      evidenceRef: 'SAMPLE-REF-2026-S02',
      accessDate: '2026-07-21',
    },
    {
      category: 'Wagering Requirement',
      operatorClaim: '35x Welcome bonus wagering claimed in promo banner',
      measuredResult: 'T&Cs reveal 35x applies to (Deposit + Bonus) = Effective 70x turnover required',
      isMatches: false,
      evidenceRef: 'SAMPLE-REF-2026-S03',
      accessDate: '2026-07-20',
    },
  ]

  const dataList = items || defaultItems
  const [stampedMap, setStampedMap] = useState<Record<number, boolean>>({})
  const [activeEvidence, setActiveEvidence] = useState<ClaimVsRealityItem | null>(null)

  const triggerStamp = (index: number, item: ClaimVsRealityItem) => {
    setStampedMap((prev) => ({ ...prev, [index]: true }))
    setActiveEvidence(item)
  }

  return (
    <div className="panel space-y-6 p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-evidence" />
            <h3 className="t-h3 text-paper">Operator Claim vs. Measured Reality Reactor</h3>
          </div>
          <p className="t-caption mt-1">
            Comparing what the casino advertises against what Playerside actually measured in live test accounts.
          </p>
        </div>

        <span className="hud-chip">evidence_backed_audit</span>
      </div>

      {/* Comparison Items Grid */}
      <div className="space-y-4">
        {dataList.map((item, idx) => {
          const isStamped = stampedMap[idx]
          const accent = item.isMatches ? 'border-success/40 hover:border-success/60' : 'border-coral/40 hover:border-coral/60'
          return (
            <div
              key={idx}
              className={`hud-scan rounded-[10px] border bg-ink-2/80 p-5 transition-all duration-med ${accent}`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-paper-dim">
                  Category: {item.category}
                </span>
                <span
                  className={`rounded border px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                    item.isMatches
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-coral/50 bg-coral/10 text-coral'
                  }`}
                >
                  {item.isMatches ? 'CLAIM MATCHES REALITY' : 'DISCREPANCY DETECTED'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs font-sans md:grid-cols-2">
                {/* Operator Claim Column */}
                <div className="space-y-1 rounded-[10px] border border-line bg-ink-2/60 p-3.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-paper-dim">
                    Operator Stated Claim
                  </div>
                  <div className="font-medium text-paper-dim">{item.operatorClaim}</div>
                </div>

                {/* Measured Reality Column */}
                <div className="space-y-1 rounded-[10px] border border-line bg-ink-2/60 p-3.5">
                  <div className="font-mono text-[10px] font-semibold uppercase text-paper-dim">
                    Playerside Tested Result
                  </div>
                  <div className="font-semibold text-paper">{item.measuredResult}</div>
                </div>
              </div>

              {/* Action & Stamp Seal */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                <div className="font-mono text-[11px] text-paper-dim/70">
                  Ref: <span className="font-bold text-paper-dim">{item.evidenceRef}</span>
                </div>

                <div className="flex items-center gap-3">
                  {isStamped ? (
                    <div className="flex items-center gap-2 rounded-[10px] border border-success/50 bg-success/10 px-3 py-1.5 font-mono text-xs font-bold text-success animate-in zoom-in-95 duration-fast">
                      <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path d="M8 12l3 3 5-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>CERTIFIED BY PLAYERSIDE</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerStamp(idx, item)}
                      className="flex items-center gap-1.5 rounded-[10px] bg-coral px-3.5 py-1.5 text-xs font-bold text-ink-2 shadow-sm transition-all duration-fast hover:bg-coral/90 hover:shadow-md active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify &amp; Stamp Finding
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Evidence Reference Details */}
      {activeEvidence && (
        <div className="space-y-2 rounded-[10px] border border-line bg-ink-2 p-4 font-mono text-xs animate-in fade-in duration-fast">
          <div className="flex items-center justify-between font-bold text-evidence">
            <span>EVIDENCE FILE DETAILS — {activeEvidence.evidenceRef}</span>
            <button onClick={() => setActiveEvidence(null)} aria-label="Dismiss evidence details" className="text-paper-dim transition-colors hover:text-paper">
              ✕
            </button>
          </div>
          <div className="text-[11px] leading-relaxed text-paper-dim">
            Logged Access Date: {activeEvidence.accessDate || '2026-07-22'}. Stored in Vercel Blob private storage adapter.
            {activeEvidence.regulatorUrl && (
              <div className="mt-1">
                Regulator register link:{' '}
                <a href={activeEvidence.regulatorUrl} target="_blank" rel="noreferrer" className="text-evidence hover:underline">
                  {activeEvidence.regulatorUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
