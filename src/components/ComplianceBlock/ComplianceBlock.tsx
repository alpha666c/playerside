import React from 'react'

import type { CategoryKind } from '@/components/CategoryMarker/CategoryMarker'

type Market = 'nl' | 'se' | 'de' | 'uk'

/**
 * Self-exclusion scheme per market (spec.md's required field). Names/links
 * per spec.md — "confirm current names/links during legal review" before
 * public launch; these are the correct current official schemes as of this
 * build, not placeholders.
 */
const selfExclusion: Record<Market, { name: string; href: string }> = {
  nl: { name: 'CRUKS', href: 'https://cruks.nl' },
  se: { name: 'Spelpaus', href: 'https://spelpaus.se' },
  de: { name: 'OASIS (GGL)', href: 'https://oasis.ggl-behoerde.de' },
  uk: { name: 'GAMSTOP', href: 'https://www.gamstop.co.uk' },
}

const marketLabel: Record<Market, string> = {
  nl: 'Netherlands',
  se: 'Sweden',
  de: 'Germany',
  uk: 'United Kingdom',
}

/**
 * The structural compliance block required on every Traditional Casino page
 * (categories/traditional/spec.md): age notice, affiliate disclosure,
 * self-exclusion link per targeted market, license number + authority
 * displayed (not just linked). Renders unconditionally wherever it's
 * composed — the route template, not editorial content, is what makes this
 * a hard requirement rather than a checklist item (ORG.md §3.3).
 */
export const ComplianceBlock: React.FC<{
  category: CategoryKind
  licenseNumber: string
  licenseAuthority: string
  markets?: Market[]
  /** Crypto Casino only — spec.md's required explicit not-directed-at statement. */
  notDirectedAtRegulatedMarkets?: boolean
  /** Crypto Casino only — how a user can verify fairness themselves, if offered. */
  provablyFairInfo?: string | null
}> = ({
  category,
  licenseNumber,
  licenseAuthority,
  markets = [],
  notDirectedAtRegulatedMarkets,
  provablyFairInfo,
}) => (
  <div className="rounded-[var(--radius)] border border-line bg-ink-2/60 p-5 font-mono text-[12px] leading-relaxed text-paper-dim sm:p-6 sm:text-[12.5px]">
    <p className="mb-3 font-sans text-[13.5px] font-semibold text-paper">18+ — play responsibly</p>
    <dl className="m-0 grid gap-x-6 gap-y-2 sm:grid-cols-2">
      <div>
        <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">License</dt>
        <dd className="m-0 text-paper">
          {licenseNumber} — {licenseAuthority}
        </dd>
      </div>
      {category === 'traditional' && markets.length > 0 ? (
        <div>
          <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Self-exclusion
          </dt>
          <dd className="m-0 flex flex-wrap gap-x-3 gap-y-1">
            {markets.map((market) => (
              <a
                className="text-evidence underline decoration-evidence/40 underline-offset-2 hover:decoration-evidence"
                href={selfExclusion[market].href}
                key={market}
                rel="noopener noreferrer"
                target="_blank"
              >
                {marketLabel[market]}: {selfExclusion[market].name}
              </a>
            ))}
          </dd>
        </div>
      ) : null}
      {category === 'crypto' && provablyFairInfo ? (
        <div>
          <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
            Provably fair
          </dt>
          <dd className="m-0 text-paper">{provablyFairInfo}</dd>
        </div>
      ) : null}
    </dl>
    {category === 'crypto' && notDirectedAtRegulatedMarkets ? (
      <p className="mb-0 mt-4 border-t border-line pt-3 text-coral">
        This operator is not licensed in, and this content is not directed at, residents of the
        Netherlands, Sweden, Germany, or the United Kingdom.
      </p>
    ) : null}
    <p className="mb-0 mt-4 border-t border-line pt-3 text-[11.5px]">
      Playerside is an independent review site. We earn a standard affiliate commission if you
      sign up through a link on this page — commission never influences a review score (see{' '}
      <a className="text-evidence underline" href="/#wall">
        the commission-blind wall
      </a>
      ). Gambling can be addictive — play responsibly.
    </p>
  </div>
)
