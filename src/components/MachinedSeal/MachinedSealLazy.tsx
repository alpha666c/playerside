'use client'

import dynamic from 'next/dynamic'
import React from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'

type MachinedSealLazyProps = {
  size?: number
  title: string
}

/**
 * Client-only, code-split entry point for the signature 3D seal — three.js
 * and @react-three/fiber never enter the server bundle or the initial page
 * chunk. Shows the existing flat seal (at the SAME requested size, so there's
 * no layout shift) while the 3D chunk streams in.
 */
const MachinedSealComponent = dynamic(
  () => import('./MachinedSeal').then((mod) => mod.MachinedSeal),
  { ssr: false },
)

export const MachinedSealLazy: React.FC<MachinedSealLazyProps> = ({ size = 140, title }) => {
  return (
    <React.Suspense
      fallback={<VerificationSeal active size={size} title={title} />}
    >
      <MachinedSealComponent size={size} title={title} />
    </React.Suspense>
  )
}
