import type { Metadata } from 'next'
import React from 'react'
import { PublicHomepageView } from '@/components/public/PublicHomepageView'

export default function HomePage() {
  return <PublicHomepageView />
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
