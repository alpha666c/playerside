/**
 * Site search — Phase 3 (F3.1).
 *
 * The /search page queries the review + bonus collections directly (the
 * Payload search plugin only indexes the template `posts` collection, so the
 * template /search page could never find a casino). Everything here is pure
 * and unit-tested; the page only fetches and renders.
 */
export type SearchResultKind =
  | 'traditional'
  | 'crypto'
  | 'wagering-bonus'
  | 'no-wagering-bonus'

export type SearchResultItem = {
  id: string | number
  kind: SearchResultKind
  /** Display name — operator name for reviews, bonus title for bonuses. */
  name: string
  href: string
  /** The score shown next to the result (operator overall for bonuses). */
  score: number
  /** Human label, e.g. "9.1 / 10 overall" or "9.1 / 10 — Aurora Bay". */
  scoreLabel: string
  summary?: string | null
  isSample?: boolean | null
}

export const kindLabel: Record<SearchResultKind, string> = {
  traditional: 'Traditional casino',
  crypto: 'Crypto casino',
  'wagering-bonus': 'Wagering bonus',
  'no-wagering-bonus': 'No-wagering bonus',
}

/**
 * Rank merged search results: score descending, ties broken on name so the
 * order never flickers between renders. Bonuses whose linked operator is
 * unpopulated score 0 and rank last — visible, never hidden.
 */
export const rankSearchResults = (items: SearchResultItem[]): SearchResultItem[] =>
  [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name)
  })

/**
 * Normalize a traditional/crypto review doc into a search result. The rubric
 * drives nothing here — the score is the review's own overallScore.
 */
export const reviewToResult = (input: {
  id: string | number
  name: string
  slug: string
  summary?: string | null
  overallScore?: number | null
  isIllustrativeSample?: boolean | null
  kind: 'traditional' | 'crypto'
}): SearchResultItem => {
  const score = input.overallScore ?? 0
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    href: input.kind === 'crypto' ? `/crypto-casinos/${input.slug}` : `/casinos/${input.slug}`,
    score,
    scoreLabel: `${score.toFixed(1)} / 10 overall`,
    summary: input.summary,
    isSample: input.isIllustrativeSample,
  }
}

/**
 * Normalize a bonus doc into a search result. The displayed score is the
 * linked operator's overall score — a bonus from an unvetted operator must
 * not outrank one from a vetted one (mirrors rankWageringBonuses).
 */
export const bonusToResult = (input: {
  id: string | number
  title: string
  slug: string
  summary?: string | null
  isIllustrativeSample?: boolean | null
  kind: 'wagering-bonus' | 'no-wagering-bonus'
  operator?: { id: string | number; name?: string | null; overallScore?: number | null } | string | number | null
}): SearchResultItem => {
  const op = typeof input.operator === 'object' && input.operator ? input.operator : null
  const score = op?.overallScore ?? 0
  return {
    id: input.id,
    kind: input.kind,
    name: input.title,
    href:
      input.kind === 'no-wagering-bonus'
        ? `/bonuses/no-wagering/${input.slug}`
        : `/bonuses/wagering/${input.slug}`,
    score,
    scoreLabel: op?.name ? `${score.toFixed(1)} / 10 — ${op.name}` : `${score.toFixed(1)} / 10`,
    summary: input.summary,
    isSample: input.isIllustrativeSample,
  }
}

/** `like` clauses for the review collections (they have `name`, not `title`). */
export const reviewSearchClauses = (query: string): Record<string, unknown>[] => {
  const like = { like: query }
  return [{ name: like }, { slug: like }, { summary: like }]
}

/** `like` clauses for the bonus collections (they have `title`, not `name`). */
export const bonusSearchClauses = (query: string): Record<string, unknown>[] => {
  const like = { like: query }
  return [{ title: like }, { slug: like }, { summary: like }]
}
