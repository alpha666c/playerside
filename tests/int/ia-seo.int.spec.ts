import { describe, it, expect } from 'vitest'

import { isMarketSlug, marketArchives, marketBySlug } from '@/lib/marketArchives'
import {
  buildItemListJsonLd,
  rankReviews,
  rankWageringBonuses,
  topListBySlug,
} from '@/lib/topLists'

/**
 * Phase 2 (IA & SEO) — pure logic behind the market archives (F2.1) and the
 * best-of lists (F2.4). No DB required.
 */
describe('Phase 2 F2.1: market archives', () => {
  it('exposes exactly the four licensed markets with regulator metadata', () => {
    expect(marketArchives.map((m) => m.slug)).toEqual(['nl', 'se', 'de', 'uk'])
    expect(marketBySlug('nl')?.authority).toContain('Kansspelautoriteit')
    expect(marketBySlug('se')?.authority).toContain('Spelinspektionen')
    expect(marketBySlug('uk')?.authority).toContain('UK Gambling Commission')
    expect(marketBySlug('de')?.authority).toContain('GGL')
  })

  it('isMarketSlug guards unknown slugs so the route can 404', () => {
    expect(isMarketSlug('nl')).toBe(true)
    expect(isMarketSlug('fr')).toBe(false)
    expect(marketBySlug('fr')).toBeUndefined()
  })
})

describe('Phase 2 F2.4: review ranking', () => {
  const reviews = [
    { id: 1, name: 'Alpha', slug: 'alpha', overallScore: 7.5, summary: 'a', updatedAt: '2026-01-01' },
    { id: 2, name: 'Beta', slug: 'beta', overallScore: 9.1, summary: 'b', updatedAt: '2026-01-02' },
    { id: 3, name: 'Gamma', slug: 'gamma', overallScore: 9.1, summary: 'c', updatedAt: '2026-01-03' },
  ] as never[]

  it('ranks by overall score descending, with the editor top', () => {
    const ranked = rankReviews(reviews, 'overallScore')
    expect(ranked[0].title).toBe('Beta')
    expect(ranked[0].score).toBe(9.1)
    expect(ranked[1].score).toBe(9.1)
    expect(ranked[2].title).toBe('Alpha')
    expect(ranked[0].href).toBe('/casinos/beta')
  })

  it('breaks score ties deterministically by name', () => {
    const ranked = rankReviews(reviews, 'overallScore')
    expect(ranked[0].title).toBe('Beta')
    expect(ranked[1].title).toBe('Gamma') // equal scores: Beta < Gamma alphabetically
  })

  it('ranks by a rubric category key when asked (bonus transparency)', () => {
    const byPromo = [
      {
        id: 1,
        name: 'Alpha',
        slug: 'alpha',
        overallScore: 9,
        scores: { promotions: { score: 6 } },
      },
      {
        id: 2,
        name: 'Beta',
        slug: 'beta',
        overallScore: 7,
        scores: { promotions: { score: 9.5 } },
      },
    ] as never[]
    const ranked = rankReviews(byPromo, 'promotions')
    expect(ranked[0].title).toBe('Beta')
    expect(ranked[0].score).toBe(9.5)
    // human label, never the raw rubric key (reviewer pass)
    expect(ranked[0].scoreLabel).toContain('Promotions & bonus transparency')
    expect(ranked[0].scoreLabel).not.toContain('promotions')
  })
})

describe('Phase 2 F2.4: wagering-bonus ranking', () => {
  it('ranks bonuses by their linked operator overall score', () => {
    const bonuses = [
      {
        id: 1,
        title: 'Mediocre bonus',
        slug: 'med',
        operator: { id: 9, name: 'Ferrous', overallScore: 7.4 },
      },
      {
        id: 2,
        title: 'Great bonus',
        slug: 'great',
        operator: { id: 1, name: 'Aurora', overallScore: 9.1 },
      },
    ] as never[]
    const ranked = rankWageringBonuses(bonuses)
    expect(ranked[0].title).toBe('Great bonus')
    expect(ranked[0].score).toBe(9.1)
    expect(ranked[0].scoreLabel).toContain('Aurora')
    expect(ranked[0].href).toBe('/bonuses/wagering/great')
  })

  it('degrades gracefully when the operator relationship is not populated', () => {
    const ranked = rankWageringBonuses([
      { id: 1, title: 'Orphan', slug: 'orphan', operator: 42 },
    ] as never[])
    expect(ranked[0].score).toBe(0)
    expect(ranked[0].title).toBe('Orphan')
  })
})

describe('Phase 2 F2.4: Schema.org JSON-LD', () => {
  const entries = [
    {
      id: 1,
      title: 'Aurora Bay',
      href: '/casinos/aurora-bay-casino',
      score: 9.1,
      scoreLabel: '9.1 / 10 overall',
      blurb: '',
      isSample: false,
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 2,
      title: 'Northlight',
      href: '/casinos/northlight-casino',
      score: 8.7,
      scoreLabel: '8.7 / 10 overall',
      blurb: '',
      isSample: true,
      updatedAt: null,
    },
  ] as never[]

  it('builds an ItemList with ranked Review elements carrying real ratings', () => {
    const ld = buildItemListJsonLd({
      name: 'Best casinos',
      description: 'desc',
      entries,
      siteUrl: 'https://playerside.example',
    }) as {
      '@graph': Array<{ '@type': string; itemListElement: Array<{ position: number; item: { reviewRating: { ratingValue: number }; itemReviewed: { name: string } } }> }>
    }
    const graph = ld['@graph'][0]
    expect(graph['@type']).toBe('ItemList')
    expect(graph.itemListElement).toHaveLength(2)
    expect(graph.itemListElement[0].position).toBe(1)
    expect(graph.itemListElement[0].item.reviewRating.ratingValue).toBe(9.1)
    expect(graph.itemListElement[0].item.itemReviewed.name).toBe('Aurora Bay')
    expect(graph.itemListElement[1].position).toBe(2)
  })

  it('types bonus-list items as Product, not Organization (reviewer pass)', () => {
    const ld = buildItemListJsonLd({
      name: 'Best bonuses',
      description: 'desc',
      entries,
      siteUrl: 'https://playerside.example',
      itemReviewedType: 'Product',
    }) as {
      '@graph': Array<{ itemListElement: Array<{ item: { itemReviewed: { '@type': string }; reviewBody?: string } }> }>
    }
    const first = ld['@graph'][0].itemListElement[0].item
    expect(first.itemReviewed['@type']).toBe('Product')
    // blurb is included as reviewBody when present — entries here have empty blurbs
    expect(first.reviewBody).toBeUndefined()
  })
})

describe('Phase 2 F2.4: top-list config', () => {
  it('ships the three planned lists with required framing', () => {
    expect(topListBySlug('best-licensed-casinos')?.source).toBe('reviews')
    expect(topListBySlug('best-bonus-transparency')?.sortKey).toBe('promotions')
    expect(topListBySlug('best-wagering-bonuses')?.source).toBe('wagering-bonuses')
    for (const list of ['best-licensed-casinos', 'best-bonus-transparency', 'best-wagering-bonuses']) {
      const l = topListBySlug(list)
      expect(l?.howRanked.length).toBeGreaterThan(0)
      expect(l?.faq.length).toBeGreaterThan(0)
      expect(l?.intro.length).toBeGreaterThan(0)
    }
  })
})
