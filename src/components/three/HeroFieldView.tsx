'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

import { StaticEvidenceField } from './StaticEvidenceField'
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
 * Gating (in order): reduced motion → the WebGL layer is NOT created; the
 * hero falls back to the static evidence-field texture (same dot grammar,
 * zero animation) so the atmosphere survives without motion. No WebGL /
 * weak device → the same static field. Otherwise → render at the tier's
 * capped pixel ratio.
 */
export const HeroFieldView: React.FC = () => {
  const reducedMotion = useReducedMotion()
  const [tier, setTier] = useState<QualityTier>('off')

  useEffect(() => {
    if (reducedMotion) return
    if (!webglSupported()) return
    setTier(getQualityTier())
  }, [reducedMotion])

  if (tier !== 'off') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0" data-hero-field={tier}>
        <HeroField tier={tier} />
      </div>
    )
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0" data-hero-field="static">
      <StaticEvidenceField />
    </div>
  )
}
