'use client'

import React, { useEffect, useRef, useState } from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type HeroCardData = {
  name: string
  score: number
  market: string
}

const cardTransformClasses = ['hero-card-a', 'hero-card-b', 'hero-card-c']

/**
 * The hero's signature 3D-perspective card stack: three review cards tilted
 * in space, gently parallaxing with the cursor, with the middle card taking
 * the Verification Seal stamp on load. Purely presentational data in —
 * sourced from the Homepage global's `sampleOperators` (same illustrative
 * operators reused in the sample-reviews grid further down the page).
 */
export const HeroCardStack: React.FC<{ cards: HeroCardData[] }> = ({ cards }) => {
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
      setTilt({ x: x * 10, y: -y * 10 })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })

    stage.addEventListener('mousemove', onMove)
    stage.addEventListener('mouseleave', onLeave)
    return () => {
      stage.removeEventListener('mousemove', onMove)
      stage.removeEventListener('mouseleave', onLeave)
    }
  }, [reducedMotion])

  return (
    <div className="hero-stage relative z-[3] h-[340px] sm:h-[400px] lg:h-[460px]" ref={stageRef}>
      <div
        className="hero-stack absolute inset-0"
        style={
          reducedMotion ? undefined : { transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }
        }
      >
        {cards.slice(0, 3).map((card, i) => {
          const isStamped = i === 1
          return (
            <div
              className={`hero-card absolute top-1/2 left-1/2 w-[210px] sm:w-[250px] lg:w-[300px] rounded-[var(--radius)] border border-line bg-dusk p-4 sm:p-5 lg:p-[22px] ${cardTransformClasses[i]}`}
              key={card.name}
              style={{ zIndex: i === 1 ? 5 : i === 2 ? 2 : 3 }}
            >
              <h3 className="mb-1.5 font-serif text-base sm:text-lg lg:text-[19px] font-semibold text-paper">
                {card.name}
              </h3>
              <div className="font-mono text-xs sm:text-sm text-gold">
                {card.score.toFixed(1)} / 10 &mdash; {card.market}
              </div>
              <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-dusk-2">
                <div
                  className="h-full rounded-full bg-coral"
                  style={{ width: `${(card.score / 10) * 100}%` }}
                />
              </div>
              {isStamped ? (
                <VerificationSeal
                  className="absolute -right-3.5 -top-[18px]"
                  delayMs={300}
                  size={64}
                  title={`${card.name} — verified score, evidence logged`}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
