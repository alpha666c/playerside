import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

export default function BonusesHubPage() {
  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-16">
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          &ldquo;No wagering&rdquo; doesn&rsquo;t mean &ldquo;no terms.&rdquo;
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Split by the one distinction that actually matters — whether your winnings carry a
          wagering requirement. Both pages state exact terms, every time. No page here ever
          publishes with &ldquo;terms apply&rdquo; standing in for a real number.
        </p>
      </div>

      <div className="container grid gap-6 sm:grid-cols-2">
        <Link
          className="block rounded-[var(--radius)] border border-line bg-dusk p-7 transition-colors duration-fast hover:border-gold/50 sm:p-8"
          href="/bonuses/wagering"
        >
          <h2 className="mb-2 text-xl sm:text-2xl">Wagering bonuses</h2>
          <p className="mb-0 text-[14.5px] leading-relaxed text-paper-dim">
            Deposit-linked bonuses. Exact multiplier, exactly what it applies to, exact max
            withdrawal, exact time limit, exact game contribution rates.
          </p>
        </Link>

        <Link
          className="block rounded-[var(--radius)] border border-line bg-dusk p-7 transition-colors duration-fast hover:border-gold/50 sm:p-8"
          href="/bonuses/no-wagering"
        >
          <h2 className="mb-2 text-xl sm:text-2xl">No-wagering bonuses</h2>
          <p className="mb-0 text-[14.5px] leading-relaxed text-paper-dim">
            No-deposit and wager-free bonuses. Still exact — eligibility, expiry, and max
            withdrawal, stated in full even without a wagering requirement.
          </p>
        </Link>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description: 'Playerside bonus pages, split by wagering requirement — exact terms, every time.',
    title: 'Bonuses — Playerside',
  }
}
