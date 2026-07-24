import type { Metadata } from 'next'
import React from 'react'
import { PublicHomepageView } from '@/components/public/PublicHomepageView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  return (
    <div
      data-build-sha="8b1db90f5cd9c6f58bf62756161abd56a0fd4e1e"
      data-homepage-source="src/app/(frontend)/page.tsx"
      data-homepage-data-source="static-client-constants"
      data-homepage-data-version="sample-only-v2-2026-07-24"
    >
      <PublicHomepageView />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Playerside — Evidence-Backed Casino & Bonus Intelligence'
  const description =
    'Commission-blind casino reviews, decoded bonus terms, and direct regulator licence verification.'


  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: '/',
    },
  }
}
