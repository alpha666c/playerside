import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { CategoryMarker } from '@/components/CategoryMarker/CategoryMarker'
import { PIPELINE_STAGES, stageLabel, summarizePipeline } from '@/lib/pipeline'

/**
 * The reviews hub — presents Traditional Casino and Crypto Casino as two
 * clearly separated entry points (brand-spec.md: "a user should always be
 * able to tell which one they're in... separate top-level nav entries
 * rather than one 'Casinos' dropdown that silently mixes both"). This page
 * itself never lists operators from either category — that's what /casinos
 * and /crypto-casinos are for (ORG.md §3.4: never a shared listing).
 *
 * Phase 5 added the live "Review pipeline" overview below: how many cases
 * are in each stage of the Review Intelligence System, and how many reviews
 * are actually published. ResearchQueue reads are admin-only (FIX-01), so
 * this page deliberately reads it with overrideAccess — but renders ONLY
 * aggregate stage counts, never case data. That matches the blueprint's
 * public-facing queue teaser ("X operators under review").
 *
 * GOVERNANCE GUARDRAIL (reviewer pass, Phase 5): do NOT widen the select
 * below. The leak-protection lives entirely in `select: { status: true }`
 * — adding operatorName/caseNumber/internalNotes to this select would
 * silently publish admin-only case data on the public site. If richer
 * public data is ever needed, build a dedicated count-only API route.
 */
export const revalidate = 600

export default async function ReviewsHubPage() {
  const payload = await getPayload({ config: configPromise })

  const [cases, traditionalReviews, cryptoReviews] = await Promise.all([
    payload.find({
      collection: 'research-queue',
      limit: 1000,
      overrideAccess: true,
      pagination: false,
      select: { status: true },
    }),
    payload.find({
      collection: 'traditional-casino-reviews',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: { _status: { equals: 'published' } },
    }),
    payload.find({
      collection: 'crypto-casino-reviews',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: { _status: { equals: 'published' } },
    }),
  ])

  // Narrow by construction: only `status` is ever read off these docs.
  const pipeline = summarizePipeline(
    cases.docs.map((doc) => ({ status: (doc as { status?: unknown }).status })),
  )
  const publishedReviews = (traditionalReviews.totalDocs ?? 0) + (cryptoReviews.totalDocs ?? 0)

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

      <div className="container mb-16 grid gap-6 sm:grid-cols-2">
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

      <div className="container mb-16 max-w-[860px]">
        <div className="rounded-[var(--radius)] border border-line bg-dusk p-6 sm:p-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
            The review pipeline
          </p>
          <h2 className="mb-3 text-[20px] sm:text-[24px]">
            {pipeline.inReview > 0
              ? `${pipeline.inReview} case${pipeline.inReview === 1 ? '' : 's'} under review right now.`
              : 'Every case has cleared the pipeline.'}
          </h2>
          <p className="mb-6 text-[13.5px] leading-relaxed text-paper-dim">
            Every operator moves through the same seven stages — desk research, hands-on testing,
            editorial, integrity check — before a single score is published. No skipping, no paid
            placements:{' '}
            <Link className="text-evidence underline" href="/#method">
              how we grade
            </Link>
            . {publishedReviews > 0 ? `${publishedReviews} review${publishedReviews === 1 ? '' : 's'} published.` : 'No reviews published yet.'}
          </p>

          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {PIPELINE_STAGES.map((stage) => (
              <div
                className="rounded-lg border border-line bg-ink/50 px-3 py-2.5"
                key={stage}
              >
                <div className="font-mono text-xl text-gold">{pipeline.byStage[stage]}</div>
                <div className="font-mono text-[9.5px] uppercase tracking-[1px] text-paper-dim">
                  {stageLabel[stage]}
                </div>
              </div>
            ))}
          </div>

          <p className="mb-0 mt-5 text-[11.5px] italic leading-relaxed text-paper-dim/80">
            Counts are live and read-only. Illustrative sample cases use the #PS-YYYY-SNN format —
            they demonstrate the pipeline, they are not real operators.
          </p>
        </div>
      </div>

      <p className="container max-w-[720px] text-[12px] italic text-paper-dim">
        Every published score is traceable to logged evidence, and affiliate commission never
        influences a rating. 18+ — gamble responsibly.
      </p>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description:
      'Playerside reviews, in two structurally separate categories — Traditional Casino and Crypto Casino — with a live look at the review pipeline.',
    title: 'Reviews — Playerside',
  }
}
