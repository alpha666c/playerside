'use client'

import { useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const GOLD = '#c9a15a'
const CORAL = '#ff5d45'
const INK = '#1a1420'
const EVIDENCE = '#6ea8d8'

export type SealSceneApi = { rotate: (deltaRadians: number) => void }

/** Mirrors the flat seal's checkmark path (M74,124 L104,156 L166,84 in a 240 viewBox), rebuilt as two capsules meeting at the vertex. */
const CHECK_POINTS: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(-4.2, 0.9, 0.12),
  new THREE.Vector3(-1.9, -1.75, 0.12),
  new THREE.Vector3(3.6, 3.0, 0.12),
]

const CheckmarkStroke: React.FC<{ from: THREE.Vector3; to: THREE.Vector3 }> = ({ from, to }) => {
  const mid = useMemo(() => from.clone().add(to).multiplyScalar(0.5), [from, to])
  const length = from.distanceTo(to)
  const quaternion = useMemo(() => {
    const dir = to.clone().sub(from).normalize()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }, [from, to])

  return (
    <mesh position={mid} quaternion={quaternion}>
      <capsuleGeometry args={[0.42, Math.max(length - 0.84, 0.05), 6, 12]} />
      <meshStandardMaterial
        color={CORAL}
        emissive={CORAL}
        emissiveIntensity={0.35}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  )
}

/** Engraved-ring effect: a low-cost instanced ring of tick marks just inside the outer torus. */
const EngravedTicks: React.FC = () => {
  const count = 64
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 5.55
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.05)
      dummy.rotation.z = angle + Math.PI / 2
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh args={[undefined, undefined, count]} ref={ref}>
      <boxGeometry args={[0.09, 0.34, 0.1]} />
      <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.28} />
    </instancedMesh>
  )
}

/**
 * The machined seal itself: outer ring, engraved tick collar, dark inset
 * face, and the checkmark impression. Wrapped in a group so drag-rotate can
 * spin the whole object without touching the plunger.
 */
const SealBody = React.forwardRef<THREE.Group>((_props, ref) => (
  <group ref={ref}>
    <mesh>
      <torusGeometry args={[6, 0.55, 20, 72]} />
      <meshStandardMaterial color={GOLD} metalness={0.92} roughness={0.22} />
    </mesh>
    <EngravedTicks />
    <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[5.15, 5.15, 0.5, 64]} />
      <meshStandardMaterial color={INK} metalness={0.4} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0, 0.11]}>
      <ringGeometry args={[4.7, 5.05, 64]} />
      <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} side={THREE.DoubleSide} />
    </mesh>
    <CheckmarkStroke from={CHECK_POINTS[0]} to={CHECK_POINTS[1]} />
    <CheckmarkStroke from={CHECK_POINTS[1]} to={CHECK_POINTS[2]} />
  </group>
))
SealBody.displayName = 'SealBody'

const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

type SealSceneProps = {
  /** Called once the stamp-impact animation finishes and drag becomes available. */
  onSettled?: () => void
  /** Populated with an imperative `rotate` fn once the scene mounts — driven by the parent's pointer/keyboard handlers. */
  apiRef: React.MutableRefObject<SealSceneApi>
}

/**
 * The stamp-press descends, strikes the seal, bounces once, and retracts —
 * a single causal, one-shot motion (design-tokens.md's "stamp impact"
 * translated into 3D), then the scene goes fully idle: no auto-rotate, no
 * ambient loop, matching the brand's "orchestrated, not scattered" motion
 * rule. Idle rotation only happens in direct response to a drag or keyboard
 * nudge, driven imperatively via `apiRef` rather than a render-loop prop so
 * the canvas can sit at frameloop="demand" the rest of the time.
 */
export const SealScene: React.FC<SealSceneProps> = ({ onSettled, apiRef }) => {
  const sealRef = useRef<THREE.Group>(null)
  const plungerRef = useRef<THREE.Group>(null)
  const [phase, setPhase] = useState<'strike' | 'settled'>('strike')
  const startRef = useRef<number | null>(null)
  const { gl, invalidate, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRenderTarget.texture
    invalidate()
    return () => {
      pmrem.dispose()
      envRenderTarget.texture.dispose()
    }
  }, [gl, scene, invalidate])

  useEffect(() => {
    apiRef.current.rotate = (deltaRadians: number) => {
      if (!sealRef.current) return
      sealRef.current.rotation.y += deltaRadians
      sealRef.current.rotation.x = THREE.MathUtils.clamp(
        sealRef.current.rotation.x,
        -0.5,
        0.5,
      )
      invalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state) => {
    if (phase !== 'strike') return
    if (startRef.current === null) startRef.current = state.clock.elapsedTime
    const t = Math.min((state.clock.elapsedTime - startRef.current) / 0.85, 1)

    if (plungerRef.current) {
      const descend = t < 0.55 ? t / 0.55 : 1
      const retract = t > 0.55 ? (t - 0.55) / 0.45 : 0
      const y = 7 - easeOutBack(Math.min(descend, 1)) * 6.35 + retract * 9
      plungerRef.current.position.y = y
    }
    if (sealRef.current) {
      const bounce =
        t > 0.5 && t < 0.85 ? Math.sin((t - 0.5) * Math.PI * 3) * 0.05 * (1 - (t - 0.5) / 0.35) : 0
      sealRef.current.scale.setScalar(1 + bounce)
    }

    invalidate()
    if (t >= 1) {
      setPhase('settled')
      onSettled?.()
    }
  })

  return (
    <>
      <ambientLight color={GOLD} intensity={0.55} />
      <directionalLight color={GOLD} intensity={1.4} position={[4, 6, 6]} />
      <directionalLight color={EVIDENCE} intensity={0.5} position={[-5, -2, 3]} />

      <SealBody ref={sealRef} />

      <group position={[0, 7, 2]} ref={plungerRef}>
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 4.4, 24]} />
          <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[2.1, 2.1, 0.6, 32]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} />
        </mesh>
      </group>
    </>
  )
}
