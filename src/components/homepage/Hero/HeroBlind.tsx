'use client'

import React, { useEffect, useRef, useState } from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type IntakeLine = {
  label: string
  /** Width of the redaction bar, in ch — the value itself never renders. */
  redactedCh: number
}

const intakeLines: IntakeLine[] = [
  { label: 'REV-SHARE OFFER', redactedCh: 9 },
  { label: 'CPA PROPOSAL', redactedCh: 7 },
  { label: 'PLACEMENT REQUEST', redactedCh: 11 },
  { label: 'DEAL TERMS', redactedCh: 8 },
]

/**
 * "The Blind" — the hero's spatial artifact. A commercial-intake ledger seen
 * from the grading side: every inbound figure is a physical redaction bar,
 * struck and sealed, because the graders have no field that could display it.
 * One orchestrated load sequence (lines settle, strikes draw, seal stamps),
 * then the artifact is still — no ambient loops. Depth is CSS 3D only: a
 * perspective plane with a shadow layer behind it, tilting a few degrees with
 * fine pointers. Replaces the earlier decorative review-card stack.
 */
export const HeroBlind: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || reducedMotion) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    const onMove = (event: MouseEvent) => {
      const rect = stage.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      setTilt({ x: x * 7, y: -y * 7 })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })

    stage.addEventListener('mousemove', onMove)
    stage.addEventListener('mouseleave', onLeave)
    return () => {
      stage.removeEventListener('mousemove', onMove)
      stage.removeEventListener('mouseleave', onLeave)
    }
  }, [reducedMotion])

  const animate = !reducedMotion

  return (
    <div className="blind-stage relative z-[3] mx-auto w-full max-w-[440px]" ref={stageRef}>
      <div
        aria-label="Commercial intake ledger, grading-side view: every inbound commission figure is redacted and sealed before it can reach the graders. Nothing crossed the wall."
        className="blind-plane relative"
        role="img"
        style={
          reducedMotion
            ? undefined
            : { transform: `rotateY(${-6 + tilt.x}deg) rotateX(${3 + tilt.y}deg)` }
        }
      >
        {/* Depth layer behind the panel — pure atmosphere, never content. */}
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-[var(--radius)] bg-dusk-2/50"
          style={{ transform: 'translateZ(-48px)' }}
        />
        <div className="relative rounded-[var(--radius)] border border-line bg-ink-2/80 p-6 shadow-[0_36px_70px_rgba(0,0,0,0.5)] sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[2px] text-paper-dim">
            <span>Commercial intake — grading-side view</span>
          </div>
          <ul aria-hidden="true" className="m-0 list-none space-y-4">
            {intakeLines.map((line, i) => (
              <li
                className="blind-line flex items-center justify-between gap-3 font-mono text-[11.5px] text-paper-dim sm:text-[12px]"
                data-animate={animate}
                key={line.label}
                style={animate ? { animationDelay: `${300 + i * 260}ms` } : undefined}
              >
                <span className="offer-struck relative" data-animate={animate}
                  style={animate ? { ['--strike-delay' as string]: `${560 + i * 260}ms` } : undefined}
                >
                  {line.label}:{' '}
                  <span
                    className="redaction align-middle"
                    style={{ width: `${line.redactedCh}ch` }}
                  />
                </span>
                <span className="whitespace-nowrap rounded-[3px] border border-gold/60 px-1.5 py-[1px] text-[9px] uppercase tracking-[1px] text-gold">
                  Sealed
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="font-mono text-[10.5px] uppercase tracking-[2px] text-paper-dim">
              Nothing crossed the wall
            </span>
            <VerificationSeal delayMs={1700} size={54} title="" />
          </div>
        </div>
      </div>
    </div>
  )
}
