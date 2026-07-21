'use client'

import dynamic from 'next/dynamic'
import React from 'react'

import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'

/**
 * Client-only, code-split entry point for the signature 3D seal — three.js
 * and @react-three/fiber never enter the server bundle or the initial page
 * chunk. Shows the existing flat seal while the 3D chunk streams in, so
 * there's no layout shift and no broken state during hydration.
 */
export const MachinedSealLazy = dynamic(
  () => import('./MachinedSeal').then((mod) => mod.MachinedSeal),
  {
    loading: () => <VerificationSeal active size={120} title="" />,
    ssr: false,
  },
)
