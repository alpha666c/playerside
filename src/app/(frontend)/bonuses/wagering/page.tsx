import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { BonusListingCard } from '@/components/BonusListingCard/BonusListingCard'

export const revalidate = 600

export default async function WageringBonusesPage() {
  const payload = await getPayload({ config: configPromise })

  const bonuses = await payload.find({
    collection: 'wagering-bonuses',
    depth: 1,
    limit: 100,
    overrideAccess: false,
  })

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-14">
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Wagering bonuses.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Deposit-linked offers with a wagering requirement. Every card states the exact
          multiplier, what it applies to, the clearance window, and the withdrawal cap — before
          you click through.
        </p>
      </div>

      <div className="container">
        {bonuses.docs.length === 0 ? (
          <p className="text-paper-dim">First bonus pages are in progress — check back soon.</p>
        ) : (
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {bonuses.docs.map((bonus) => (
              <BonusListingCard
                href={`/bonuses/wagering/${bonus.slug}`}
                isIllustrativeSample={bonus.isIllustrativeSample}
                key={bonus.id}
                operatorName={typeof bonus.operator === 'object' ? bonus.operator?.name : undefined}
                summary={bonus.summary}
                terms={`${bonus.wageringMultiplier}× · ${
                  bonus.wageringAppliesTo === 'bonus_only' ? 'bonus only' : 'bonus + deposit'
                } · ${bonus.wageringTimeLimit}`}
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
    description: 'Deposit-linked casino bonuses with exact wagering terms — multiplier, applies-to, cap, and time limit stated in full.',
    title: 'Wagering bonuses — Playerside',
  }
}
