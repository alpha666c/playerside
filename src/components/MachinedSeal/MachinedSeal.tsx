'use client'

import { Canvas } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SealScene, type SealSceneApi } from './SealScene'

const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

/** Coarse capability check — low core count falls back to the flat seal rather than risk a stutter on the signature moment. Viewport width is not a power signal (an iPhone SE has the same GPU class as larger iPhones), so it no longer forces the fallback. */
const isLowPowerDevice = (): boolean => (navigator.hardwareConcurrency ?? 8) <= 2

type MachinedSealProps = {
  size?: number
  title: string
}

/**
 * Playerside's one true signature 3D moment: the Verification Seal as a
 * real machined object — a gold stamp-press descends, strikes the seal, and
 * retracts once on reveal; afterward the seal can be dragged (or, for
 * keyboard users, nudged with arrow keys) to inspect the engraved collar.
 *
 * Fully optional and enhancing — the score/verified state it decorates is
 * always rendered as ordinary DOM text beside it, never only inside the
 * canvas. Falls back to the existing flat SVG `VerificationSeal` (already
 * accessible and reduced-motion safe) whenever WebGL is unavailable,
 * `prefers-reduced-motion` is set, or the device looks low-power — so the
 * fallback is never a lesser version of the real content, just a lesser
 * version of the flourish.
 */
export const MachinedSeal: React.FC<MachinedSealProps> = ({ size = 140, title }) => {
  const reducedMotion = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [webglOk, setWebglOk] = useState(true)
  const [lowPower, setLowPower] = useState(false)
  const [inView, setInView] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [frameloop, setFrameloop] = useState<'always' | 'demand'>('always')
  const containerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ dragging: boolean; lastX: number }>({ dragging: false, lastX: 0 })
  const sceneApi = useRef<SealSceneApi>({ rotate: () => {} })

  useEffect(() => {
    setWebglOk(supportsWebGL())
    setLowPower(isLowPowerDevice())
    setReady(true)
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(node)
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const useFallback = !ready || !webglOk || reducedMotion || lowPower

  const onPointerDown = (event: React.PointerEvent) => {
    dragState.current = { dragging: true, lastX: event.clientX }
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragState.current.dragging) return
    const deltaX = event.clientX - dragState.current.lastX
    dragState.current.lastX = event.clientX
    sceneApi.current.rotate(deltaX * 0.012)
  }
  const onPointerUp = () => {
    dragState.current.dragging = false
  }
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') sceneApi.current.rotate(-0.25)
    if (event.key === 'ArrowRight') sceneApi.current.rotate(0.25)
  }

  const canvasContent = useMemo(
    () => (
      <Canvas
        camera={{ fov: 32, position: [0, 0, 15] }}
        dpr={[1, 1.5]}
        frameloop={hidden || !inView ? 'never' : frameloop}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <SealScene apiRef={sceneApi} onSettled={() => setFrameloop('demand')} />
      </Canvas>
    ),
    [frameloop, hidden, inView],
  )

  if (useFallback) {
    return <VerificationSeal active size={size} title={title} />
  }

  return (
    <div
      aria-label={title}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={containerRef}
      role="img"
      style={{ height: size, width: size }}
      tabIndex={0}
    >
      {canvasContent}
    </div>
  )
}
