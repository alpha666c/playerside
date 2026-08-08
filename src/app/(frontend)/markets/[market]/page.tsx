import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import {
  GridContent,
  SortableReviewGrid,
} from '@/components/archive/SortableReviewGrid'
import { defaultArchiveControls } from '@/lib/archiveFilters'
import { isMarketSlug, marketArchives, marketBySlug } from '@/lib/marketArchives'
import { Suspense } from 'react'

export const revalidate = 600

export async function generateStaticParams() {
  return marketArchives.map((m) => ({ market: m.slug }))
}

type Args = { params: Promise<{ market?: string }> }

export default async function MarketArchivePage({ params: paramsPromise }: Args) {
  const { market = '' } = await paramsPromise
  const meta = marketBySlug(market)
  if (!meta) return notFound()

  const payload = await getPayload({ config: configPromise })
  const reviews = await payload.find({
    collection: 'traditional-casino-reviews',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    where: {
      _status: { equals: 'published' },
      markets: { contains: meta.slug },
    },
  })

  return (
    <div className="py-14 sm:py-20">
      <div className="container mb-10 max-w-[720px] sm:mb-14">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
          Casino reviews · {meta.label}
        </p>
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Casinos licensed in {meta.label}.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">{meta.description}</p>
        <p className="mt-4 mb-0 font-mono text-[12px] leading-relaxed text-paper-dim/80">
          Regulator: {meta.authority}. {meta.note}{' '}
          <Link className="text-evidence underline" href="/#method">
            How we grade
          </Link>
          .
        </p>
      </div>

      <div className="container mb-10">
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-full border border-line px-3.5 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
            href="/casinos"
          >
            All casinos
          </Link>
          {marketArchives.map((other) => (
            <Link
              aria-current={other.slug === meta.slug ? 'page' : undefined}
              className={`rounded-full border px-3.5 py-2 font-mono text-[12px] transition-colors duration-200 ${
                other.slug === meta.slug
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-line text-paper-dim hover:border-evidence hover:text-paper'
              }`}
              href={`/markets/${other.slug}`}
              key={other.slug}
            >
              {other.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="container">
        {reviews.docs.length === 0 ? (
          <p className="text-paper-dim">
            No {meta.label} reviews published yet — the review team is working through the
            backlog.
          </p>
        ) : (
          <Suspense
            fallback={
              <GridContent
                category="traditional"
                controls={defaultArchiveControls}
                reviews={reviews.docs as never[]}
              />
            }
          >
            <SortableReviewGrid
              basePath={`/markets/${meta.slug}`}
              category="traditional"
              reviews={reviews.docs as never[]}
            />
          </Suspense>
        )}
      </div>

      <p className="container mt-14 max-w-[720px] text-[12px] italic text-paper-dim">
        18+. Gambling can be addictive — play responsibly. Review scores are commission-blind and
        traceable to logged evidence.
      </p>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { market = '' } = await paramsPromise
  const meta = marketBySlug(market)
  if (!meta) return {}
  return {
    description: meta.description,
    title: `Casinos licensed in ${meta.label} — Playerside`,
  }
}
