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
  /** Optional blur-to-sharp entrance (premium text reveal). Reduced motion keeps a plain fade. */
  blur?: boolean
}

/**
 * Scroll-triggered reveal, orchestrated per section rather than scattered
 * ambient motion (per design-tokens.md motion principles). Fires once.
 *
 * Robustness: the hidden state (opacity-0 / translate) is only applied after
 * the client mounts (`mounted` gate), so SSR HTML and no-JS environments
 * always render content fully visible — never invisible text.
 *
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
  blur = false,
}) => {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const reducedMotion = useReducedMotion()

  // Must run before the observer attaches: once mounted, the hidden state
  // may apply; before that (SSR / first paint) content stays visible.
  // Elements already in the viewport at mount (e.g. above-the-fold use)
  // reveal synchronously here, so there is never a visible->hidden flash.
  useEffect(() => {
    setMounted(true)
    const node = ref.current
    if (node) {
      const rect = node.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh && rect.bottom > 0) {
        setVisible(true)
        onReveal?.()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const hidden = mounted && !visible

  return React.createElement(
    Tag,
    {
      className: cn(
        // Entrances use the slow+expo token pair (decelerating settle);
        // reduced motion keeps a fast plain fade — DESIGN-SYSTEM §5.
        // NB: Tailwind v4 translate-* use the modern `translate` property,
        // so the transition list must cover it (not just `transform`) or
        // the slide snaps while only opacity animates. filter is included
        // for the optional blur entrance (no-op when blur is off).
        'transition-[opacity,translate,filter] ease-expo',
        reducedMotion
          ? hidden
            ? 'duration-med opacity-0'
            : 'duration-med opacity-100'
          : hidden
            ? blur
              ? 'duration-slow opacity-0 translate-y-7 blur-[6px]'
              : 'duration-slow opacity-0 translate-y-7'
            : blur
              ? 'duration-slow opacity-100 translate-y-0 blur-0'
              : 'duration-slow opacity-100 translate-y-0',
        className,
      ),
      'data-visible': visible,
      ref,
      style: !reducedMotion && hidden && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children,
  )
}
