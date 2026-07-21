'use client'

import { cn } from '@/utilities/ui'
import React, { useEffect, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

type VerificationSealProps = {
  className?: string
  /**
   * Controlled trigger — pass `true` once the seal should stamp in (e.g. from
   * `Reveal`'s `onReveal`). Omit to have the seal stamp itself in on mount.
   */
  active?: boolean
  /** Delay before the auto (uncontrolled) stamp fires. Ignored when `active` is passed. */
  delayMs?: number
  size?: number
  /** Accessible label. The seal is decorative next to a labelled score by default. */
  title?: string
}

/**
 * Playerside's signature Verification Seal — a hand-drawn stamp motif that
 * appears only next to evidence-backed scores. Reused wherever a verified
 * score shows up (homepage now; review pages later). Stamp motion is scale +
 * slight rotation + a small bounce ("stamp impact"), collapsing to a plain
 * opacity fade under `prefers-reduced-motion`.
 */
export const VerificationSeal: React.FC<VerificationSealProps> = ({
  className,
  active,
  delayMs = 0,
  size = 72,
  title = 'Verified — evidence logged',
}) => {
  const reducedMotion = useReducedMotion()
  const [autoActive, setAutoActive] = useState(active === undefined ? false : active)

  useEffect(() => {
    if (active !== undefined) return
    const timer = setTimeout(() => setAutoActive(true), reducedMotion ? 0 : delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs, reducedMotion])

  const isActive = active === undefined ? autoActive : active

  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn('seal-stamp', className)}
      data-active={isActive}
      data-reduced-motion={reducedMotion}
      height={size}
      width={size}
      viewBox="0 0 240 240"
    >
      {title ? <title>{title}</title> : null}
      <circle cx="120" cy="120" r="112" fill="var(--ink)" stroke="var(--gold)" strokeWidth="5" />
      <circle
        cx="120"
        cy="120"
        r="98"
        fill="none"
        stroke="var(--gold)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="2 5"
      />
      <path
        d="M74,124 L104,156 L166,84"
        fill="none"
        stroke="var(--coral)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
