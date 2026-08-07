'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useMotion } from '@/providers/Motion'

import { pixelRatioForTier, QualityTier } from './quality'

// ---------------------------------------------------------------------------
// Fragment shader — the living "evidence field".
//
// Brand grammar: a sparse ledger of evidence points in amber, with rare
// emerald "sealed" points and a coral ripple that rings out from the cursor.
// The 4D axis: dots stretch with scroll velocity and drift in the direction
// of intent, then settle to still the moment the user stops — causal, never
// looping. A hair of pointer parallax lets the layer read as a surface with
// depth, not a flat texture.
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uVelocity;
  uniform vec2 uRippleOrigin;
  uniform float uRippleStart;
  uniform vec3 uColorA; // amber
  uniform vec3 uColorB; // emerald

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 suv = vec2(vUv.x * aspect, vUv.y);

    // Pointer parallax — the field shifts a hair against the cursor so the
    // layer reads as a surface with depth, not a flat texture.
    vec2 suvP = suv + (uPointer - 0.5) * 0.05;

    vec2 cellCount = vec2(24.0, 15.0);
    vec2 cell = floor(suvP * cellCount);
    vec2 cellUv = fract(suvP * cellCount) - 0.5;

    float h = hash(cell);
    float pulse = 0.5 + 0.5 * sin(uTime * (0.35 + h * 0.9) + h * 6.2831);

    // The 4D axis — dots stretch with scroll velocity and drift in the
    // direction of intent, then settle the moment the user stops.
    vec2 stretched = cellUv;
    stretched.y *= 1.0 + abs(uVelocity) * 1.8;
    stretched.y += uVelocity * 0.22;

    float d = length(stretched);
    float r = (0.17 + 0.07 * pulse) * (0.5 + 0.5 * h);
    float dotMask = smoothstep(r, r - 0.12, d);

    // Rare lit points read as "verified" — emerald, like the green pulse dot.
    float lit = step(0.88, h);
    vec3 col = mix(uColorA, uColorB, lit) * dotMask * (0.35 + 0.65 * pulse);

    // Cursor ripple — one causal ring per gesture: it ignites at the pointer
    // and expands once, then dies. Never loops.
    float pd = distance(suv, vec2(uRippleOrigin.x * aspect, uRippleOrigin.y));
    float ringAge = uTime - uRippleStart;
    float ring = 0.0;
    if (ringAge > 0.0 && ringAge < 1.5) {
      float ringEdge = ringAge * 0.42;
      float travel = 1.0 - ringAge / 1.5;
      ring = (1.0 - smoothstep(0.0, 0.035, abs(pd - ringEdge))) * travel * exp(-pd * 2.6);
    }
    col += uColorB * ring * 0.55;

    // Brief brightening while scrolling fast.
    col += uColorA * abs(uVelocity) * 0.12;

    // Vignette — melt into the ink background so the canvas has no edges.
    float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(aspect, 1.0)));
    float alpha = (dotMask * 0.55 + ring * 0.35 + abs(uVelocity) * 0.1) * vig;

    gl_FragColor = vec4(col, alpha);
  }
`

// Matches the live hero system (amber → emerald gradient headline on zinc).
const FIELD_AMBER = new THREE.Color('#fbbf24')
const FIELD_EMERALD = new THREE.Color('#34d399')

// One ripple = one gesture: ignites at the pointer, expands once, dies.
const RIPPLE_LIFETIME = 1.5
const RIPPLE_THROTTLE_MS = 240

const HeroScene: React.FC = () => {
  const { size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const time = useRef(0)
  const pointerTarget = useRef({ x: 0.5, y: 0.5 })
  const pointer = useRef({ x: 0.5, y: 0.5 })
  const velocity = useRef(0)
  const ripple = useRef({ origin: new THREE.Vector2(0.5, 0.5), start: -RIPPLE_LIFETIME })
  const lastRippleAt = useRef(0)
  const { lenis } = useMotion()

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.current = { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight }

      // Causal ripple, throttled — a new ring per gesture, never a loop.
      // Rings only ring out at rest: while the field is still moving from a
      // scroll, a ring would fight the directional stretch.
      const now = performance.now()
      if (now - lastRippleAt.current > RIPPLE_THROTTLE_MS && Math.abs(velocity.current) < 0.1) {
        lastRippleAt.current = now
        ripple.current.origin.set(pointerTarget.current.x, pointerTarget.current.y)
        ripple.current.start = time.current
      }
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return

    // Premium lag — the field trails the cursor, never snaps.
    const lerp = 1 - Math.pow(0.001, delta)
    pointer.current.x += (pointerTarget.current.x - pointer.current.x) * lerp
    pointer.current.y += (pointerTarget.current.y - pointer.current.y) * lerp

    // Asymmetric velocity smoothing — snap into motion (fast attack), settle
    // gracefully (slow release). Read live Lenis velocity directly, no
    // React re-render.
    const raw = lenis?.velocity ?? 0
    const target = raw / 15
    const rising = Math.abs(target) > Math.abs(velocity.current)
    const velocityLerp = rising ? 1 - Math.pow(0.0005, delta) : 1 - Math.pow(0.22, delta)
    velocity.current += (target - velocity.current) * velocityLerp

    time.current += delta
    material.uniforms.uTime.value = time.current
    material.uniforms.uResolution.value.set(size.width, size.height)
    material.uniforms.uPointer.value.set(pointer.current.x, pointer.current.y)
    material.uniforms.uVelocity.value = velocity.current
    material.uniforms.uRippleOrigin.value.copy(ripple.current.origin)
    material.uniforms.uRippleStart.value = ripple.current.start
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: 0 },
      uRippleOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleStart: { value: -RIPPLE_LIFETIME },
      uColorA: { value: FIELD_AMBER },
      uColorB: { value: FIELD_EMERALD },
    }),
    // size is re-read in useFrame; uniforms are created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

export const HeroField: React.FC<{ tier: QualityTier }> = ({ tier }) => {
  if (tier === 'off') return null
  return (
    <Canvas
      aria-hidden
      camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 10 }}
      dpr={pixelRatioForTier(tier)}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      }}
      style={{ pointerEvents: 'none' }}
    >
      <HeroScene />
    </Canvas>
  )
}

export default HeroField
