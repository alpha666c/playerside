'use client'

import Link from 'next/link'
import React from 'react'

import { useMissions } from '@/hooks/useMissions'

/**
 * Homepage bridge to the Vex Missions board. Pulls the live scout dossier
 * from the missions API and teases the rank ladder + badge wall with a single
 * CTA into /missions. Fail-soft: if the API is unreachable, the section still
 * renders as a static invite.
 *
 * Vex identity note: this is the one section that keeps restrained gold
 * accents (the Vex palette per vex-surface), but the surfaces are aligned to
 * the brand ink/dusk system and the primary action is coral like everywhere
 * else — gold reads as Vex rank/XP readouts, never as a decorative wash.
 */
export const MissionsPromo: React.FC = () => {
  const { data, loading } = useMissions()

  const profile = data?.profile
  const earned = data?.badges.filter((b) => b.earned).length ?? 0
  const totalBadges = data?.badges.length ?? 8
  const completed = profile?.completedMissions ?? 0

  return (
    <section className="relative isolate overflow-hidden border-y border-line bg-ink">
      {/* Ambient Vex glow — restrained gold, the sanctioned Vex identity. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(201,161,90,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-evidence/10 blur-[100px]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-16">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[2px] text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            Vex Missions · learn the terms, earn the rank
          </div>
          <h2 className="t-h1 text-paper">
            Read the fine print like a scout.
            <span className="block bg-gradient-to-r from-gold to-evidence bg-clip-text text-transparent">
              Rank up while you learn.
            </span>
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-paper-dim sm:text-base">
            Every mission teaches one casino-literacy skill — decoding wagering requirements,
            spotting bonus traps, and knowing when the smart play is to walk away. No hype,
            no &ldquo;guaranteed&rdquo; anything. Just recon you can take to the terms page.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/missions"
              className="inline-flex items-center gap-2 rounded-[10px] bg-coral px-5 py-2.5 text-sm font-bold text-ink-2 shadow-lg shadow-coral/20 transition-all duration-fast hover:bg-coral/90 hover:shadow-xl hover:shadow-coral/25 active:scale-[0.98]"
            >
              Open the mission board
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <a
              href="https://www.gambleaware.org"
              rel="noopener noreferrer"
              target="_blank"
              className="font-mono text-xs text-paper-dim underline-offset-4 transition-colors hover:text-paper"
            >
              Responsible gambling ↗
            </a>
          </div>
        </div>

        {/* Live scout dossier card */}
        <div className="hud-frame w-full max-w-sm shrink-0 rounded-2xl border border-line bg-dusk/60 p-5 shadow-panel backdrop-blur-xl">
          {loading || !profile ? (
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-dusk-2" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-dusk-2" />
              <div className="h-1.5 w-full animate-pulse rounded bg-dusk-2" />
              <div className="flex gap-2">
                <div className="h-14 flex-1 animate-pulse rounded-[10px] bg-dusk-2" />
                <div className="h-14 flex-1 animate-pulse rounded-[10px] bg-dusk-2" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-paper-dim">Scout dossier</span>
                <span className="rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[1px] text-gold">
                  Lv {profile.level}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="t-h4 text-paper">{profile.rankTitle}</span>
                <span className="t-data text-sm text-gold">{profile.totalXp} XP</span>
              </div>

              <div className="mt-3">
                <div className="flex justify-between font-mono text-[10px] text-paper-dim">
                  <span>To next rank</span>
                  <span>{Math.min(100, Math.round(((profile.totalXp % 100) / 100) * 100))}%</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-dusk-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-evidence transition-[width] duration-slow"
                    style={{ width: `${Math.min(100, ((profile.totalXp % 100) / 100) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[10px] border border-line bg-ink-2/60 p-3 text-center">
                  <div className="t-data text-xl font-semibold text-evidence">{completed}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">Missions</div>
                </div>
                <div className="rounded-[10px] border border-line bg-ink-2/60 p-3 text-center">
                  <div className="t-data text-xl font-semibold text-gold">
                    {earned}
                    <span className="text-xs text-paper-dim">/{totalBadges}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">Badges</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
