'use client'

import React, { useMemo, useState } from 'react'

import {
  computeWageringReality,
  formatEur,
  type WageringAppliesTo,
} from '@/lib/wagering'

/**
 * Phase 1 (F1.5) — the "real value" calculator. Uses the EXACT wagering
 * terms from the bonus doc (multiplier, applies-to, contributing games).
 * The match % is an explicit user assumption, labelled as such — the brand
 * never invents terms, and neither does this calculator.
 */
export const BonusValueCalculator: React.FC<{
  bonusTitle: string
  multiplier: number
  appliesTo: WageringAppliesTo
  contributingGames?: { gameCategory: string; contributionPercent: number }[]
  timeLimit?: string | null
}> = ({ bonusTitle, multiplier, appliesTo, contributingGames = [], timeLimit }) => {
  const [deposit, setDeposit] = useState(100)
  const [match, setMatch] = useState(100)

  const reality = useMemo(
    () => computeWageringReality({ deposit, multiplier, appliesTo, matchPercent: match }),
    [deposit, multiplier, appliesTo, match],
  )

  const slowestGames = [...contributingGames].sort(
    (a, b) => a.contributionPercent - b.contributionPercent,
  )

  return (
    <section
      aria-label={`Bonus reality check — ${bonusTitle}`}
      className="rounded-[var(--radius)] border border-line bg-ink-2/60 p-5 sm:p-6"
      id="bonuses"
    >
      <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
        Bonus reality check
      </p>
      <h2 className="mb-1 text-[18px] font-semibold text-paper sm:text-[20px]">{bonusTitle}</h2>
      <p className="mb-5 text-[12.5px] text-paper-dim">
        What clearing the {multiplier}× wagering actually takes — with your own numbers.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Deposit (€)
          </span>
          <input
            className="w-full rounded-lg border border-line bg-dusk px-3 py-2 text-paper outline-hidden focus:border-evidence"
            min={0}
            onChange={(e) => setDeposit(Math.max(0, Number(e.target.value) || 0))}
            step={10}
            type="number"
            value={deposit}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Bonus match: {match}%
          </span>
          <input
            aria-label="Assumed bonus match percentage"
            className="mt-2 w-full accent-[var(--evidence)]"
            max={200}
            min={0}
            onChange={(e) => setMatch(Number(e.target.value))}
            step={10}
            type="range"
            value={match}
          />
        </label>
      </div>

      <dl className="m-0 mt-5 grid gap-x-6 gap-y-2 font-mono text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Bonus value
          </dt>
          <dd className="m-0 text-paper">{formatEur(reality.bonusAmount)}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            {appliesTo === 'bonus_plus_deposit' ? 'Wagering base (deposit + bonus)' : 'Wagering base (bonus only)'}
          </dt>
          <dd className="m-0 text-paper">{formatEur(reality.baseAmount)}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Required turnover
          </dt>
          <dd className="m-0 text-gold">{formatEur(reality.requiredTurnover)}</dd>
        </div>
      </dl>

      {slowestGames.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Contributing games — watch the slow ones
          </p>
          <div className="flex flex-wrap gap-2">
            {slowestGames.map((g, i) => (
              <span
                className="rounded-full border border-line px-2.5 py-1 text-[11px] text-paper-dim"
                key={i}
              >
                {g.gameCategory} — {g.contributionPercent}%
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {timeLimit ? (
        <p className="mb-0 mt-3 font-mono text-[11px] text-paper-dim">
          Clear it within: {timeLimit}. A stake above the cap voids the bonus — the fine print is
          the whole game.
        </p>
      ) : null}

      <p className="mb-0 mt-4 border-t border-line pt-3 text-[11.5px] italic text-paper-dim">
        18+. Gambling can be addictive — play responsibly. The match % above is your assumption;
        the multiplier and applies-to are the operator&apos;s exact published terms.
      </p>
    </section>
  )
}
