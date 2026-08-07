'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useMotion } from '@/providers/Motion'

import { pixelRatioForTier, QualityTier } from './quality'

// ---------------------------------------------------------------------------
// Fragment shader — the living "evidence field".
//
// Brand grammar: a sparse ledger of evidence points in --evidence blue, with
// rare coral "sealed" points and a coral ripple that rings out from the
// cursor. The 4D axis: dots stretch vertically with scroll velocity (the
// field accelerates with the user's intent) and everything settles to still
// the moment the user stops — causal, never looping.
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
  uniform vec3 uColorA; // amber
  uniform vec3 uColorB; // emerald

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 suv = vec2(vUv.x * aspect, vUv.y);

    vec2 cellCount = vec2(24.0, 15.0);
    vec2 cell = floor(suv * cellCount);
    vec2 cellUv = fract(suv * cellCount) - 0.5;

    float h = hash(cell);
    float pulse = 0.5 + 0.5 * sin(uTime * (0.35 + h * 0.9) + h * 6.2831);

    // The 4D axis — dots elongate with scroll velocity, then settle.
    vec2 stretched = cellUv;
    stretched.y *= 1.0 + abs(uVelocity) * 1.8;

    float d = length(stretched);
    float r = (0.17 + 0.07 * pulse) * (0.5 + 0.5 * h);
    float dotMask = smoothstep(r, r - 0.12, d);

    // Rare lit points read as "verified" — emerald, like the green pulse dot.
    float lit = step(0.88, h);
    vec3 col = mix(uColorA, uColorB, lit) * dotMask * (0.35 + 0.65 * pulse);

    // Cursor ripple — a slow ring that fades with distance.
    float pd = distance(vUv, uPointer);
    float ripple = smoothstep(0.34, 0.0, abs(sin(pd * 13.0 - uTime * 1.5))) * exp(-pd * 3.5);
    col += uColorB * ripple * 0.4;

    // Brief brightening while scrolling fast.
    col += uColorA * abs(uVelocity) * 0.12;

    // Vignette — melt into the ink background so the canvas has no edges.
    float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(aspect, 1.0)));
    float alpha = (dotMask * 0.55 + ripple * 0.35 + abs(uVelocity) * 0.1) * vig;

    gl_FragColor = vec4(col, alpha);
  }
`

// Matches the live hero system (amber → emerald gradient headline on zinc).
const FIELD_AMBER = new THREE.Color('#fbbf24')
const FIELD_EMERALD = new THREE.Color('#34d399')

const HeroScene: React.FC = () => {
  const { size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const pointerTarget = useRef({ x: 0.5, y: 0.5 })
  const pointer = useRef({ x: 0.5, y: 0.5 })
  const velocity = useRef(0)
  const { lenis } = useMotion()

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.current = { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight }
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

    // Read the live Lenis velocity directly (no React re-render).
    const raw = lenis?.velocity ?? 0
    velocity.current += (raw / 15 - velocity.current) * Math.min(1, delta * 8)

    material.uniforms.uTime.value += delta
    material.uniforms.uResolution.value.set(size.width, size.height)
    material.uniforms.uPointer.value.set(pointer.current.x, pointer.current.y)
    material.uniforms.uVelocity.value = velocity.current
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: 0 },
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
