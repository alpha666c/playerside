'use client'

import { cn } from '@/utilities/ui'
import React, { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

type RevealProps = {
  as?: React.ElementType
  children: React.ReactNode
  className?: string
  /** Delay, in ms, applied to the transition once the element is in view. */
  delayMs?: number
  /** Called once, the moment the element becomes visible — used to fire dependent animations (e.g. bar fills). */
  onReveal?: () => void
  /** IntersectionObserver threshold. */
  threshold?: number
}

/**
 * Scroll-triggered reveal, orchestrated per section rather than scattered
 * ambient motion (per design-tokens.md motion principles). Fires once.
 * `prefers-reduced-motion` collapses the translateY entrance to a plain,
 * short opacity fade — never a hard cut, never a transform.
 */
export const Reveal: React.FC<RevealProps> = ({
  as: Tag = 'div',
  children,
  className,
  delayMs = 0,
  onReveal,
  threshold = 0.2,
}) => {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            onReveal?.()
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold])

  return React.createElement(
    Tag,
    {
      className: cn(
        'transition-[opacity,transform] ease-out',
        reducedMotion
          ? 'duration-300 opacity-0 data-[visible=true]:opacity-100'
          : 'duration-700 opacity-0 translate-y-7 data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0',
        className,
      ),
      'data-visible': visible,
      ref,
      style: !reducedMotion && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children,
  )
}
