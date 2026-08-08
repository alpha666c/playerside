import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'
import Link from 'next/link'
import React from 'react'

import { Search } from '@/search/Component'
import {
  bonusSearchClauses,
  bonusToResult,
  kindLabel,
  rankSearchResults,
  reviewSearchClauses,
  reviewToResult,
  type SearchResultItem,
} from '@/lib/siteSearch'

/**
 * Phase 3 (F3.1) — real site search.
 *
 * The Payload search plugin only syncs the template `posts` collection, so
 * the previous template /search page could never find a casino. This page
 * queries the four review/bonus collections directly (config + live CMS data,
 * same ethos as the top-lists) and ranks the merged results by score with
 * deterministic tie-breaks. With no query it doubles as a browse hub.
 */
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ q?: string }>
}

const REVIEW_COLLECTIONS = [
  { slug: 'traditional-casino-reviews', kind: 'traditional' as const, clauses: reviewSearchClauses },
  { slug: 'crypto-casino-reviews', kind: 'crypto' as const, clauses: reviewSearchClauses },
] as const
const BONUS_COLLECTIONS = [
  { slug: 'wagering-bonuses', kind: 'wagering-bonus' as const, clauses: bonusSearchClauses },
  { slug: 'no-wagering-bonuses', kind: 'no-wagering-bonus' as const, clauses: bonusSearchClauses },
] as const

export default async function SearchPage({ searchParams: searchParamsPromise }: Args) {
  const { q = '' } = await searchParamsPromise
  const query = q.trim()
  const payload = await getPayload({ config: configPromise })

  const items: SearchResultItem[] = []

  for (const collection of REVIEW_COLLECTIONS) {
    const where: Where = query
      ? {
          and: [{ _status: { equals: 'published' } }, { or: collection.clauses(query) as Where[] }],
        }
      : { _status: { equals: 'published' } }
    const docs = await payload.find({
      collection: collection.slug,
      depth: 0,
      limit: 50,
      overrideAccess: false,
      select: {
        name: true,
        slug: true,
        summary: true,
        overallScore: true,
        isIllustrativeSample: true,
      },
      sort: '-overallScore',
      where,
    })
    for (const doc of docs.docs as Array<{
      id: string | number
      name: string
      slug: string
      summary?: string | null
      overallScore?: number | null
      isIllustrativeSample?: boolean | null
    }>) {
      items.push(
        reviewToResult({
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          summary: doc.summary,
          overallScore: doc.overallScore,
          isIllustrativeSample: doc.isIllustrativeSample,
          kind: collection.kind,
        }),
      )
    }
  }

  for (const collection of BONUS_COLLECTIONS) {
    const where: Where = query
      ? {
          and: [{ _status: { equals: 'published' } }, { or: collection.clauses(query) as Where[] }],
        }
      : { _status: { equals: 'published' } }
    const docs = await payload.find({
      collection: collection.slug,
      depth: 1,
      limit: 50,
      overrideAccess: false,
      select: {
        title: true,
        slug: true,
        summary: true,
        isIllustrativeSample: true,
        operator: true,
      },
      where,
    })
    for (const doc of docs.docs as Array<{
      id: string | number
      title: string
      slug: string
      summary?: string | null
      isIllustrativeSample?: boolean | null
      operator?:
        | { id: string | number; name?: string | null; overallScore?: number | null }
        | string
        | number
        | null
    }>) {
      items.push(
        bonusToResult({
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          summary: doc.summary,
          isIllustrativeSample: doc.isIllustrativeSample,
          kind: collection.kind,
          operator: doc.operator,
        }),
      )
    }
  }

  const results = rankSearchResults(items)

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-12 max-w-[760px] sm:mb-14">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
          Search
        </p>
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          {query ? `Results for “${query}”.` : 'Search reviews and bonuses.'}
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Every result is a published review or bonus from the CMS — ranked by score, never by
          placement. Scores are commission-blind and traceable to logged evidence.
        </p>
      </div>

      <div className="container mb-12 max-w-[760px]">
        <Search />
      </div>

      <div className="container max-w-[760px]">
        {results.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-dusk p-8 text-center">
            <p className="mb-1 text-[15px] text-paper">
              {query ? `No matches for “${query}”.` : 'Nothing published yet.'}
            </p>
            <p className="mb-5 text-[13.5px] leading-relaxed text-paper-dim">
              {query
                ? 'Try an operator name (e.g. “Aurora”) or browse the full review lists below.'
                : 'The review pipeline is still working through the backlog — browse what is live.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                className="rounded-full border border-line px-4 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href="/casinos"
              >
                Traditional casino reviews
              </Link>
              <Link
                className="rounded-full border border-line px-4 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href="/crypto-casinos"
              >
                Crypto casino reviews
              </Link>
              <Link
                className="rounded-full border border-line px-4 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href="/bonuses/no-wagering"
              >
                No-wagering bonuses
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-paper-dim/70">
              {query ? `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”` : 'Browse — top reviews and bonuses'}
            </p>
            <div className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-dusk">
              {results.map((result) => (
                <SearchResultRow item={result} key={`${result.kind}-${result.id}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const SearchResultRow: React.FC<{ item: SearchResultItem }> = ({ item }) => (
  <Link
    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-ink-2/60 sm:px-6"
    href={item.href}
  >
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="truncate text-[14.5px] text-paper group-hover:text-gold">{item.name}</span>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[1px] text-paper-dim">
          {kindLabel[item.kind]}
        </span>
        {item.isSample ? (
          <span className="rounded-full border border-coral/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[1px] text-coral">
            Sample
          </span>
        ) : null}
      </span>
      {item.summary ? (
        <span className="mt-1 block line-clamp-1 text-[12.5px] text-paper-dim">{item.summary}</span>
      ) : null}
    </span>
    <span className="shrink-0 text-right">
      <span className="block font-mono text-lg text-gold">{item.score.toFixed(1)}</span>
      <span className="block font-mono text-[9.5px] uppercase tracking-[1px] text-paper-dim/70">
        {item.scoreLabel}
      </span>
    </span>
  </Link>
)

export function generateMetadata(): Metadata {
  return {
    description:
      'Search Playerside casino reviews and bonuses — every result is a published, evidence-scored review.',
    robots: { index: false, follow: true },
    title: 'Search — Playerside',
  }
}
