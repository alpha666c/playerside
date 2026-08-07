'use client'

import Link from 'next/link'
import React from 'react'

import { useMissions } from '@/hooks/useMissions'

/**
 * Homepage bridge to the Vex Missions board. Pulls the live scout dossier
 * from the missions API and teases the rank ladder + badge wall with a single
 * CTA into /missions. Fail-soft: if the API is unreachable, the section still
 * renders as a static invite.
 */
export const MissionsPromo: React.FC = () => {
  const { data, loading } = useMissions()

  const profile = data?.profile
  const earned = data?.badges.filter((b) => b.earned).length ?? 0
  const totalBadges = data?.badges.length ?? 8
  const completed = profile?.completedMissions ?? 0

  return (
    <section className="relative isolate overflow-hidden border-y border-zinc-800/80 bg-zinc-950">
      {/* Ambient brand glow — the one place the homepage borrows the Vex palette. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(201,161,90,0.10),transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" aria-hidden />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-16">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[2px] text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            Vex Missions · learn the terms, earn the rank
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Read the fine print like a scout.
            <span className="block bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400 bg-clip-text text-transparent">
              Rank up while you learn.
            </span>
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
            Every mission teaches one casino-literacy skill — decoding wagering requirements,
            spotting bonus traps, and knowing when the smart play is to walk away. No hype,
            no &ldquo;guaranteed&rdquo; anything. Just recon you can take to the terms page.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/missions"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
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
              className="text-xs font-mono text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300"
            >
              Responsible gambling ↗
            </a>
          </div>
        </div>

        {/* Live scout dossier card */}
        <div className="w-full max-w-sm shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl backdrop-blur-xl">
          {loading || !profile ? (
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-zinc-800" />
              <div className="h-1.5 w-full animate-pulse rounded bg-zinc-800" />
              <div className="flex gap-2">
                <div className="h-14 flex-1 animate-pulse rounded-lg bg-zinc-800" />
                <div className="h-14 flex-1 animate-pulse rounded-lg bg-zinc-800" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-500">Scout dossier</span>
                <span className="rounded-full border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[1px] text-amber-400">
                  Lv {profile.level}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-xl font-bold text-white">{profile.rankTitle}</span>
                <span className="font-mono text-sm text-amber-400">{profile.totalXp} XP</span>
              </div>

              <div className="mt-3">
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>To next rank</span>
                  <span>{Math.min(100, Math.round(((profile.totalXp % 100) / 100) * 100))}%</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-[width] duration-700"
                    style={{ width: `${Math.min(100, ((profile.totalXp % 100) / 100) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400">{completed}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Missions</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{earned}<span className="text-xs text-zinc-500">/{totalBadges}</span></div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Badges</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
