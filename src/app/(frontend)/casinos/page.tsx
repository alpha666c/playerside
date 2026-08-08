import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { CategoryMarker } from '@/components/CategoryMarker/CategoryMarker'
import {
  GridContent,
  SortableReviewGrid,
} from '@/components/archive/SortableReviewGrid'
import { defaultArchiveControls } from '@/lib/archiveFilters'
import { marketArchives } from '@/lib/marketArchives'
import { Suspense } from 'react'

export const revalidate = 600

export default async function CasinosPage() {
  const payload = await getPayload({ config: configPromise })

  const reviews = await payload.find({
    collection: 'traditional-casino-reviews',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    where: {
      _status: { equals: 'published' },
    },
  })

  return (
    <div className="py-14 sm:py-20">
      <div className="container mb-12 max-w-[720px] sm:mb-14">
        <CategoryMarker className="mb-4" kind="traditional" />
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          Traditional casino reviews.
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          Licensed operators in the Netherlands, Sweden, Germany, and the UK — scored on nine
          categories, every score traceable to logged evidence. Never bought, never adjusted for
          commission.{' '}
          <Link className="text-evidence underline" href="/#wall">
            See how the wall works
          </Link>
          .
        </p>
      </div>

      <div className="container">
        {reviews.docs.length === 0 ? (
          <p className="text-paper-dim">First reviews are in progress — check back soon.</p>
        ) : (
          <Suspense
            fallback={
              <GridContent
                category="traditional"
                controls={defaultArchiveControls}
                markets={marketArchives}
                reviews={reviews.docs as never[]}
              />
            }
          >
            <SortableReviewGrid
              basePath="/casinos"
              category="traditional"
              markets={marketArchives}
              reviews={reviews.docs as never[]}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description:
      'Commission-blind reviews of licensed casino operators in NL, SE, DE, and the UK — every score traceable to logged evidence.',
    title: 'Casino reviews — Playerside',
  }
}
