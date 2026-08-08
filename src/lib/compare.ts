/**
 * Casino comparison — Phase 3 (F3.2).
 *
 * /compare is shareable via `?slugs=a,b,c` (up to MAX_COMPARE_SLUGS). The
 * page fetches published reviews and renders one table per category — the
 * Traditional and Crypto rubrics differ, so a mixed selection cannot share
 * a table (that would be an apples-to-oranges score, which the commission-
 * blind methodology explicitly refuses). Everything here is pure + tested;
 * the page only fetches and renders.
 */

export const MAX_COMPARE_SLUGS = 4

export type CompareCategory = 'traditional' | 'crypto'

export type CompareRubricCategory = {
  key: string
  label: string
  weight: number
}

export type CompareScore = {
  score?: number | null
  narrative?: string | null
  evidence?: string | null
}

export type CompareEntry = {
  id: string | number
  slug: string
  name: string
  href: string
  category: CompareCategory
  overallScore?: number | null
  rubric: CompareRubricCategory[]
  scores?: Record<string, CompareScore | null> | null
  licenseAuthority?: string | null
  licenseNumber?: string | null
  markets?: string[] | null
  whatsGood?: string[] | null
  whatsBad?: string[] | null
  narrative?: string | null
  isSample?: boolean | null
}

/**
 * Parse the `?slugs=` param: comma-separated, trimmed, deduped, capped at
 * MAX_COMPARE_SLUGS. Returns [] for empty/invalid input.
 */
export const parseCompareSlugs = (raw: string | null | undefined): string[] => {
  if (!raw) return []
  const seen = new Set<string>()
  const slugs: string[] = []
  for (const part of raw.split(',')) {
    const slug = part.trim()
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    slugs.push(slug)
    if (slugs.length >= MAX_COMPARE_SLUGS) break
  }
  return slugs
}

/** Split entries by category — the honest partition before comparing. */
export const partitionByCategory = (entries: CompareEntry[]): {
  traditional: CompareEntry[]
  crypto: CompareEntry[]
} => {
  const traditional: CompareEntry[] = []
  const crypto: CompareEntry[] = []
  for (const entry of entries) {
    if (entry.category === 'crypto') crypto.push(entry)
    else traditional.push(entry)
  }
  return { traditional, crypto }
}

/**
 * Choose the group a table can honestly compare. If the selection mixes
 * categories, Traditional wins (the current catalog) and `mixed` is set so
 * the page can say why some entries were excluded — never a silent mix.
 */
export const pickCompareGroup = (
  entries: CompareEntry[],
): { group: CompareEntry[]; mixed: boolean } => {
  const { traditional, crypto } = partitionByCategory(entries)
  if (traditional.length > 0 && crypto.length > 0) {
    return { group: traditional, mixed: true }
  }
  return { group: traditional.length > 0 ? traditional : crypto, mixed: false }
}

/** Shareable URL for a selection. */
export const buildCompareUrl = (slugs: string[]): string =>
  `/compare${slugs.length > 0 ? `?slugs=${slugs.join(',')}` : ''}`
