import React from 'react'

import { cn } from '@/utilities/ui'

export type CategoryKind = 'traditional' | 'crypto'

const copy: Record<CategoryKind, string> = {
  traditional: 'Traditional casino',
  crypto: 'Crypto casino',
}

/**
 * The persistent, visually distinct category indicator required by
 * brand-spec.md ("a user should always be able to tell which one they're
 * in — not just a breadcrumb that could be missed") and ORG.md §3.4. Reuses
 * only locked design tokens: Traditional gets --evidence (the brand's
 * existing "grading/data" blue), Crypto gets --coral-dim (a muted variant of
 * the one bold accent, distinct from primary CTAs) — no new hue introduced.
 */
export const CategoryMarker: React.FC<{ kind: CategoryKind; className?: string }> = ({
  kind,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-normal uppercase tracking-[1.5px]',
      kind === 'traditional'
        ? 'border-evidence/50 text-evidence'
        : 'border-coral-dim/60 text-coral-dim',
      className,
    )}
  >
    <span aria-hidden="true" className="block h-[5px] w-[5px] rounded-full bg-current" />
    {copy[kind]}
  </span>
)
