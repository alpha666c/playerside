import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { CategoryMarker } from '@/components/CategoryMarker/CategoryMarker'

/**
 * The reviews hub — presents Traditional Casino and Crypto Casino as two
 * clearly separated entry points (brand-spec.md: "a user should always be
 * able to tell which one they're in... separate top-level nav entries
 * rather than one 'Casinos' dropdown that silently mixes both"). This page
 * itself never lists operators from either category — that's what /casinos
 * and /crypto-casinos are for (ORG.md §3.4: never a shared listing).
 */
export default function ReviewsHubPage() {
  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-16">
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Two categories. Never one list.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Traditional Casino and Crypto Casino run on different licensing rules, different
          markets, and separate grading rubrics. They stay separate here too — different pages,
          different review formats, never blended into one feed.
        </p>
      </div>

      <div className="container grid gap-6 sm:grid-cols-2">
        <Link
          className="group block rounded-[var(--radius)] border border-evidence/35 bg-dusk p-7 transition-colors duration-200 hover:border-evidence sm:p-8"
          href="/casinos"
        >
          <CategoryMarker className="mb-4" kind="traditional" />
          <h2 className="mb-2 text-xl sm:text-2xl">Traditional casino reviews</h2>
          <p className="mb-0 text-[14.5px] leading-relaxed text-paper-dim">
            Licensed operators in the Netherlands, Sweden, Germany, and the UK. Nine graded
            categories, evidence cited per score.
          </p>
        </Link>

        <Link
          className="group block rounded-[var(--radius)] border border-coral-dim/45 bg-dusk p-7 transition-colors duration-200 hover:border-coral-dim sm:p-8"
          href="/crypto-casinos"
        >
          <CategoryMarker className="mb-4" kind="crypto" />
          <h2 className="mb-2 text-xl sm:text-2xl">Crypto casino reviews</h2>
          <p className="mb-0 text-[14.5px] leading-relaxed text-paper-dim">
            Global and offshore operators, never targeted at NL/SE/DE/UK. Ten graded categories,
            including license legitimacy and provably-fair verification.
          </p>
        </Link>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description: 'Playerside reviews, in two structurally separate categories: Traditional Casino and Crypto Casino.',
    title: 'Reviews — Playerside',
  }
}
