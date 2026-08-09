'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { cumulativeXpForLevel, RANK_LADDER, rankTitleForLevel } from '@/gamification/curve'
import { XpBar } from './XpBar'
import { useMissions, type MissionEntry } from '@/hooks/useMissions'

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

const StatusChip: React.FC<{ status: MissionEntry['status'] }> = ({ status }) => {
  if (status === 'completed') {
    return (
      <span className="rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-gold">
        Complete
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="rounded-full border border-evidence/50 bg-evidence/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-evidence">
        In progress
      </span>
    )
  }
  return (
    <span className="rounded-full border border-line bg-dusk px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-paper-dim">
      Not started
    </span>
  )
}

const MissionRow: React.FC<{
  entry: MissionEntry
  starting: boolean
  recommended?: boolean
  onStart: (id: MissionEntry['quest']['id']) => void
}> = ({ entry, starting, recommended, onStart }) => {
  const { quest, status, stepIndex, totalSteps } = entry
  const pct = totalSteps > 0 ? Math.round((stepIndex / totalSteps) * 100) : 0
  const busy = starting

  return (
    <div className="rounded-[var(--radius)] border border-line bg-dusk/60 p-5 transition-colors hover:border-gold/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[17px] font-semibold leading-tight text-paper sm:text-[19px]">{quest.title}</h3>
            <StatusChip status={status} />
            {recommended ? (
              <span className="rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-gold">
                Recommended first mission
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-paper-dim sm:text-[13.5px]">
            {quest.brief}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="font-mono text-[12px] text-gold">+{quest.rewardXp} XP</span>
          <span className="hidden font-mono text-[11px] text-paper-dim/70 sm:inline">{totalSteps} steps</span>
        </div>
      </div>

      {status === 'in_progress' ? (
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-[11px] text-paper-dim">
            <span>Step {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}</span>
            <span>{pct}%</span>
          </div>
          <div
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-dusk"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={`${quest.title} progress`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-evidence transition-[width] duration-slow"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-paper-dim/70">
          {quest.pageTarget === 'casino-review' ? 'Target: casino reviews' : quest.pageTarget === 'crypto-review' ? 'Target: crypto reviews' : 'Target: homepage'}
        </p>
        {status === 'not_started' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStart(quest.id)}
            className="rounded-full bg-evidence px-5 py-2 text-[12.5px] font-medium text-ink transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start mission'}
          </button>
        ) : status === 'in_progress' ? (
          <Link
            href={quest.pageTarget === 'crypto-review' ? '/crypto-casinos' : '/casinos'}
            className="rounded-full border border-evidence/60 px-5 py-2 text-[12.5px] font-medium text-evidence transition-colors hover:bg-evidence/10"
          >
            Continue on a review page →
          </Link>
        ) : (
          <span className="font-mono text-[11px] text-paper-dim/70">Logged to the ledger ✓</span>
        )}
      </div>
    </div>
  )
}

/** The /missions board: dossier strip, rank ladder, badges, mission roster. */
export const MissionsOverview: React.FC = () => {
  const { data, loading, error, startingId, actions } = useMissions()

  const ladder = useMemo(() => {
    const level = data?.profile.level ?? 1
    return RANK_LADDER.map((title, i) => {
      const rungLevel = i + 1
      return {
        title,
        level: rungLevel,
        xpRequired: cumulativeXpForLevel(rungLevel),
        reached: level >= rungLevel,
        current: rankTitleForLevel(level) === title,
      }
    })
  }, [data?.profile.level])

  const earnedCount = data?.badges.filter((b) => b.earned).length ?? 0
  const totalMissions = data?.missions.length ?? 0
  const completedMissions = data?.missions.filter((m) => m.status === 'completed').length ?? 0

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-10 max-w-[860px] sm:mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-evidence">Vex Missions · the board</span>
          <span className="rounded-full border border-gold/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-gold">
            18+
          </span>
        </div>
        <h1 className="mt-4 text-[32px] leading-[1.08] sm:text-[42px] lg:text-[52px]">
          The mission board
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-paper-dim sm:text-lg">
          Every mission teaches one concrete casino-literacy skill — reading a wagering
          requirement, computing what a bonus really costs, and knowing when the smart play
          is to step away. No hype. No &ldquo;guaranteed&rdquo; anything. Just recon you can take
          to the terms page, Scout.
        </p>
      </div>

      {/* Dossier strip */}
      <div className="container mb-12 max-w-[860px] sm:mb-14">
        {loading && !data ? (
          <div className="rounded-[var(--radius)] border border-line bg-dusk/60 p-5">
            <p className="font-mono text-[12px] text-paper-dim">Opening the board…</p>
          </div>
        ) : error && !data ? (
          <div className="rounded-[var(--radius)] border border-coral/40 bg-coral/10 p-5">
            <p className="text-[13px] text-paper">The board is out of reach right now. Try again in a moment, Scout.</p>
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-line bg-dusk/60 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-evidence">Scout dossier</span>
                <span className="font-mono text-[11px] text-paper-dim">{data.profile.completedMissions} missions done</span>
              </div>
              <div className="mt-3">
                <XpBar totalXp={data.profile.totalXp} level={data.profile.level} rankTitle={data.profile.rankTitle} />
                {data.streak ? (
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 font-mono text-[10.5px]">
                    <span className="text-paper-dim">
                      {data.streak.current > 0
                        ? `🔥 ${data.streak.current}-day recon streak`
                        : 'No streak yet — a mission today starts one'}
                    </span>
                    <span className="text-paper-dim/80">
                      {data.streak.freezesAvailable > 0
                        ? `${data.streak.freezesAvailable} Focus Freeze`
                        : 'Longest: ' + (data.streak.longest > 0 ? data.streak.longest + ' days' : '—')}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2 rounded-[var(--radius)] border border-line bg-dusk/60 p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-paper-dim/70">Badges</span>
                <span className="font-mono text-[20px] text-gold">{earnedCount}<span className="text-[12px] text-paper-dim"> / {data.badges.length}</span></span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-paper-dim/70">Missions</span>
                <span className="font-mono text-[20px] text-evidence">{completedMissions}<span className="text-[12px] text-paper-dim"> / {totalMissions}</span></span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Rank ladder */}
      <div className="container mb-12 max-w-[860px] sm:mb-14">
        <h2 className="mb-5 text-[22px] sm:text-[26px]">Rank ladder</h2>
        <ol className="space-y-2">
          {ladder.map((rung) => (
            <li
              key={rung.title}
              aria-current={rung.current ? 'true' : undefined}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border px-4 py-3 transition-colors ${
                rung.current
                  ? 'border-gold/60 bg-gold/10'
                  : rung.reached
                    ? 'border-line bg-dusk/60'
                    : 'border-line/60 bg-dusk/30 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] ${rung.reached ? 'border-gold/50 text-gold' : 'border-line text-paper-dim'}`}>
                  {rung.reached ? '✓' : rung.level}
                </span>
                <div>
                  <p className={`text-[14px] font-medium leading-tight ${rung.reached ? 'text-paper' : 'text-paper-dim'}`}>
                    {rung.title}
                    {rung.current ? <span className="ml-2 font-mono text-[10px] uppercase tracking-[1.5px] text-gold">You are here</span> : null}
                  </p>
                  <p className="font-mono text-[10.5px] text-paper-dim/70">Lv {rung.level} · {rung.xpRequired.toLocaleString('en-US')} XP</p>
                </div>
              </div>
              {rung.current ? (
                <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-paper-dim/60">
                  {rung.level === RANK_LADDER.length ? 'Top of the ladder' : `Next: ${RANK_LADDER[rung.level]}`}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {/* Badges */}
      <div className="container mb-12 max-w-[860px] sm:mb-14">
        <h2 className="mb-5 text-[22px] sm:text-[26px]">Badges</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.badges ?? []).map((badge) => (
            <li
              key={badge.id}
              className={`rounded-[var(--radius)] border bg-dusk/60 p-4 transition-colors ${
                badge.earned ? 'border-gold/45 shadow-[0_0_18px_-6px_rgba(201,161,90,0.35)]' : 'border-line/60 opacity-60'
              }`}
              title={badge.earned ? badge.blurb : `${badge.blurb} — locked`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[22px]" aria-hidden>{badge.icon}</span>
                {badge.earned ? (
                  <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-gold">Earned</span>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-paper-dim/60">Locked</span>
                )}
              </div>
              <p className="mt-2 text-[13.5px] font-semibold leading-tight text-paper">{badge.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-paper-dim">{badge.blurb}</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[1.5px] text-paper-dim/50">{TIER_LABELS[badge.tier]}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Mission roster */}
      <div className="container max-w-[860px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[22px] sm:text-[26px]">Missions</h2>
          <p className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Missions are played inside the dock on review pages
          </p>
        </div>

        {error && data ? (
          <div className="mb-4 rounded-[var(--radius)] border border-coral/40 bg-coral/10 p-4">
            <p className="text-[13px] text-paper">{error} — refresh the board to retry.</p>
          </div>
        ) : null}

        <div className="space-y-4">
          {(data?.missions ?? []).map((entry) => (
            <MissionRow
              key={entry.quest.id}
              entry={entry}
              recommended={(data?.profile.completedMissions ?? 0) === 0 && entry.quest.missionId === 'license_hawk'}
              starting={startingId === entry.quest.id}
              onStart={actions.startMission}
            />
          ))}
        </div>

        {!loading && data && data.missions.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-dusk/60 p-8 text-center">
            <p className="text-[15px] text-paper">No missions on the board yet, Scout.</p>
            <p className="mt-1 text-[13px] text-paper-dim">Check back soon — the Odds Desk is drafting briefs.</p>
          </div>
        ) : null}

        {/* RG adjacency — required on any surface with mission CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-line/60 bg-dusk/40 px-5 py-4">
          <p className="text-[12px] leading-relaxed text-paper-dim">
            Missions teach you to read the terms — they are not gambling advice and never
            encourage chasing a loss. If gambling stops being a game for you, help is free,
            24/7, confidential.
          </p>
          <a
            href="https://www.gambleaware.org"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gold/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[1.5px] text-gold transition-colors hover:bg-gold/10"
          >
            GambleAware ↗
          </a>
        </div>
      </div>
    </div>
  )
}
