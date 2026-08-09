'use client'

import React from 'react'
import Link from 'next/link'

import type { FilterState } from './InstantFilterBar'

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

export function VerifiedOperatorGrid({
  filters,
}: {
  filters?: FilterState
}) {
  // The hero filter bar drives this grid live: category pills + search query
  // filter the demonstrated corpus; the other facets are accepted for
  // forward-compat with the real corpus (currency/speed/jurisdiction).
  const visible = SAMPLE_OPERATORS.filter((op) => {
    if (!filters) return true
    if (filters.category !== 'all' && op.category !== filters.category) return false
    const q = filters.searchQuery.trim().toLowerCase()
    if (q && !op.name.toLowerCase().includes(q) && !op.evidenceHash.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Slim action row — the section header carries the title. */}
      <div className="flex items-center justify-end gap-2">
        <Link
          href="/casinos"
          className="rounded-[10px] border border-line bg-ink-2 px-3 py-1.5 text-xs font-semibold text-paper-dim transition-colors duration-200 hover:border-evidence/50 hover:text-paper"
        >
          Traditional (€/$)
        </Link>
        <Link
          href="/crypto-casinos"
          className="rounded-[10px] border border-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-coral transition-colors duration-200 hover:border-coral/70 hover:bg-coral/20"
        >
          Crypto Casinos (BTC/USDT)
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[10px] border border-line bg-ink-2/60 p-6 text-center font-mono text-xs text-paper-dim">
          No operators match the current filter. Clear the search or switch the category.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {visible.map((op, idx) => (
          <div
            key={idx}
            className="panel hud-frame hud-scan group flex flex-col justify-between space-y-4 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-evidence/50"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="rounded border border-line bg-ink-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-paper-dim">
                    {op.category === 'crypto' ? 'Crypto Casino' : 'Traditional Casino'}
                  </span>
                  <h4 className="t-h4 mt-1 text-paper transition-colors duration-200 group-hover:text-coral">
                    {op.name}
                  </h4>
                </div>

                <div className="text-right font-mono">
                  <div className="t-eyebrow">Score</div>
                  <div className="t-data text-2xl font-semibold text-evidence">
                    {op.score.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Verified tags */}
              <div className="my-4 grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-[10px] border border-line bg-ink-2/70 p-2.5">
                  <span className="block text-[10px] text-paper-dim">Tested Withdrawal</span>
                  <span className="font-semibold text-success">{op.payoutSpeed}</span>
                </div>
                <div className="rounded-[10px] border border-line bg-ink-2/70 p-2.5">
                  <span className="block text-[10px] text-paper-dim">Regulator License</span>
                  <span className="font-semibold text-paper">{op.license}</span>
                </div>
              </div>

              {/* Bonus offer */}
              <div className="rounded-[10px] border border-line bg-ink-2 p-3 text-xs font-mono">
                <span className="block text-[10px] uppercase tracking-wider text-evidence">
                  Verified Welcome Offer
                </span>
                <span className="font-semibold text-paper">{op.welcomeBonus}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="font-mono text-[11px] text-paper-dim/60">{op.evidenceHash}</span>

              <Link
                href={op.category === 'crypto' ? `/crypto-casinos/${op.slug}` : `/casinos/${op.slug}`}
                className="rounded-[10px] bg-coral px-3.5 py-1.5 text-xs font-bold text-ink-2 shadow-sm transition-all duration-200 hover:bg-coral/90 hover:shadow-md active:scale-[0.97]"
              >
                Read Review
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
