/**
 * Top-list configuration — Phase 2 (F2.4).
 *
 * Lists are *config + live CMS data*: the framing (title, intro, methodology,
 * FAQ) lives here, the ranked content is always fetched fresh from Payload on
 * request, so a list can never drift from the reviews it ranks. Rankings are
 * pure functions (unit-tested) — the page only fetches and renders.
 */
import { traditionalRubric } from '@/rubrics/traditional'
import type { RubricCategory } from '@/rubrics/traditional'

export type RankSource = 'reviews' | 'wagering-bonuses'

export type TopList = {
  slug: string
  navTitle: string
  title: string
  kicker: string
  /** Meta description. */
  description: string
  intro: string
  /** Methodology bullets — the honest "how this list was made" block. */
  howRanked: string[]
  faq: { q: string; a: string }[]
  /** Where the ranked items come from. */
  source: RankSource
  /** For reviews: overall score or a rubric category key (e.g. 'promotions'). */
  sortKey: 'overallScore' | RubricCategory['key']
}

export const topLists: TopList[] = [
  {
    slug: 'best-licensed-casinos',
    navTitle: 'Best licensed casinos',
    title: 'Best reviewed licensed casinos',
    kicker: "Editor's picks",
    description:
      'The best casino operators we have reviewed — ranked by overall score across nine rubric categories, every score traceable to logged evidence.',
    intro:
      'Every casino below was scored by our review team across nine rubric categories — licensing, withdrawals, bonus transparency, support, and more. The ranking is simply the overall score: no paid placements, no commission influence, illustrative samples flagged.',
    howRanked: [
      'Ranked by the weighted overall score from the nine-category rubric — never hand-sorted.',
      'Every score in every category is traceable to a logged evidence reference.',
      'Affiliate commission never influences a score (the commission-blind wall applies to every list).',
      'Illustrative sample operators are flagged — they are review-pipeline demos, not live offers.',
    ],
    faq: [
      {
        q: 'How is the overall score computed?',
        a: 'Each review is scored 0–10 on nine weighted categories (licensing, withdrawals, bonus transparency, support, KYC, games, deposits, live casino). The overall score is the weighted average — it is computed by the CMS on save, never hand-set.',
      },
      {
        q: 'Can a casino pay to be higher on this list?',
        a: 'No. We earn an affiliate commission if you sign up through a link on this site, but commission never influences a score — that separation is structural, not editorial. See the commission-blind wall for how it is enforced.',
      },
      {
        q: 'What is an illustrative sample?',
        a: 'A review marked "illustrative sample" is a demonstration case from our review pipeline (an obviously non-real licence number, e.g. SAMPLE-format). It keeps the site honest while the team works through the backlog — sample reviews are always flagged on the page.',
      },
    ],
    source: 'reviews',
    sortKey: 'overallScore',
  },
  {
    slug: 'best-bonus-transparency',
    navTitle: 'Best bonus transparency',
    title: 'Best casinos for bonus transparency',
    kicker: 'Terms that hold up',
    description:
      'Casinos ranked by the clarity and completeness of their bonus terms — the promotions rubric category, not bonus generosity.',
    intro:
      'A generous bonus with buried terms is a trap; a modest bonus with exact terms is a signal. This list ranks operators by the "Promotions & bonus transparency" rubric category — how completely and exactly bonus terms are stated, not how big the offer is.',
    howRanked: [
      'Ranked by the "Promotions & bonus transparency" category score (18% of the overall rubric).',
      'Bonus pages must state the exact multiplier, what it applies to, the exact cap, the exact clearance window, and exact contributing games — never "terms apply".',
      'No-wagering bonuses are judged by the same bar: no wagering does not mean no terms.',
    ],
    faq: [
      {
        q: 'Why rank by transparency instead of generosity?',
        a: 'Because a 35x bonus you can actually clear beats a 100x bonus you cannot. Our rubric scores how completely and honestly terms are stated — that is the measure that protects players.',
      },
      {
        q: 'Where do I find the exact terms?',
        a: 'Every ranked operator links to its full review, and every reviewed bonus has its own page with the exact multiplier, applies-to, cap, clearance window, and contributing games.',
      },
    ],
    source: 'reviews',
    sortKey: 'promotions',
  },
  {
    slug: 'best-wagering-bonuses',
    navTitle: 'Best wagering bonuses',
    title: 'Best wagering bonuses we have reviewed',
    kicker: 'Exact terms, ranked',
    description:
      'Wagering bonuses ranked by the reviewed operator\'s overall score — with the exact multiplier, applies-to, cap, and clearance window on every entry.',
    intro:
      'The best bonus from an unvetted operator is still a risk. Each entry here is a bonus we have reviewed *and* tied to its operator\'s overall score — so the ranking reflects the operator\'s standing, and the exact terms are always one click away.',
    howRanked: [
      'Ranked by the linked operator\'s overall rubric score — the operator\'s standing, not the headline number.',
      'Every entry shows the exact wagering multiplier and what it applies to.',
      'Affiliate commission never influences the ranking or the terms displayed.',
    ],
    faq: [
      {
        q: 'Is this the biggest bonus?',
        a: 'No — it is the best bonus attached to the best-reviewed operator. A 35x bonus at a 9.1-rated casino beats a 25x bonus at an operator we would not recommend.',
      },
      {
        q: 'Do the terms shown ever say "terms apply"?',
        a: 'Never. Every reviewed bonus publishes the exact multiplier, applies-to, cap, time limit, and contributing games. If a field is not stated exactly by the operator, we do not publish the bonus.',
      },
    ],
    source: 'wagering-bonuses',
    sortKey: 'overallScore',
  },
]

