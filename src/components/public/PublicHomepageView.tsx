'use client'

import React, { useState } from 'react'
import { InstantFilterBar, FilterState } from './InstantFilterBar'
import { LivePayoutLeaderboard, PayoutEntry } from './LivePayoutLeaderboard'
import { BonusCalculator } from './BonusCalculator'
import { EvidenceDrawer } from './EvidenceDrawer'
import { ClaimVsRealityReactor } from './ClaimVsRealityReactor'
import { VerifiedOperatorGrid } from './VerifiedOperatorGrid'
import { HudSectionHeader } from './HudSectionHeader'
import { HeroFieldView } from '@/components/three/HeroFieldView'
import { MachinedSealLazy } from '@/components/MachinedSeal/MachinedSealLazy'
import { ProtocolScrub } from './ProtocolScrub'
import { MissionsPromo } from './MissionsPromo'

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
    <div className="min-h-screen bg-ink text-paper font-sans">
      {/* Command deck — the hero, framed as a live intel readout. */}
      <section className="relative isolate overflow-hidden border-b border-line bg-blueprint">
        {/* Living evidence field — WebGL atmosphere (gated, decorative). */}
        <HeroFieldView />
        {/* Ambient brand glow — restrained evidence/coral wash, not neon. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(110,168,216,0.14),transparent_70%)] blur-[90px]"
        />

        {/* Coordinate readout — the one tactical flourish that ties the hero
            to the HUD language. Hidden on small screens. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 hidden select-none font-mono text-[10px] uppercase tracking-[0.22em] text-paper-dim/40 lg:block"
        >
          SEC-01 // LIVE_INTEL
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-6 hidden select-none font-mono text-[10px] uppercase tracking-[0.22em] text-paper-dim/40 lg:block"
        >
          LAT 52.37 // LON 4.90 // EVIDENCE_LINK
        </div>

        <div className="relative z-10 mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          {/* Signature machined seal — the one true 3D brand mark (code-split, graceful fallback). */}
          <div className="flex justify-center">
            <MachinedSealLazy size={72} title="Playerside verification seal" />
          </div>

          {/* Top badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-ink/80 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-evidence backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-evidence animate-pulse" />
              The Only Evidence-Backed Casino &amp; Bonus Database
            </div>
          </div>

          {/* Headline & subhead */}
          <div className="mx-auto max-w-4xl space-y-5 text-center">
            <h1 className="t-display text-white">
              Evidence-Backed Protocol. <br />
              <span className="bg-gradient-to-r from-coral via-[#ffb08a] to-evidence bg-clip-text text-transparent">
                Zero Bonus Traps.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-paper-dim sm:text-lg">
              We test withdrawals with real cash, verify licenses directly at regulator databases,
              and decode bonus fine print so you never get trapped.
            </p>
          </div>

          {/* Instant search & filter bar */}
          <div className="mx-auto max-w-5xl pt-2">
            <InstantFilterBar onFilterChange={(f) => setFilters(f)} />
          </div>

          {/* Live proof metrics — HUD readouts, not marketing boxes. */}
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 pt-4 text-center md:grid-cols-4">
            <div className="panel p-4">
              <div className="t-data text-2xl font-semibold text-coral">100%</div>
              <div className="t-eyebrow mt-1">Commission-Blind</div>
            </div>
            <div className="panel p-4">
              <div className="t-data text-2xl font-semibold text-evidence">&lt; 15m</div>
              <div className="t-eyebrow mt-1">Avg Tested Crypto Payout</div>
            </div>
            <div className="panel p-4">
              <div className="t-data text-2xl font-semibold text-paper">0</div>
              <div className="t-eyebrow mt-1">Hidden Wagering Clauses</div>
            </div>
            <div className="panel p-4">
              <div className="t-data text-2xl font-semibold text-evidence">PRIVATE</div>
              <div className="t-eyebrow mt-1">Vercel Blob Evidence Store</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Protocol — pinned scroll-scrubbed walkthrough (desktop) */}
      <ProtocolScrub />

      {/* SEC 02 — verified operator directory */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <HudSectionHeader
          chip="intel"
          n="02"
          sub="System demonstration of 8–9 rubric category evaluations. Sample cases map to Master Blueprint §2 seed models."
          title="The verified operator directory."
        />
        {/* Live-wired to the hero filter bar: category + search filter the grid. */}
        <VerifiedOperatorGrid filters={filters} />
      </section>

      {/* SEC 03 — payout measurement leaderboard */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <HudSectionHeader
          chip="live"
          n="03"
          sub="Illustrative testing protocol demonstration. Live operator reviews appear only when a CaseFile passes human publication."
          title="Payout speed, measured."
        />
        <LivePayoutLeaderboard onSelectEvidence={(entry) => setSelectedEvidence(entry)} />
      </section>

      {/* SEC 04 — the proof section: claim vs measured reality */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <HudSectionHeader
          chip="field-intel"
          n="04"
          sub="Comparing what operators advertise against what Playerside actually measured in live test accounts."
          title="Claim vs. measured reality."
        />
        <ClaimVsRealityReactor />
      </section>

      {/* SEC 05 — bonus wager trap detector */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <HudSectionHeader
          chip="decoder"
          n="05"
          sub="Input any casino bonus offer to expose total turnover required, max bet traps, and expected cashout value."
          title="Decode the bonus fine print."
        />
        <BonusCalculator />
      </section>

      {/* Vex Missions — learn the terms, earn the rank */}
      <MissionsPromo />

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer entry={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  )
}
