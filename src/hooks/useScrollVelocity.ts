'use client'

import { useSyncExternalStore } from 'react'

import { getVelocity, subscribeVelocity } from '@/providers/Motion/store'

/**
 * Normalized scroll velocity (-1 → 1), 0 when idle. Re-renders ONLY the
 * consuming component — safe for per-frame consumers like velocity-skew
 * typography and canvas shader uniforms.
 */
export const useScrollVelocity = (): number =>
  useSyncExternalStore(subscribeVelocity, getVelocity, () => 0)
