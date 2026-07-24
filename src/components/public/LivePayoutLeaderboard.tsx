'use client'

import React from 'react'

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
    operatorName: 'Stake.com',
    testedTime: '4m 12s',
    method: 'USDT (TRC-20)',
    amount: '$250.00',
    testedAt: '2026-07-22',
    verificationStatus: 'verified',
    evidenceHash: 'EV-PAYOUT-0842-STAKE',
  },
  {
    operatorName: 'BitStarz',
    testedTime: '8m 45s',
    method: 'Bitcoin (BTC)',
    amount: '0.015 BTC',
    testedAt: '2026-07-21',
    verificationStatus: 'verified',
    evidenceHash: 'EV-PAYOUT-0841-BITSTARZ',
  },
  {
    operatorName: 'BC.Game',
    testedTime: '12m 00s',
    method: 'Ethereum (ETH)',
    amount: '0.25 ETH',
    testedAt: '2026-07-20',
    verificationStatus: 'verified',
    evidenceHash: 'EV-PAYOUT-0840-BCGAME',
  },
  {
    operatorName: 'Roobet',
    testedTime: '14m 30s',
    method: 'USDC (Solana)',
    amount: '$500.00',
    testedAt: '2026-07-19',
    verificationStatus: 'verified',
    evidenceHash: 'EV-PAYOUT-0839-ROOBET',
  },
]

export function LivePayoutLeaderboard({ onSelectEvidence }: { onSelectEvidence?: (entry: PayoutEntry) => void }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-lg font-bold text-white tracking-tight">Fastest Verified Payout Leaderboard</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real cash withdrawals executed and timed by Playerside testers. Every time links to archived proof.
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold rounded-lg">
          Updated Today
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SAMPLE_PAYOUTS.map((entry, idx) => (
          <div
            key={idx}
            className="bg-zinc-950/90 border border-zinc-800/80 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:shadow-lg space-y-3 group"
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
