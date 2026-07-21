'use client'

import React, { useId, useState } from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { PRESSURE_TIERS, SEALED_SCORE } from './tiers'

const evidenceLines = [
  'EV-041 · WITHDRAWAL TEST — 6H 11M, LOGGED',
  'EV-042 · SUPPORT RESPONSE — 3M 02S, LOGGED',
  'EV-043 · LICENSE CHECK — VERIFIED AT REGULATOR',
]

/**
 * The Pressure Test — Playerside's signature interaction. The user performs
 * the attack the industry is suspected of ("pay more, rank higher"): a slider
 * escalates simulated commission offers toward the grading side, every offer
 * is struck and sealed at the boundary, and the score never moves. The
 * evaluator panel deliberately has no animation of any kind — its stillness
 * is the product truth (ORG.md §3.2) made physical.
 *
 * Interaction is a native <input type="range">: drag, tap the track, or use
 * arrow keys — no hover required. A polite live region narrates each blocked
 * offer for screen readers. Reduced motion renders offers pre-settled with no
 * entrance or strike animation. No WebGL anywhere — DOM/SVG/CSS only.
 */
export const PressureTest: React.FC = () => {
  const [pressure, setPressure] = useState(0)
  const reducedMotion = useReducedMotion()
  const sliderId = useId()

  const activeOffers = PRESSURE_TIERS.slice(1, pressure + 1)
  const animate = !reducedMotion

  return (
    <div className="rounded-[var(--radius)] border border-line bg-ink-2/60">
      <div className="grid md:grid-cols-[1fr_auto_1.1fr]">
        {/* Grading side — sealed, and permanently still. */}
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[2px] text-paper-dim">
            <span>Grading side — sealed</span>
            <VerificationSeal size={40} title="Grading side sealed — commission data cannot enter" />
          </div>
          <div className="mb-1 font-mono text-[42px] leading-none text-gold sm:text-[52px]">
            {SEALED_SCORE}
            <span className="ml-1.5 text-base text-paper-dim">/ 10</span>
          </div>
          <p className="mb-6 text-[13.5px] text-paper-dim">
            Set by weighted evidence before any commercial terms exist.
          </p>
          <ul className="m-0 list-none space-y-2.5 border-t border-line pt-4 font-mono text-[11.5px] text-evidence sm:text-[12px]">
            {evidenceLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-4 text-[13px] italic text-paper-dim">
            This panel never animates. Nothing on the other side can move it.
          </p>
        </div>

        {/* The wall itself. */}
        <div
          aria-hidden="true"
          className="mx-6 h-[2px] md:mx-0 md:my-6 md:h-auto md:w-[2px]"
          style={{
            background:
              'repeating-linear-gradient(var(--wall-angle, 90deg), var(--gold) 0 10px, transparent 10px 20px)',
          }}
          data-wall-line
        />

        {/* Commercial side — the simulation. */}
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase tracking-[2px] text-paper-dim">
            <span>Commercial side</span>
            <span className="rounded-full border border-coral/50 px-2.5 py-0.5 text-coral">
              Simulation
            </span>
          </div>

          <label
            className="mb-2 block text-[14.5px] font-semibold text-paper"
            htmlFor={sliderId}
          >
            Try to buy the score — raise the commission.
          </label>
          <input
            aria-valuetext={`${PRESSURE_TIERS[pressure].label}. ${pressure} offer${pressure === 1 ? '' : 's'} blocked, score unchanged at ${SEALED_SCORE}.`}
            className="pressure-slider w-full"
            id={sliderId}
            max={PRESSURE_TIERS.length - 1}
            min={0}
            onChange={(event) => setPressure(Number(event.target.value))}
            step={1}
            type="range"
            value={pressure}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[10.5px] uppercase tracking-[1px] text-paper-dim">
            <span>{PRESSURE_TIERS[0].label}</span>
            <span>{PRESSURE_TIERS[PRESSURE_TIERS.length - 1].label}</span>
          </div>

          <ul className="m-0 mt-6 min-h-[148px] list-none space-y-3 sm:min-h-[164px]">
            {activeOffers.length === 0 ? (
              <li className="text-[13.5px] italic text-paper-dim">
                No offers on the table. The wall doesn&rsquo;t care either way.
              </li>
            ) : (
              activeOffers.map((tier, i) => {
                const isNewest = i === activeOffers.length - 1
                return (
                  <li
                    className="offer-line font-mono text-[12px] leading-relaxed text-paper-dim sm:text-[12.5px]"
                    data-animate={animate && isNewest}
                    key={tier.label}
                  >
                    <span className="offer-struck relative inline pr-1" data-animate={animate && isNewest}>
                      {tier.offer}
                    </span>
                    <span className="ml-1 inline-flex translate-y-[1px] items-center gap-1 whitespace-nowrap rounded-[3px] border border-gold/60 px-1.5 py-[1px] text-[9.5px] uppercase tracking-[1px] text-gold">
                      Sealed
                    </span>
                  </li>
                )
              })
            )}
          </ul>

          <p
            aria-live="polite"
            className="mt-5 border-t border-line pt-4 font-mono text-[12px] uppercase tracking-[1.5px] text-paper sm:text-[13px]"
          >
            Offers blocked: <span className="text-coral">{pressure}</span> · Score moved:{' '}
            <span className="text-gold">0.0</span>
          </p>
        </div>
      </div>
    </div>
  )
}
