'use client'

import React from 'react'

/**
 * Phase 1 (F1.6) — mobile-only table of contents. A sticky horizontal pill
 * row under the header that jumps to the review's sections. Hidden on
 * desktop where the single-column layout is short enough to scan.
 */
export const ReviewToc: React.FC<{ items: { id: string; label: string }[] }> = ({ items }) => {
  if (items.length === 0) return null
  return (
    <nav
      aria-label="On this page"
      className="sticky top-14 z-30 -mx-4 mb-6 overflow-x-auto px-4 pb-1 md:hidden"
    >
      <div className="flex gap-2">
        {items.map((item) => (
          <a
            className="whitespace-nowrap rounded-full border border-line bg-dusk px-3 py-1.5 font-mono text-[11px] text-paper-dim transition-colors hover:border-evidence/50 hover:text-paper"
            href={`#${item.id}`}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
