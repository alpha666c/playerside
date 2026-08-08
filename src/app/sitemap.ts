import type { MetadataRoute } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { marketArchives } from '@/lib/marketArchives'
import { topLists } from '@/lib/topLists'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * App-router sitemap (F2.5) — every public route, including the Phase 2
 * additions: market archives, best-of lists, review/bonus detail pages. The
 * next-sitemap config delegates robots.txt to this route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getServerSideURL()
  const payload = await getPayload({ config: configPromise })

  const [reviews, cryptoReviews, wagering, noWagering] = await Promise.all([
    payload.find({
      collection: 'traditional-casino-reviews',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'crypto-casino-reviews',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'wagering-bonuses',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'no-wagering-bonuses',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/casinos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/crypto-casinos`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/bonuses`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/bonuses/wagering`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/bonuses/no-wagering`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/missions`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/best-casinos`, changeFrequency: 'weekly', priority: 0.9 },
    ...marketArchives.map(
      (m): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}/markets/${m.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
    ...topLists.map(
      (l): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}/best-casinos/${l.slug}`,
        changeFrequency: 'weekly',
        priority: 0.9,
      }),
    ),
  ]

  const docRoutes = (base: string, docs: { slug?: string | null; updatedAt?: string | null }[]) =>
    docs.map(
      (doc): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}/${base}/${doc.slug}`,
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    )

  return [
    ...staticRoutes,
    ...docRoutes('casinos', reviews.docs),
    ...docRoutes('crypto-casinos', cryptoReviews.docs),
    ...docRoutes('bonuses/wagering', wagering.docs),
    ...docRoutes('bonuses/no-wagering', noWagering.docs),
  ]
}
