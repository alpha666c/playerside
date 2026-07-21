import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { CategoryMarker } from '@/components/CategoryMarker/CategoryMarker'
import { ReviewListingCard } from '@/components/ReviewListingCard/ReviewListingCard'

export const revalidate = 600

export default async function CryptoCasinosPage() {
  const payload = await getPayload({ config: configPromise })

  const reviews = await payload.find({
    collection: 'crypto-casino-reviews',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    sort: '-overallScore',
  })

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[720px] sm:mb-14">
        <CategoryMarker className="mb-4" kind="crypto" />
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Crypto casino reviews.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Global and offshore operators, scored the same commission-blind way as Traditional
          Casino — with a rubric adapted for provably-fair verification and license legitimacy.
          Never targeted at the Netherlands, Sweden, Germany, or the UK.
        </p>
      </div>

      <div className="container">
        {reviews.docs.length === 0 ? (
          <p className="max-w-[520px] text-paper-dim">
            First crypto casino reviews are in progress — this category is separately staffed and
            structurally kept apart from Traditional Casino (never a shared listing or content
            type). Check back soon.
          </p>
        ) : (
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {reviews.docs.map((review) => (
              <ReviewListingCard
                category="crypto"
                href={`/crypto-casinos/${review.slug}`}
                isIllustrativeSample={review.isIllustrativeSample}
                key={review.id}
                name={review.name}
                overallScore={review.overallScore}
                summary={review.summary}
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
    description:
      'Commission-blind reviews of global crypto casino operators — never targeted at NL, SE, DE, or the UK.',
    title: 'Crypto casino reviews — Playerside',
  }
}
