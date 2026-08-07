'use client'

import { useGamification } from '@/hooks/useGamification'
import { VexDock } from './VexDock'

/**
 * Client-only mount point for the Vex Missions dock. Loaded via
 * next/dynamic ssr:false from server components so the dock never blocks
 * initial paint or hydrates on the server.
 */
export const VexMissionLayer: React.FC = () => {
  const gamification = useGamification()
  return <VexDock gamification={gamification} />
}
