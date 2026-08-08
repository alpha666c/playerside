/**
 * Archive sorting + filtering — Phase 3 (F3.3).
 *
 * The archive pages (/casinos, /markets/[market], /crypto-casinos) fetch
 * every published review server-side and hand the docs to a client
 * SortableReviewGrid; this module is the pure, unit-tested logic behind that
 * grid (sort + market chip + minimum-score filter). Controls are serialized
 * into the URL (?sort=&min=&market=) so a filtered view is shareable and
 * survives a reload — the grid never re-fetches.
 */

export type ArchiveSort = 'score-desc' | 'score-asc' | 'name'

export type ArchiveControls = {
  sort: ArchiveSort
  /** Minimum overall score (0 = no floor). */
  minScore: number
  /** Market slug, or null for "all markets". */
  market: string | null
}

export const defaultArchiveControls: ArchiveControls = {
  sort: 'score-desc',
  minScore: 0,
  market: null,
}

export type ArchiveReview = {
  id: string | number
  name: string
  slug: string
  summary?: string | null
  overallScore?: number | null
  isIllustrativeSample?: boolean | null
  markets?: string[] | null
}

export const validSorts: ArchiveSort[] = ['score-desc', 'score-asc', 'name']

const isArchiveSort = (value: string): value is ArchiveSort =>
  (validSorts as string[]).includes(value)

/**
 * Parse raw URL params into controls. Unknown/invalid values fall back to
 * defaults — the grid is forgiving, never erroring on a hand-edited URL.
 */
export const parseArchiveControls = (params: {
  sort?: string | null
  min?: string | null
  market?: string | null
}): ArchiveControls => {
  const sort = params.sort && isArchiveSort(params.sort) ? params.sort : defaultArchiveControls.sort

  let minScore = defaultArchiveControls.minScore
  if (params.min) {
    const parsed = Number(params.min)
    if (Number.isFinite(parsed)) minScore = Math.max(0, Math.min(10, Math.round(parsed)))
  }

  let market: string | null = defaultArchiveControls.market
  if (params.market) {
    const m = params.market.trim()
    market = m.length > 0 ? m : null
  }

  return { sort, minScore, market }
}

/** Filter, then sort — pure and deterministic (ties break on name). */
export const applyArchiveControls = (
  reviews: ArchiveReview[],
  controls: ArchiveControls,
): ArchiveReview[] => {
  const filtered = reviews.filter((r) => {
    if (controls.minScore > 0 && (r.overallScore ?? 0) < controls.minScore) return false
    if (controls.market && !(r.markets ?? []).includes(controls.market)) return false
    return true
  })

  return [...filtered].sort((a, b) => {
    const aScore = a.overallScore ?? 0
    const bScore = b.overallScore ?? 0
    if (controls.sort === 'name') return a.name.localeCompare(b.name)
    if (controls.sort === 'score-asc') {
      if (aScore !== bScore) return aScore - bScore
      return a.name.localeCompare(b.name)
    }
    if (bScore !== aScore) return bScore - aScore
    return a.name.localeCompare(b.name)
  })
}

/** Serialize controls back into URL query params for router.replace. */
export const controlsToSearchParams = (controls: ArchiveControls): URLSearchParams => {
  const params = new URLSearchParams()
  if (controls.sort !== defaultArchiveControls.sort) params.set('sort', controls.sort)
  if (controls.minScore > 0) params.set('min', String(controls.minScore))
  if (controls.market) params.set('market', controls.market)
  return params
}
