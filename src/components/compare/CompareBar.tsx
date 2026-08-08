'use client'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import { buildCompareUrl } from '@/lib/compare'
import {
  COMPARE_EVENT,
  COMPARE_STORAGE_KEY,
  readCompareSelection,
  writeCompareSelection,
  type CompareItem,
} from './CompareToggle'

/**
 * Floating bar that appears once two or more casinos are selected for
 * comparison (Phase 3 F3.2). Stays in sync with every CompareToggle via the
 * shared CustomEvent + the cross-tab storage event.
 */
export const CompareBar: React.FC = () => {
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    const sync = () => setItems(readCompareSelection())
    sync()
    window.addEventListener(COMPARE_EVENT, sync)
    window.addEventListener('storage', (e) => {
      if (e.key === COMPARE_STORAGE_KEY) sync()
    })
    return () => {
      window.removeEventListener(COMPARE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (items.length < 2) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4" role="region" aria-label="Casino comparison selection">
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-full border border-gold/40 bg-ink/95 px-4 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-md">
        {items.map((item) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-dusk pl-2.5 pr-1 py-1 font-mono text-[11px] text-paper"
            key={item.slug}
          >
            {item.name}
            <button
              aria-label={`Remove ${item.name} from comparison`}
              className="flex h-4 w-4 items-center justify-center rounded-full text-paper-dim transition-colors duration-200 hover:bg-coral/20 hover:text-coral"
              onClick={() => writeCompareSelection(items.filter((x) => x.slug !== item.slug))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <Link
          className="ml-1 rounded-full bg-gold px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-opacity duration-200 hover:opacity-90"
          href={buildCompareUrl(items.map((i) => i.slug))}
        >
          Compare {items.length}
        </Link>
      </div>
    </div>
  )
}
