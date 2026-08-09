import Link from 'next/link'
import React from 'react'

type BonusLink = {
  slug: string
  title: string
  kind: 'wagering' | 'no-wagering'
  amount?: string | null
}

/**
 * Phase 2 (F2.3) internal-linking loop: every reviewed bonus page links to its
 * operator review (bonus.operator relationship, already on the bonus pages),
 * and this widget closes the loop by linking the review back to its bonus
 * pages. Pure presentational — the parent page fetches and passes the links.
 */
export const RelatedBonuses: React.FC<{ bonuses: BonusLink[] }> = ({ bonuses }) => {
  if (bonuses.length === 0) return null

  return (
    <section className="container mb-12 max-w-[760px] sm:mb-14" id="bonus-pages">
      <h2 className="mb-5 text-[18px] sm:text-[20px]">Bonus pages for this operator</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {bonuses.map((bonus) => (
          <Link
            className="group rounded-[var(--radius)] border border-line bg-dusk p-4 transition-colors duration-fast hover:border-gold/50 sm:p-5"
            href={`/bonuses/${bonus.kind}/${bonus.slug}`}
            key={`${bonus.kind}-${bonus.slug}`}
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[1.5px] text-paper-dim">
              {bonus.kind === 'wagering' ? 'Wagering bonus' : 'No-wagering bonus'}
              {bonus.amount ? ` · ${bonus.amount}` : ''}
            </p>
            <p className="mb-0 text-[14px] text-paper transition-colors group-hover:text-gold">
              {bonus.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
