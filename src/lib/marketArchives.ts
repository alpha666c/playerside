/**
 * Market category archives — Phase 2 (F2.1).
 *
 * The honest category axis for a licensed-casino review site is the *market*:
 * a traditional review is licensed in NL/SE/DE/UK (the `markets` field on the
 * TraditionalCasinoReviews collection), and that field already exists in the
 * CMS — so `/markets/[market]` archives are CMS-data-driven with zero schema
 * migration. The `Categories` collection (a Payload-template leftover) has no
 * relationship to reviews and would duplicate this axis (region ≈ market,
 * casino type ≈ URL namespace) at migration risk — see DECISION-LOG 2026-08-08.
 *
 * Note: `/casinos/[category]` is structurally impossible — Next.js forbids two
 * dynamic segments in the same path, and `/casinos/[slug]` already owns that
 * namespace for review pages.
 */
export type MarketSlug = 'nl' | 'se' | 'de' | 'uk'

export type MarketMeta = {
  slug: MarketSlug
  /** Country label, e.g. "Netherlands". */
  label: string
  /** Regulator, e.g. "Kansspelautoriteit (KSA)". */
  authority: string
  /** Short SEO intro used as the page lede. */
  description: string
  /** Regulatory-system note shown in the methodology strip. */
  note: string
}

export const marketArchives: MarketMeta[] = [
  {
    slug: 'nl',
    label: 'Netherlands',
    authority: 'Kansspelautoriteit (KSA)',
    description:
      'Casino reviews of operators holding a Dutch KSA licence — scored on nine categories with every score traceable to logged evidence.',
    note: 'Online casino licences in the Netherlands are issued by the Kansspelautoriteit (KSA) under the Remote Gambling Act.',
  },
  {
    slug: 'se',
    label: 'Sweden',
    authority: 'Spelinspektionen',
    description:
      'Casino reviews of operators licensed by Spelinspektionen in Sweden — commission-blind scores, every number traceable to evidence.',
    note: 'The Swedish Gambling Authority (Spelinspektionen) regulates all licensed online casino activity in Sweden.',
  },
  {
    slug: 'de',
    label: 'Germany',
    authority: 'Gemeinsame Glücksspielbehörde der Länder (GGL)',
    description:
      'Casino reviews of operators licensed under the German State Treaty on Gambling (GGL) — scored on nine categories with logged evidence.',
    note: 'Germany regulates licensed online casino content under the State Treaty on Gambling, enforced by the GGL.',
  },
  {
    slug: 'uk',
    label: 'United Kingdom',
    authority: 'UK Gambling Commission (UKGC)',
    description:
      'Casino reviews of UKGC-licensed operators in the United Kingdom — commission-blind scoring with every score traceable to logged evidence.',
    note: 'The UK Gambling Commission (UKGC) licences and regulates all commercial gambling in Great Britain.',
  },
]

/** Returns the market meta for a slug, or undefined for anything that isn't a known market. */
export const marketBySlug = (slug: string): MarketMeta | undefined =>
  marketArchives.find((m) => m.slug === slug)

/** Type guard — used to 404 unknown slugs in the dynamic route. */
export const isMarketSlug = (slug: string): slug is MarketSlug =>
  marketArchives.some((m) => m.slug === slug)
