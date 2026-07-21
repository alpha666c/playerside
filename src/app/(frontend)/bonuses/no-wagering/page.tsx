import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { BonusListingCard } from '@/components/BonusListingCard/BonusListingCard'

export const revalidate = 600

export default async function NoWageringBonusesPage() {
  const payload = await getPayload({ config: configPromise })

  const bonuses = await payload.find({
    collection: 'no-wagering-bonuses',
    depth: 1,
    limit: 100,
    overrideAccess: false,
  })

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-14">
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          No-wagering bonuses.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          No wagering requirement doesn&rsquo;t mean no terms. Every card here states exact
          eligibility, expiry, and any conditions that still apply before you can withdraw.
        </p>
      </div>

      <div className="container">
        {bonuses.docs.length === 0 ? (
          <p className="text-paper-dim">First bonus pages are in progress — check back soon.</p>
        ) : (
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {bonuses.docs.map((bonus) => (
              <BonusListingCard
                href={`/bonuses/no-wagering/${bonus.slug}`}
                isIllustrativeSample={bonus.isIllustrativeSample}
                key={bonus.id}
                operatorName={typeof bonus.operator === 'object' ? bonus.operator?.name : undefined}
                summary={bonus.summary}
                terms={`${bonus.bonusAmount} · max withdrawal ${bonus.maxWithdrawal}`}
                title={bonus.title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description: 'No-deposit and wager-free casino bonuses — exact eligibility, expiry, and withdrawal terms, even without a wagering requirement.',
    title: 'No-wagering bonuses — Playerside',
  }
}
