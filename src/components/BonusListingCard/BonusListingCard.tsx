import Link from 'next/link'
import React from 'react'

export const BonusListingCard: React.FC<{
  href: string
  title: string
  operatorName?: string
  summary?: string | null
  terms: string
  isIllustrativeSample?: boolean | null
}> = ({ href, title, operatorName, summary, terms, isIllustrativeSample }) => (
  <Link
    className="block rounded-[var(--radius)] border border-line bg-dusk p-6 transition-colors duration-200 hover:border-gold/50 sm:p-[26px]"
    href={href}
  >
    {operatorName ? (
      <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim">
        {operatorName}
      </p>
    ) : null}
    <h3 className="mb-2 text-lg sm:text-xl">{title}</h3>
    {summary ? (
      <p className="mb-3 line-clamp-2 text-[13.5px] leading-relaxed text-paper-dim">{summary}</p>
    ) : null}
    <p className="mb-0 border-t border-line pt-3 font-mono text-[12px] text-evidence">{terms}</p>
    {isIllustrativeSample ? (
      <p className="mb-0 mt-3 font-mono text-[10.5px] uppercase tracking-[1px] text-coral">
        Illustrative sample
      </p>
    ) : null}
  </Link>
)
