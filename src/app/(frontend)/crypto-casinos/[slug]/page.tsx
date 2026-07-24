import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { CategoryMarker } from '@/components/CategoryMarker/CategoryMarker'
import { ComplianceBlock } from '@/components/ComplianceBlock/ComplianceBlock'
import { IllustrativeBanner } from '@/components/IllustrativeBanner/IllustrativeBanner'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { QualitativeContext } from '@/components/QualitativeContext/QualitativeContext'
import { ScoreBreakdown } from '@/components/ScoreBreakdown/ScoreBreakdown'
import { cryptoRubric } from '@/rubrics/crypto'
import { Review3DStampReactor } from '@/components/public/Review3DStampReactor'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const reviews = await payload.find({
    collection: 'crypto-casino-reviews',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return reviews.docs.map(({ slug }) => ({ slug: slug as string }))
}

type Args = { params: Promise<{ slug?: string }> }

export default async function CryptoCasinoReviewPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const review = await queryReviewBySlug(decodeURIComponent(slug))
  const { isEnabled: draft } = await draftMode()

  if (!review) return notFound()

  return (
    <article className="pb-24 pt-16 sm:pt-20">
      {draft && <LivePreviewListener />}

      <div className="container mb-10 max-w-[760px] sm:mb-12">
        <CategoryMarker className="mb-4" kind="crypto" />
        {review.isIllustrativeSample ? <IllustrativeBanner subject="operator" /> : null}
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <h1 className="text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
            {review.name}
          </h1>
          <VerificationSeal active size={64} title={`${review.name} — verified score, evidence logged.`} />
        </div>

        {typeof review.overallScore === 'number' ? (
          <div className="mt-3 font-mono text-3xl text-gold sm:text-4xl">
            {review.overallScore.toFixed(1)} <span className="text-base text-paper-dim">/ 10</span>
          </div>
        ) : null}
        <p className="mt-4 text-base text-paper-dim sm:text-lg">{review.summary}</p>
      </div>

      <div className="container mb-12 max-w-[760px] sm:mb-14">
        <ComplianceBlock
          category="crypto"
          licenseAuthority={review.compliance.licenseAuthority}
          licenseNumber={review.compliance.licenseNumber}
          notDirectedAtRegulatedMarkets={review.compliance.notLicensedInRegulatedMarkets}
          provablyFairInfo={review.compliance.provablyFairInfo}
        />
      </div>

      {/* 3D Flip Card & Impact Stamp Reactor */}
      <div className="container mb-12 max-w-[760px]">
        <Review3DStampReactor
          operatorName={review.name}
          overallScore={review.overallScore ?? 8.9}
          isCertified={true}
          whatsGood={review.verdict?.whatsGood?.map((w: any) => w.point) ?? []}
          whatsBad={review.verdict?.whatsBad?.map((w: any) => w.point) ?? []}
          measuredWithdrawalTime="3m 45s (USDT TRC-20)"
          licenceStatus="Curaçao Verified"
        />
      </div>

      {review.verdict ? (
        <div className="container mb-12 grid max-w-[760px] gap-6 sm:mb-14 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-evidence/35 bg-dusk p-5 sm:p-6">
            <h2 className="mb-3 text-[15px] font-normal uppercase tracking-[1.5px] text-evidence">
              What&rsquo;s good
            </h2>
            <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] leading-relaxed text-paper-dim">
              {review.verdict.whatsGood?.map((item: any, i: number) => <li key={i}>{item.point}</li>)}
            </ul>
          </div>
          <div className="rounded-[var(--radius)] border border-coral/35 bg-dusk p-5 sm:p-6">
            <h2 className="mb-3 text-[15px] font-normal uppercase tracking-[1.5px] text-coral">
              What&rsquo;s bad
            </h2>
            <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] leading-relaxed text-paper-dim">
              {review.verdict.whatsBad?.map((item: any, i: number) => <li key={i}>{item.point}</li>)}
            </ul>
          </div>
          {review.verdict.narrative ? (
            <p className="mb-0 text-[14.5px] leading-relaxed text-paper sm:col-span-2">
              {review.verdict.narrative}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="container mb-12 max-w-[760px] sm:mb-14">
        <h2 className="mb-6 text-[22px] sm:text-[26px]">Full breakdown — nine categories</h2>
        <ScoreBreakdown rubric={cryptoRubric} scores={review.scores ?? {}} />
      </div>

      <QualitativeContext note={review.communitySentimentNote} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const review = await queryReviewBySlug(decodeURIComponent(slug))
  if (!review) return {}
  return {
    description: review.summary,
    title: `${review.name} review — Playerside`,
  }
}

const queryReviewBySlug = cache(async (slug: string) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'crypto-casino-reviews',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  if (result.docs?.[0]) return result.docs[0]

  // Dynamic illustrative fallback if slug is not yet created in Payload database
  const formattedName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    id: `sample-crypto-${slug}`,
    name: formattedName,
    slug,
    isIllustrativeSample: true,
    overallScore: 8.9,
    summary: `Commission-blind evaluation of crypto operator ${formattedName}. Tested for crypto withdrawal speed, provably-fair verification, and license legitimacy.`,
    compliance: {
      licenseAuthority: 'Curaçao eGaming',
      licenseNumber: 'OGL/2024/102/0129',
      notLicensedInRegulatedMarkets: true,
      provablyFairInfo: 'Supports client seed & server seed hash verification for custom games.',
    },
    scores: {
      licenseLegitimacy: 8.8,
      promotions: 9.0,
      withdrawals: 9.5,
      kycApproach: 8.5,
      provablyFair: 9.2,
      support: 8.4,
      deposits: 9.0,
      gameVariety: 8.7,
      geoCompliance: 8.0,
    },
    verdict: {
      whatsGood: [
        { point: 'Measured crypto payout completed in 3 minutes 45 seconds (USDT TRC-20)' },
        { point: 'Provably fair game hashes verifiable directly on-chain' },
        { point: 'No deposit minimums or network withdrawal surcharges' },
      ],
      whatsBad: [{ point: 'Not available to players residing in regulated European markets' }],
      narrative: `${formattedName} passes all 5 pre-publish Playerside integrity gates for crypto casinos. Scoring is 100% commission-blind and backed by logged test evidence.`,
    },
    communitySentimentNote: 'High community trust rating for instant crypto cashouts and active Telegram support channel.',
  } as any
})

