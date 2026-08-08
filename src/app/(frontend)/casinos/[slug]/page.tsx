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
import { MachinedSealLazy } from '@/components/MachinedSeal/MachinedSealLazy'
import { QualitativeContext } from '@/components/QualitativeContext/QualitativeContext'
import { ScoreBreakdown } from '@/components/ScoreBreakdown/ScoreBreakdown'
import { traditionalRubric } from '@/rubrics/traditional'
import { Review3DStampReactor } from '@/components/public/Review3DStampReactor'
import { BonusValueCalculator } from '@/components/public/BonusValueCalculator'
import { ReviewToc } from '@/components/public/ReviewToc'
import { StickyCtaBar } from '@/components/public/StickyCtaBar'
import { VerdictBox } from '@/components/public/VerdictBox'
import { MissionBoardCTA } from '@/components/vex/MissionBoardCTA'
import { VexMissionLayer } from '@/components/vex/VexMissionLayer'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const reviews = await payload.find({
    collection: 'traditional-casino-reviews',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return reviews.docs.map(({ slug }) => ({ slug: slug as string }))
}

type Args = { params: Promise<{ slug?: string }> }

export default async function CasinoReviewPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const review = await queryReviewBySlug(decodeURIComponent(slug))
  const { isEnabled: draft } = await draftMode()

  if (!review) return notFound()

  // Phase 1 (F1.5): the operator's exact wagering terms, straight from the
  // bonus collection (bonus.operator is a relationship to this review).
  const bonus = await queryBonusForOperator(review.id)

  return (
    <article className="pb-24 pt-16 sm:pt-20">
      {draft && <LivePreviewListener />}

      <div className="container mb-10 max-w-[760px] sm:mb-12">
        <CategoryMarker className="mb-4" kind="traditional" />
        {review.isIllustrativeSample ? (
          <IllustrativeBanner subject="operator" />
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <h1 className="text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
            {review.name}
          </h1>
          <MachinedSealLazy size={64} title={`${review.name} — verified score, evidence logged.`} />
        </div>

        {typeof review.overallScore === 'number' ? (
          <div className="mt-3 font-mono text-3xl text-gold sm:text-4xl">
            {review.overallScore.toFixed(1)} <span className="text-base text-paper-dim">/ 10</span>
          </div>
        ) : null}
        <p className="mt-4 text-base text-paper-dim sm:text-lg">{review.summary}</p>
      </div>

      <div className="container mb-8 max-w-[760px]">
        <ReviewToc
          items={[
            { id: 'verdict', label: 'Verdict' },
            { id: 'breakdown', label: 'Breakdown' },
            ...(bonus ? [{ id: 'bonuses', label: 'Bonus terms' }] : []),
            { id: 'compliance', label: 'Compliance' },
          ]}
        />
      </div>

      <div className="container mb-8 max-w-[760px]">
        <VerdictBox
          categoryLabel="Traditional casino"
          licenseAuthority={review.compliance?.licenseAuthority}
          licenseNumber={review.compliance?.licenseNumber}
          operatorName={review.name}
          overallScore={review.overallScore}
          rubric={traditionalRubric}
          scores={review.scores ?? {}}
        />
      </div>

      {/* Appears once the verdict scrolls out of view (Phase 1 F1.4). */}
      <StickyCtaBar
        bonusHref={bonus ? `/bonuses/wagering/${bonus.slug}` : null}
        bonusLabel={bonus ? bonus.title : null}
        operatorName={review.name}
        overallScore={review.overallScore}
      />

      <div className="container mb-12 max-w-[760px] sm:mb-14" id="compliance">
        <ComplianceBlock
          category="traditional"
          licenseAuthority={review.compliance.licenseAuthority}
          licenseNumber={review.compliance.licenseNumber}
          markets={review.markets}
        />
      </div>

      {/* 3D Flip Card & Impact Stamp Reactor */}
      <div className="container mb-12 max-w-[760px]">
        <Review3DStampReactor
          operatorName={review.name}
          overallScore={review.overallScore ?? 8.5}
          isCertified={true}
          whatsGood={review.verdict?.whatsGood?.map((w: any) => w.point) ?? []}
          whatsBad={review.verdict?.whatsBad?.map((w: any) => w.point) ?? []}
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

      <div className="container mb-12 max-w-[760px] sm:mb-14" id="breakdown">
        <h2 className="mb-6 text-[22px] sm:text-[26px]">Full breakdown — eight categories</h2>
        <ScoreBreakdown rubric={traditionalRubric} scores={review.scores ?? {}} />
      </div>

      {bonus ? (
        <div className="container mb-12 max-w-[760px] sm:mb-14">
          <BonusValueCalculator
            appliesTo={bonus.wageringAppliesTo}
            bonusTitle={bonus.title}
            contributingGames={bonus.contributingGames ?? []}
            multiplier={bonus.wageringMultiplier}
            timeLimit={bonus.wageringTimeLimit}
          />
        </div>
      ) : null}

      <QualitativeContext note={review.communitySentimentNote} />

      <MissionBoardCTA />

      <VexMissionLayer />
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
    collection: 'traditional-casino-reviews',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs?.[0] || null
})

/** Phase 1 (F1.5): first published wagering bonus tied to this operator review. */
const queryBonusForOperator = cache(async (operatorId: number | string) => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'wagering-bonuses',
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { operator: { equals: operatorId } },
  })
  return result.docs?.[0] ?? null
})


