import type { Metadata } from 'next'

import { MissionsOverview } from '@/components/vex/MissionsOverview'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function MissionsPage() {
  return <MissionsOverview />
}

export function generateMetadata(): Metadata {
  return {
    title: 'Vex Missions — the board — Playerside',
    description:
      'The mission board: rank ladder, badges and casino-literacy missions that teach you to read wagering requirements, compute what a bonus costs, and know when to step away.',
  }
}
