'use client'

import React from 'react'
import Link from 'next/link'

export interface OperatorCardData {
  name: string
  slug: string
  category: 'crypto' | 'traditional'
  score: number
  payoutSpeed: string
  license: string
  welcomeBonus: string
  highlights: string[]
  evidenceHash: string
}

const SAMPLE_OPERATORS: OperatorCardData[] = [
  {
    name: 'Aurora Bay Casino [Sample]',
    slug: 'aurora-bay-casino',
    category: 'traditional',
    score: 8.6,
    payoutSpeed: 'Illustrative / Not Measured',
    license: 'MGA (Sample)',
    welcomeBonus: '100% Up to €200 (Sample Offer)',
    highlights: ['Sample Licensing Entry', 'Illustrative Rubric Score', 'Commission-Blind Spec'],
    evidenceHash: 'SAMPLE-REF-2026-S01',
  },
  {
    name: 'Northlight Casino [Sample]',
    slug: 'northlight-casino',
    category: 'traditional',
    score: 8.4,
    payoutSpeed: 'Illustrative / Not Measured',
    license: 'Sweden Spelinspektionen (Sample)',
    welcomeBonus: '100 Spins (Sample Offer)',
    highlights: ['Sample Regulatory Record', 'Illustrative Score', 'Evidence Architecture'],
    evidenceHash: 'SAMPLE-REF-2026-S02',
  },
  // Phase 2 drive-by (2026-08-08): the published corpus is currently three
  // traditional reviews (ferrous is SE-licensed, not crypto — no crypto
  // reviews are published yet), so the demo cards point at real routes
  // instead of pre-rename slugs that 404'd.
  {
    name: 'Ferrous Casino [Sample]',
    slug: 'ferrous-casino',
    category: 'traditional',
    score: 8.8,
    payoutSpeed: 'Illustrative / Not Measured',
    license: 'Spelinspektionen (Sample)',
    welcomeBonus: '200 Free Spins (Sample Offer)',
    highlights: ['Sample Regulatory Record', 'Illustrative Score', 'Evidence Architecture'],
    evidenceHash: 'SAMPLE-REF-2026-S03',
  },
]


export function VerifiedOperatorGrid({ onSelectEvidence }: { onSelectEvidence?: (hash: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Illustrative Casino Intelligence Directory</h3>
          <p className="text-xs text-zinc-400 mt-1">
            System demonstration of 8–9 rubric category evaluations. Sample cases map to Master Blueprint §2 seed models.
          </p>

        </div>

        <div className="flex gap-2">
          <Link
            href="/casinos"
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Traditional (€/$)
          </Link>
          <Link
            href="/crypto-casinos"
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg transition-colors"
          >
            Crypto Casinos (BTC/USDT)
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLE_OPERATORS.map((op, idx) => (
          <div
            key={idx}
            className="bg-zinc-900/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl p-6 transition-all hover:shadow-xl space-y-4 flex flex-col justify-between group"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-950 text-zinc-400 border border-zinc-800 uppercase">
                    {op.category === 'crypto' ? 'Crypto Casino' : 'Traditional Casino'}
                  </span>
                  <h4 className="text-xl font-extrabold text-white mt-1 group-hover:text-amber-400 transition-colors">
                    {op.name}
                  </h4>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase">Score</div>
                  <div className="text-2xl font-extrabold text-amber-400">{op.score.toFixed(1)}</div>
                </div>
              </div>

              {/* Verified Tags */}
              <div className="grid grid-cols-2 gap-3 my-4 text-xs font-mono">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">Tested Withdrawal</span>
                  <span className="text-emerald-400 font-bold">{op.payoutSpeed}</span>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">Regulator License</span>
                  <span className="text-zinc-200 font-semibold">{op.license}</span>
                </div>
              </div>

              {/* Bonus Offer */}
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs font-mono">
                <span className="text-amber-400/80 block text-[10px] uppercase">Verified Welcome Offer</span>
                <span className="text-amber-300 font-bold">{op.welcomeBonus}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-zinc-500">{op.evidenceHash}</span>

              <div className="flex items-center gap-2">
                <Link
                  href={op.category === 'crypto' ? `/crypto-casinos/${op.slug}` : `/casinos/${op.slug}`}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Read Review
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
