'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

import { getQualityTier, QualityTier, webglSupported } from './HeroField/quality'

// three.js stays out of the server bundle and out of the initial client
// chunk — the hero text (the real LCP) paints first, the field mounts after.
const HeroField = dynamic(() => import('./HeroField/HeroField'), {
  ssr: false,
  loading: () => null,
})

/**
 * The living evidence field — a decorative WebGL background for the hero.
 * aria-hidden (it is atmosphere, never content) and pointer-events-none.
 *
 * Gating (in order): reduced motion → nothing. No WebGL / weak device → the
 * existing ambient Glow layer already carries the atmosphere, so nothing.
 * Otherwise → render at the tier's capped pixel ratio.
 */
export const HeroFieldView: React.FC = () => {
  const reducedMotion = useReducedMotion()
  const [tier, setTier] = useState<QualityTier>('off')

  useEffect(() => {
    if (reducedMotion) return
    if (!webglSupported()) return
    setTier(getQualityTier())
  }, [reducedMotion])

  if (tier === 'off') return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0" data-hero-field={tier}>
      <HeroField tier={tier} />
    </div>
  )
}
