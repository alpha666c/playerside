'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * H2 (Wire Room) — the cursor is part of the room.
 *
 * Desktop-only (hover + fine pointer), zero React re-renders (refs + rAF),
 * transform-only animation:
 *   1. a soft evidence/coral "signal" glow that trails the pointer,
 *   2. magnetic pull on `[data-magnetic]` targets (subtle — the element
 *      leans toward the cursor by a few px, never more).
 *
 * Fully disabled under prefers-reduced-motion and on touch devices, so it
 * can never trap a user or burn battery on a phone.
 */
export const CursorSignal: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  // Gate on fine-pointer + no-reduced-motion, and react if the OS changes
  // either while the page is open (accessibility settings can flip live).
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = () => setEnabled(fine.matches && !reduced.matches)
    evaluate()
    fine.addEventListener('change', evaluate)
    reduced.addEventListener('change', evaluate)
    return () => {
      fine.removeEventListener('change', evaluate)
      reduced.removeEventListener('change', evaluate)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const glow = glowRef.current
    if (!glow) return

    let raf = 0
    let magRaf = 0
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const target = { x: pos.x, y: pos.y }
    let visible = false

    const applyGlow = () => {
      pos.x += (target.x - pos.x) * 0.18
      pos.y += (target.y - pos.y) * 0.18
      glow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
    }
    const loop = () => {
      applyGlow()
      raf = requestAnimationFrame(loop)
    }

    // Magnetic targets — the element leans toward the cursor, never jumps.
    let magneticEl: HTMLElement | null = null
    const magPos = { x: 0, y: 0 }
    const magTarget = { x: 0, y: 0 }
    const magLoop = () => {
      if (magneticEl) {
        magPos.x += (magTarget.x - magPos.x) * 0.22
        magPos.y += (magTarget.y - magPos.y) * 0.22
        magneticEl.style.transform = `translate3d(${magPos.x}px, ${magPos.y}px, 0)`
      }
      magRaf = requestAnimationFrame(magLoop)
    }

    const onPointerMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        visible = true
        glow.style.opacity = '1'
        pos.x = target.x
        pos.y = target.y
      }
    }
    const onMagneticMove = (e: PointerEvent) => {
      if (!magneticEl) return
      const r = magneticEl.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      const max = Math.min(7, Math.max(2, r.width * 0.06))
      magTarget.x = dx * max
      magTarget.y = dy * max
    }
    const clearMagnetic = () => {
      if (!magneticEl) return
      const el = magneticEl
      magneticEl = null
      el.style.transform = 'translate3d(0, 0, 0)'
      cancelAnimationFrame(magRaf)
      magRaf = 0
    }

    // Symmetric pair: leaving a magnetic target (or the window entirely)
    // always clears the state, so a hover can never leak and stick.
    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest('[data-magnetic]') as HTMLElement | null
      if (el && el !== magneticEl) {
        clearMagnetic()
        magneticEl = el
        magPos.x = 0
        magPos.y = 0
        if (!magRaf) magRaf = requestAnimationFrame(magLoop)
      }
    }
    const onPointerOut = (e: PointerEvent) => {
      if (!magneticEl) return
      const next = (e.relatedTarget as HTMLElement | null)?.closest('[data-magnetic]')
      if (next !== magneticEl) clearMagnetic()
    }
    const onMouseLeave = () => clearMagnetic()

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerover', onPointerOver, { passive: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('pointermove', onMagneticMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      if (magRaf) cancelAnimationFrame(magRaf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerover', onPointerOver)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('pointermove', onMagneticMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      aria-hidden
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 z-30 h-64 w-64 rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(circle, rgba(110,168,216,0.09) 0%, rgba(255,93,69,0.05) 35%, transparent 70%)',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  )
}

export default CursorSignal
