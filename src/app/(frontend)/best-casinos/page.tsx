import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { topLists } from '@/lib/topLists'

export default function BestCasinosIndexPage() {
  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-16">
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Best-of lists.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Ranked from live review data — every list is derived from the CMS review scores, never
          hand-sorted, so it can never drift from the reviews it ranks. No paid placements, ever.
        </p>
      </div>

      <div className="container grid gap-6 sm:grid-cols-2">
        {topLists.map((list) => (
          <Link
            className="group block rounded-[var(--radius)] border border-line bg-dusk p-7 transition-colors duration-200 hover:border-gold/50 sm:p-8"
            href={`/best-casinos/${list.slug}`}
            key={list.slug}
          >
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[1.5px] text-gold">
              {list.kicker}
            </p>
            <h2 className="mb-2 text-xl sm:text-2xl">{list.title}</h2>
            <p className="mb-0 text-[14.5px] leading-relaxed text-paper-dim">{list.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description:
      'Playerside best-of lists — casinos and bonuses ranked from live, evidence-backed review scores. No paid placements.',
    title: 'Best-of lists — Playerside',
  }
}
