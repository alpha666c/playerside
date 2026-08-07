'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

import { setVelocity } from './store'

// Registered once at module scope. useGSAP makes GSAP lifecycles React-safe
// (StrictMode double-invoke + cleanup); ScrollTrigger drives the pinned
// scrub choreography (protocol scrub, review walkthrough).
gsap.registerPlugin(ScrollTrigger, useGSAP)

type MotionContextValue = {
  /**
   * Lenis instance — null on the server, during SSR, or when reduced motion
   * is on. The identity is stable for the provider's lifetime, so consumers
   * (e.g. a canvas reading `lenis.velocity` per frame) never re-render.
   */
  lenis: Lenis | null
  /** True when the OS asks for reduced motion. */
  reducedMotion: boolean
}

const MotionContext = createContext<MotionContextValue | null>(null)

export const useMotion = (): MotionContextValue => {
  const ctx = useContext(MotionContext)
  if (!ctx) throw new Error('useMotion must be used within <MotionProvider>')
  return ctx
}

/**
 * Motion backbone — Lenis smooth scroll synced to the GSAP ticker, so
 * ScrollTrigger pins/scrubs and Lenis share one frame clock (no jitter).
 *
 * Design-tokens motion principles apply: reduced motion collapses the whole
 * layer — no Lenis instance is even created, so nothing hijacks the native
 * scroll for users who asked for less movement.
 */
export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reducedMotion = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return

    const lenis = new Lenis({
      duration: 1.1,
      // Ease-out weight — a denser, premium deceleration (Apple-ish, not floaty).
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch stays native (syncTouch defaults to false).
    })

    // Push normalized velocity to the external store (see store.ts).
    lenis.on('scroll', () => {
      setVelocity(gsap.utils.clamp(-1, 1, lenis.velocity / 15))
    })
    setLenis(lenis)

    // One clock: drive Lenis from GSAP's ticker so ScrollTrigger stays locked.
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // Route-aware anchor handling (header nav, in-page links) via Lenis.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href')!.slice(1)
      const el = id ? document.getElementById(id) : null
      if (el) {
        event.preventDefault()
        lenis.scrollTo(el, { offset: -72, duration: 1.2 })
      }
    }
    document.addEventListener('click', onAnchorClick)

    ScrollTrigger.refresh()

    return () => {
      document.removeEventListener('click', onAnchorClick)
      gsap.ticker.remove(raf)
      lenis.destroy()
      setLenis(null)
      setVelocity(0)
      ScrollTrigger.refresh()
    }
  }, [reducedMotion])

  // Recompute trigger positions after client-side route changes.
  useEffect(() => {
    if (reducedMotion) return
    const refresh = () => ScrollTrigger.refresh()
    // Let the new page paint first.
    const id = window.setTimeout(refresh, 150)
    return () => window.clearTimeout(id)
  }, [pathname, reducedMotion])

  const value = useMemo(() => ({ lenis, reducedMotion }), [lenis, reducedMotion])

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}
