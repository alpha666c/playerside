import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { FaqAccordion } from '@/components/public/FaqAccordion'
import { JsonLd } from '@/components/public/JsonLd'
import { traditionalRubric } from '@/rubrics/traditional'
import { getServerSideURL } from '@/utilities/getURL'
import {
  buildItemListJsonLd,
  rankReviews,
  rankWageringBonuses,
  topListBySlug,
  topLists,
} from '@/lib/topLists'
import type { RankedEntry } from '@/lib/topLists'

export const revalidate = 600

export async function generateStaticParams() {
  return topLists.map((l) => ({ slug: l.slug }))
}

type Args = { params: Promise<{ slug?: string }> }

export default async function TopListPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const list = topListBySlug(slug)
  if (!list) return notFound()

  const payload = await getPayload({ config: configPromise })
  let entries: RankedEntry[] = []
  if (list.source === 'reviews') {
    const reviews = await payload.find({
      collection: 'traditional-casino-reviews',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      where: { _status: { equals: 'published' } },
    })
    entries = rankReviews(reviews.docs as never[], list.sortKey)
  } else {
    const bonuses = await payload.find({
      collection: 'wagering-bonuses',
      depth: 1,
      limit: 100,
      overrideAccess: false,
      where: { _status: { equals: 'published' } },
    })
    entries = rankWageringBonuses(bonuses.docs as never[])
  }

  const [first, ...rest] = entries
  const siteUrl = getServerSideURL()
  const sortKeyLabel =
    list.sortKey === 'overallScore'
      ? null
      : (traditionalRubric.find((c) => c.key === list.sortKey)?.label ?? list.sortKey)

  return (
    <article className="pb-24 pt-16 sm:pt-20">
      <JsonLd
        data={buildItemListJsonLd({
          name: list.title,
          description: list.description,
          entries,
          siteUrl,
          itemReviewedType: list.source === 'wagering-bonuses' ? 'Product' : 'Organization',
        })}
      />

      <div className="container mb-10 max-w-[760px] sm:mb-14">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
          Best-of · {list.kicker}
        </p>
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          {list.title}.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">{list.intro}</p>
        <p className="mt-4 mb-0 font-mono text-[11.5px] text-paper-dim/80">
          List pages are regenerated from the CMS on a short revalidation window — the ranking
          follows the live review scores, it is never hand-sorted.
        </p>
        {sortKeyLabel ? (
          <p className="mt-4 mb-0 font-mono text-[12px] text-paper-dim/80">
            Ranked by: {sortKeyLabel}.
          </p>
        ) : null}
      </div>

      <div className="container mb-12 max-w-[760px] sm:mb-14">
        {entries.length === 0 ? (
          <p className="text-paper-dim">
            This list is empty until the review pipeline publishes more operators.
          </p>
        ) : first ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-full bg-gold/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-gold">
                Editor&rsquo;s choice
              </span>
              {first.isSample ? (
                <span className="rounded-full border border-coral/40 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[1px] text-coral">
                  Illustrative sample
                </span>
              ) : null}
            </div>
            <Link
              className="group block rounded-[var(--radius)] border border-gold/40 bg-dusk p-6 transition-colors duration-fast hover:border-gold sm:p-8"
              href={first.href}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl sm:text-2xl">{first.title}</h2>
                <span className="shrink-0 font-mono text-2xl text-gold sm:text-3xl">
                  {first.score.toFixed(1)}
                </span>
              </div>
              <p className="mb-0 mt-3 text-[14px] leading-relaxed text-paper-dim">{first.blurb}</p>
              <p className="mb-0 mt-4 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
                Read the review →
              </p>
            </Link>
          </>
        ) : null}

        {rest.length > 0 ? (
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-dusk">
            {rest.map((entry, index) => (
              <Link
                className="group flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-ink-2/60 sm:px-6"
                href={entry.href}
                key={entry.id}
              >
                <span className="w-7 shrink-0 font-mono text-lg text-paper-dim/60">
                  {index + 2}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] text-paper group-hover:text-gold">
                    {entry.title}
                  </span>
                  <span className="block truncate font-mono text-[11.5px] text-paper-dim">
                    {entry.scoreLabel}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-lg text-gold">{entry.score.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="container mb-12 max-w-[760px] sm:mb-14">
        <h2 className="mb-5 text-[18px] sm:text-[20px]">How this list was made</h2>
        <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] leading-relaxed text-paper-dim">
          {list.howRanked.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="container mb-14 max-w-[760px]">
        <h2 className="mb-5 text-[18px] sm:text-[20px]">Questions, answered</h2>
        <FaqAccordion items={list.faq} />
      </div>

      <p className="container max-w-[760px] text-[12px] italic text-paper-dim">
        18+. Gambling can be addictive — play responsibly. Ranking is commission-blind and derived
        from live, evidence-backed review scores.
      </p>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const list = topListBySlug(slug)
  if (!list) return {}
  return { description: list.description, title: `${list.title} — Playerside` }
}
