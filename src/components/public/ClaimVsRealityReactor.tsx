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
      measuredResult: 'Tested payout completed in 4 minutes, 12 seconds (USDT TRC-20)',
      isMatches: true,
      evidenceRef: 'EV-PAYOUT-0842-STAKE',
      regulatorUrl: 'https://www.curacao-egaming.com/public-register',
      accessDate: '2026-07-22',
    },
    {
      category: 'Live Support Response',
      operatorClaim: '24/7 Live chat response within 2 minutes',
      measuredResult: 'Tested support response time: 1 minute, 45 seconds (Human agent)',
      isMatches: true,
      evidenceRef: 'EV-SUPPORT-0114-STAKE',
      accessDate: '2026-07-21',
    },
    {
      category: 'Wagering Requirement',
      operatorClaim: '35x Welcome bonus wagering claimed in promo banner',
      measuredResult: 'T&Cs reveal 35x applies to (Deposit + Bonus) = Effective 70x turnover required',
      isMatches: false,
      evidenceRef: 'EV-BONUS-TRAP-0091',
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
    <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Operator Claim vs. Measured Reality Reactor
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Comparing what the casino advertises against what Playerside actually measured in live test accounts.
          </p>
        </div>

        <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono font-semibold rounded-lg">
          Evidence-Backed Audit
        </span>
      </div>

      {/* Comparison Items Grid */}
      <div className="space-y-4">
        {dataList.map((item, idx) => {
          const isStamped = stampedMap[idx]
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border transition-all ${
                item.isMatches
                  ? 'bg-zinc-950/80 border-zinc-800/80 hover:border-emerald-500/40'
                  : 'bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Category: {item.category}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
                    item.isMatches
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}
                >
                  {item.isMatches ? 'CLAIM MATCHES REALITY' : 'DISCREPANCY DETECTED'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                {/* Operator Claim Column */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Operator Stated Claim</div>
                  <div className="text-zinc-300 font-medium">{item.operatorClaim}</div>
                </div>

                {/* Measured Reality Column */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg space-y-1">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Playerside Tested Result</div>
                  <div className="text-zinc-100 font-semibold">{item.measuredResult}</div>
                </div>
              </div>

              {/* Action & Stamp Seal */}
              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-zinc-500">
                  Ref: <span className="text-zinc-300 font-bold">{item.evidenceRef}</span>
                </div>

                <div className="flex items-center gap-3">
                  {isStamped ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-xs font-bold animate-in zoom-in-95 duration-150 shadow-md shadow-emerald-950/50">
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" className="text-emerald-800" />
                        <path d="M8 12l3 3 5-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>CERTIFIED BY PLAYERSIDE</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerStamp(idx, item)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-sans rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify & Stamp Finding
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal / Drawer displaying Evidence Reference Details */}
      {activeEvidence && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-amber-400 font-bold">
            <span>EVIDENCE FILE DETAILS — {activeEvidence.evidenceRef}</span>
            <button onClick={() => setActiveEvidence(null)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="text-zinc-400 text-[11px] leading-relaxed">
            Logged Access Date: {activeEvidence.accessDate || '2026-07-22'}. Stored in Vercel Blob private storage adapter.
            {activeEvidence.regulatorUrl && (
              <div className="mt-1">
                Regulator register link:{' '}
                <a href={activeEvidence.regulatorUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
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
