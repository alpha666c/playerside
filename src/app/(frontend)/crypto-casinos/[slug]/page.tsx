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
import { ScoreBreakdown } from '@/components/ScoreBreakdown/ScoreBreakdown'
import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'
import { cryptoRubric } from '@/rubrics/crypto'

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
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
            {review.name}
          </h1>
          <VerificationSeal active size={56} title={`${review.name} — verified score, evidence logged`} />
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

      {review.verdict ? (
        <div className="container mb-12 grid max-w-[760px] gap-6 sm:mb-14 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-evidence/35 bg-dusk p-5 sm:p-6">
            <h2 className="mb-3 text-[15px] font-normal uppercase tracking-[1.5px] text-evidence">
              What&rsquo;s good
            </h2>
            <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] leading-relaxed text-paper-dim">
              {review.verdict.whatsGood?.map((item, i) => <li key={i}>{item.point}</li>)}
            </ul>
          </div>
          <div className="rounded-[var(--radius)] border border-coral/35 bg-dusk p-5 sm:p-6">
            <h2 className="mb-3 text-[15px] font-normal uppercase tracking-[1.5px] text-coral">
              What&rsquo;s bad
            </h2>
            <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] leading-relaxed text-paper-dim">
              {review.verdict.whatsBad?.map((item, i) => <li key={i}>{item.point}</li>)}
            </ul>
          </div>
          {review.verdict.narrative ? (
            <p className="mb-0 text-[14.5px] leading-relaxed text-paper sm:col-span-2">
              {review.verdict.narrative}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="container max-w-[760px]">
        <h2 className="mb-6 text-[22px] sm:text-[26px]">Full breakdown — ten categories</h2>
        <ScoreBreakdown rubric={cryptoRubric} scores={review.scores ?? {}} />
      </div>
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
  return result.docs?.[0] || null
})
