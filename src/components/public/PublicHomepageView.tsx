'use client'

import React, { useState } from 'react'
import { InstantFilterBar, FilterState } from './InstantFilterBar'
import { LivePayoutLeaderboard, PayoutEntry } from './LivePayoutLeaderboard'
import { BonusCalculator } from './BonusCalculator'
import { EvidenceDrawer } from './EvidenceDrawer'
import { ClaimVsRealityReactor } from './ClaimVsRealityReactor'
import { VerifiedOperatorGrid } from './VerifiedOperatorGrid'

export function PublicHomepageView() {
  const [selectedEvidence, setSelectedEvidence] = useState<PayoutEntry | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    currency: 'all',
    payoutSpeed: 'all',
    jurisdiction: 'all',
    searchQuery: '',
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Dynamic State-of-the-Art Hero Section */}
      <section className="relative isolate px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:px-12 overflow-hidden border-b border-zinc-800/80">
        {/* Glow Ambient Lights */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-amber-500/15 via-emerald-500/5 to-transparent blur-[120px] rounded-full"></div>

        <div className="max-w-6xl mx-auto space-y-10 relative z-10">
          {/* Top Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-xs font-mono text-amber-400 backdrop-blur-xl shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              The Only Evidence-Backed Casino & Bonus Database
            </div>
          </div>

          {/* Headline & Subhead */}
          <div className="text-center space-y-5 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
              Evidence-Backed Protocol. <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400 bg-clip-text text-transparent">
                Zero Bonus Traps.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              We test withdrawals with real cash, verify licenses directly at regulator databases, and decode bonus fine print so you never get trapped.
            </p>
          </div>

          {/* Instant Search & Filter Bar */}
          <div className="max-w-5xl mx-auto pt-2">
            <InstantFilterBar onFilterChange={(f) => setFilters(f)} />
          </div>

          {/* Live Proof Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center pt-4">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md">
              <div className="text-2xl font-extrabold font-mono text-amber-400">100%</div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mt-1">
                Commission-Blind
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md">
              <div className="text-2xl font-extrabold font-mono text-emerald-400">&lt; 15m</div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mt-1">
                Avg Tested Crypto Payout
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md">
              <div className="text-2xl font-extrabold font-mono text-sky-400">0</div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mt-1">
                Hidden Wagering Clauses
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md">
              <div className="text-2xl font-extrabold font-mono text-purple-400">Vercel Blob</div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mt-1">
                Private Evidence Store
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Verified Operator Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <VerifiedOperatorGrid />
      </section>

      {/* Feature 2: Live Payout Speed Leaderboard */}
      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <LivePayoutLeaderboard onSelectEvidence={(entry) => setSelectedEvidence(entry)} />
      </section>

      {/* Feature 3: Operator Claim vs. Measured Reality Reactor */}
      <section className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <ClaimVsRealityReactor />
      </section>

      {/* Feature 4: Interactive Bonus Wager Trap Calculator */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <BonusCalculator />
      </section>

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer entry={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  )
}

