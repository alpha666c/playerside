import type { Metadata } from 'next'
import React from 'react'
import { PublicHomepageView } from '@/components/public/PublicHomepageView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  return (
    <div data-build-sha="f4b74e40e2b34a6ee103328eb92049e29ddf89eb" data-homepage-source="src/app/(frontend)/page.tsx">
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