export const topListBySlug = (slug: string): TopList | undefined =>
  topLists.find((l) => l.slug === slug)

/** A ranked item shaped for rendering and JSON-LD. */
export type RankedEntry = {
  id: string | number
  title: string
  href: string
  /** The score used for ranking (overall or rubric-category). */
  score: number
  /** Human-readable score label, e.g. "9.1 / 10 overall". */
  scoreLabel: string
  blurb: string
  isSample: boolean
  /** ISO date for schema.org Review.datePublished. */
  updatedAt?: string | null
}

/**
 * Rank review docs by the requested key, descending. Pure + deterministic:
 * ties break on name, then id, so the output never flickers between renders.
 */
/** Human label for a rubric category key (reviewer pass: no raw keys in UI). */
const rubricLabel = (key: string): string =>
  traditionalRubric.find((c) => c.key === key)?.label ?? key

export const rankReviews = (
  reviews: Array<{
    id: string | number
    name: string
    slug: string
    summary?: string | null
    overallScore?: number | null
    scores?: Record<string, { score?: number } | null> | null
    isIllustrativeSample?: boolean | null
    updatedAt?: string | null
  }>,
  sortKey: 'overallScore' | RubricCategory['key'],
): RankedEntry[] =>
  reviews
    .map((r) => {
      const score =
        sortKey === 'overallScore'
          ? r.overallScore ?? 0
          : (r.scores?.[sortKey]?.score ?? 0)
      return {
        id: r.id,
        title: r.name,
        href: `/casinos/${r.slug}`,
        score,
        scoreLabel:
          sortKey === 'overallScore'
            ? `${score.toFixed(1)} / 10 overall`
            : `${score.toFixed(1)} / 10 — ${rubricLabel(sortKey)}`,
        blurb: r.summary ?? '',
        isSample: r.isIllustrativeSample ?? false,
        updatedAt: r.updatedAt,
      }
    })
    .sort(byScoreDesc)

/** Rank wagering bonuses by their linked operator's overall score, descending. */
export const rankWageringBonuses = (
  bonuses: Array<{
    id: string | number
    title: string
    slug: string
    summary?: string | null
    wageringMultiplier?: number | null
    wageringAppliesTo?: string | null
    operator?: { id: string | number; name?: string | null; overallScore?: number | null } | string | number | null
    isIllustrativeSample?: boolean | null
    updatedAt?: string | null
  }>,
): RankedEntry[] =>
  bonuses
    .map((b) => {
      const op = typeof b.operator === 'object' && b.operator ? b.operator : null
      const score = op?.overallScore ?? 0
      return {
        id: b.id,
        title: b.title,
        href: `/bonuses/wagering/${b.slug}`,
        score,
        scoreLabel:
          op && op.name
            ? `${score.toFixed(1)} / 10 — ${op.name}`
            : `${score.toFixed(1)} / 10`,
        blurb: b.summary ?? '',
        isSample: b.isIllustrativeSample ?? false,
        updatedAt: b.updatedAt,
      }
    })
    .sort(byScoreDesc)

const byScoreDesc = (a: RankedEntry, b: RankedEntry): number => {
  if (b.score !== a.score) return b.score - a.score
  return a.title.localeCompare(b.title)
}

/**
 * Schema.org JSON-LD for a ranked list — an `ItemList` whose elements are
 * `Review` nodes carrying the rubric rating, author, and publisher. Every
 * rating is the review's real, evidence-backed score (see grading-rubric.md).
 */
export const buildItemListJsonLd = (input: {
  name: string
  description: string
  entries: RankedEntry[]
  siteUrl: string
  /** Review list items are Organizations; bonus-list items are Products. */
  itemReviewedType?: 'Organization' | 'Product'
}): object => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ItemList',
      name: input.name,
      description: input.description,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: input.entries.length,
      itemListElement: input.entries.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,          item: {
            '@type': 'Review',
            name: `${entry.title} review — Playerside`,
            url: `${input.siteUrl}${entry.href}`,
            itemReviewed: {
              '@type': input.itemReviewedType ?? 'Organization',
              name: entry.title,
            },
            reviewRating: {
              '@type': 'Rating',
              ratingValue: entry.score,
              bestRating: 10,
              worstRating: 0,
            },
            ...(entry.blurb ? { reviewBody: entry.blurb } : {}),
            author: { '@type': 'Organization', name: 'Playerside' },
            publisher: { '@type': 'Organization', name: 'Playerside' },
            ...(entry.updatedAt ? { datePublished: entry.updatedAt } : {}),
          },
      })),
    },
  ],
})
