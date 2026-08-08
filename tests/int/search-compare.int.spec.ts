import { describe, it, expect } from 'vitest'

import {
  applyArchiveControls,
  controlsToSearchParams,
  defaultArchiveControls,
  parseArchiveControls,
} from '@/lib/archiveFilters'
import { buildCompareUrl, MAX_COMPARE_SLUGS, parseCompareSlugs, pickCompareGroup } from '@/lib/compare'
import {
  bonusToResult,
  kindLabel,
  rankSearchResults,
  reviewToResult,
} from '@/lib/siteSearch'

/**
 * Phase 3 — search + compare + archive filtering. Pure logic only; no DB.
 */
describe('Phase 3 F3.1: site-search normalization + ranking', () => {
  it('normalizes a review doc into a ranked result with its own score', () => {
    const r = reviewToResult({
      id: 1,
      name: 'Aurora Bay',
      slug: 'aurora-bay-casino',
      overallScore: 9.1,
      summary: 's',
      isIllustrativeSample: true,
      kind: 'traditional',
    })
    expect(r.href).toBe('/casinos/aurora-bay-casino')
    expect(r.scoreLabel).toBe('9.1 / 10 overall')
    expect(r.isSample).toBe(true)
  })

  it('routes crypto reviews to the crypto namespace', () => {
    const r = reviewToResult({ id: 2, name: 'X', slug: 'x', kind: 'crypto' })
    expect(r.href).toBe('/crypto-casinos/x')
  })

  it('ranks a bonus by its linked operator score, never the headline', () => {
    const b = bonusToResult({
      id: 3,
      title: '100% match',
      slug: 'm',
      kind: 'wagering-bonus',
      operator: { id: 9, name: 'Northlight', overallScore: 8.7 },
    })
    expect(b.score).toBe(8.7)
    expect(b.scoreLabel).toContain('Northlight')
    expect(b.href).toBe('/bonuses/wagering/m')
  })

  it('routes no-wagering bonuses to their namespace and degrades orphan bonuses', () => {
    const n = bonusToResult({ id: 4, title: 'Free spins', slug: 'fs', kind: 'no-wagering-bonus' })
    expect(n.href).toBe('/bonuses/no-wagering/fs')
    expect(n.score).toBe(0)
    const orphan = bonusToResult({
      id: 5,
      title: 'Orphan',
      slug: 'o',
      kind: 'wagering-bonus',
      operator: 42,
    })
    expect(orphan.score).toBe(0)
  })

  it('ranks merged results score-desc with deterministic name tie-breaks', () => {
    const ranked = rankSearchResults([
      { id: 1, kind: 'traditional', name: 'Gamma', href: '/c/g', score: 9.1, scoreLabel: '', summary: '', isSample: false },
      { id: 2, kind: 'traditional', name: 'Alpha', href: '/c/a', score: 9.1, scoreLabel: '', summary: '', isSample: false },
      { id: 3, kind: 'wagering-bonus', name: 'Z Bonus', href: '/b/z', score: 7.4, scoreLabel: '', summary: '', isSample: false },
    ] as never[])
    expect(ranked.map((r) => r.name)).toEqual(['Alpha', 'Gamma', 'Z Bonus'])
  })

  it('labels every result kind in human terms', () => {
    for (const kind of ['traditional', 'crypto', 'wagering-bonus', 'no-wagering-bonus'] as const) {
      expect(kindLabel[kind].length).toBeGreaterThan(3)
    }
  })
})

describe('Phase 3 F3.2: compare selection rules', () => {
  it('parses slugs: trimmed, deduped, capped at MAX_COMPARE_SLUGS', () => {
    expect(parseCompareSlugs(' a, b ,a,c,d,e ')).toEqual(['a', 'b', 'c', 'd'])
    expect(parseCompareSlugs(null)).toEqual([])
    expect(parseCompareSlugs('')).toEqual([])
    expect(parseCompareSlugs(' , , ')).toEqual([])
    expect(MAX_COMPARE_SLUGS).toBe(4)
  })

  it('builds a shareable compare URL', () => {
    expect(buildCompareUrl(['a', 'b'])).toBe('/compare?slugs=a,b')
    expect(buildCompareUrl([])).toBe('/compare')
  })

  it('prefers Traditional when a selection mixes categories (honest rule)', () => {
    const mixed = pickCompareGroup([
      { id: 1, slug: 't1', name: 'T1', href: '', category: 'traditional', rubric: [] },
      { id: 2, slug: 'c1', name: 'C1', href: '', category: 'crypto', rubric: [] },
    ] as never[])
    expect(mixed.group.map((e) => e.slug)).toEqual(['t1'])
    expect(mixed.mixed).toBe(true)

    const pure = pickCompareGroup([
      { id: 3, slug: 'c2', name: 'C2', href: '', category: 'crypto', rubric: [] },
    ] as never[])
    expect(pure.group[0].slug).toBe('c2')
    expect(pure.mixed).toBe(false)
  })
})

describe('Phase 3 F3.3: archive controls', () => {
  const reviews = [
    { id: 1, name: 'Gamma', slug: 'gamma', overallScore: 7.4, markets: ['nl'] },
    { id: 2, name: 'Alpha', slug: 'alpha', overallScore: 9.1, markets: ['nl', 'se'] },
    { id: 3, name: 'Beta', slug: 'beta', overallScore: 8.7, markets: ['de'] },
  ] as never[]

  it('defaults to score-desc with no floor', () => {
    const sorted = applyArchiveControls(reviews, defaultArchiveControls).map((r) => r.overallScore)
    expect(sorted).toEqual([9.1, 8.7, 7.4])
  })

  it('parses and validates raw params, forgiving bad input', () => {
    expect(parseArchiveControls({ sort: 'bogus', min: 'abc' })).toEqual(defaultArchiveControls)
    expect(parseArchiveControls({ sort: 'name', min: '8' })).toEqual({
      sort: 'name',
      minScore: 8,
      market: null,
    })
    expect(parseArchiveControls({ min: '9.4' }).minScore).toBe(9)
  })

  it('filters by minimum score and market, then sorts', () => {
    const controls = parseArchiveControls({ sort: 'score-desc', min: '8', market: 'nl' })
    const filtered = applyArchiveControls(reviews, controls).map((r) => r.name)
    expect(filtered).toEqual(['Alpha']) // Beta is DE, Gamma is 7.4 (< 8)
  })

  it('serializes non-default controls into shareable query params', () => {
    const params = controlsToSearchParams(parseArchiveControls({ sort: 'name', min: '8', market: 'se' }))
    expect(params.toString()).toContain('sort=name')
    expect(params.toString()).toContain('min=8')
    expect(params.toString()).toContain('market=se')
    expect(controlsToSearchParams(defaultArchiveControls).toString()).toBe('')
  })

  it('ties break on name for score sorts', () => {
    const tied = [
      { id: 1, name: 'Beta', slug: 'b', overallScore: 8 },
      { id: 2, name: 'Alpha', slug: 'a', overallScore: 8 },
    ] as never[]
    expect(applyArchiveControls(tied, defaultArchiveControls).map((r) => r.name)).toEqual([
      'Alpha',
      'Beta',
    ])
  })
})
