'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import {
  applyArchiveControls,
  controlsToSearchParams,
  defaultArchiveControls,
  parseArchiveControls,
  type ArchiveControls,
  type ArchiveReview,
} from '@/lib/archiveFilters'
import type { MarketMeta } from '@/lib/marketArchives'
import { ReviewListingCard } from '@/components/ReviewListingCard/ReviewListingCard'

/**
 * Archive sorting + filtering — Phase 3 (F3.3).
 *
 * Split in two for Next's Suspense rule: `useSearchParams` must be wrapped in
 * a Suspense boundary at the PAGE (server) level, so the pages render
 * <Suspense fallback={<GridContent controls={defaults} />}> around
 * SortableReviewGrid. The fallback keeps the full default grid in the static
 * HTML (SEO intact, no CSR-only content), then the client wrapper hydrates,
 * reads ?sort=&min=&market= from the URL and re-sorts/filters in-memory over
 * the already-fetched docs — no refetch, and a filtered view is shareable,
 * survives reloads, and works with back/forward.
 */

export type GridProps = {
  reviews: ArchiveReview[]
  category: 'traditional' | 'crypto'
  markets?: MarketMeta[]
}

/** Presentational grid + controls. Fallback renders without a change handler. */
export const GridContent: React.FC<
  GridProps & {
    controls: ArchiveControls
    onControlsChange?: (next: ArchiveControls) => void
  }
> = ({ reviews, category, markets, controls, onControlsChange }) => {
  const visible = applyArchiveControls(reviews, controls)
  const minOptions = [0, 7, 8, 9]

  const set = (patch: Partial<ArchiveControls>) => {
    if (onControlsChange) onControlsChange({ ...controls, ...patch })
  }
  const sortActive = (value: ArchiveControls['sort']): boolean => controls.sort === value

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Sort
            </span>
            {[
              { value: 'score-desc' as const, label: 'Top score' },
              { value: 'score-asc' as const, label: 'Lowest first' },
              { value: 'name' as const, label: 'A–Z' },
            ].map((option) => (
              <button
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                  sortActive(option.value)
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-line text-paper-dim hover:border-evidence hover:text-paper'
                }`}
                key={option.value}
                onClick={() => set({ sort: option.value })}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Min score
            </span>
            <select
              className="rounded-full border border-line bg-ink px-3 py-1.5 font-mono text-[11px] text-paper outline-none transition-colors duration-200 focus:border-evidence"
              onChange={(e) => set({ minScore: Number(e.target.value) })}
              value={controls.minScore}
            >
              {minOptions.map((min) => (
                <option key={min} value={min}>
                  {min === 0 ? 'Any' : `${min}.0+`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {markets && markets.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Market
            </span>
            <button
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                controls.market === null
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-line text-paper-dim hover:border-evidence hover:text-paper'
              }`}
              onClick={() => set({ market: null })}
              type="button"
            >
              All
            </button>
            {markets.map((market) => (
              <button
                aria-current={controls.market === market.slug ? 'true' : undefined}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                  controls.market === market.slug
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-line text-paper-dim hover:border-evidence hover:text-paper'
                }`}
                key={market.slug}
                onClick={() => set({ market: market.slug })}
                type="button"
              >
                {market.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="font-mono text-[11px] uppercase tracking-[1px] text-paper-dim/60">
          Showing {visible.length} of {reviews.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-paper-dim">
          No reviews match those filters — widen the minimum score or switch markets.
        </p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((review) => (
            <ReviewListingCard
              category={category}
              compare={{
                slug: review.slug,
                name: review.name,
                score: review.overallScore ?? 0,
                category,
              }}
              href={
                category === 'crypto'
                  ? `/crypto-casinos/${review.slug}`
                  : `/casinos/${review.slug}`
              }
              isIllustrativeSample={review.isIllustrativeSample}
              key={review.id}
              name={review.name}
              overallScore={review.overallScore}
              summary={review.summary}
            />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * Client wrapper — reads the URL params and keeps them in sync (see header).
 *
 * Controls are initialized to the DEFAULTS and only synced from the URL in an
 * effect, so the first client render matches the server-rendered Suspense
 * fallback exactly (no hydration mismatch on filtered URLs) before the URL
 * state takes over a frame later.
 */
export const SortableReviewGrid: React.FC<GridProps & { basePath: string }> = ({
  reviews,
  category,
  basePath,
  markets,
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [controls, setControlsState] = useState<ArchiveControls>(defaultArchiveControls)

  useEffect(() => {
    setControlsState(
      parseArchiveControls({
        sort: searchParams.get('sort'),
        min: searchParams.get('min'),
        market: searchParams.get('market'),
      }),
    )
  }, [searchParams])

  const setControls = (next: ArchiveControls) => {
    setControlsState(next)
    const qs = controlsToSearchParams(next).toString()
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
  }

  return (
    <GridContent
      category={category}
      controls={controls}
      markets={markets}
      onControlsChange={setControls}
      reviews={reviews}
    />
  )
}
