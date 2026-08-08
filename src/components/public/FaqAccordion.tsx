'use client'

import React, { useState } from 'react'

/**
 * FAQ accordion — same a11y contract as the ScoreBreakdown accordion:
 * real buttons with aria-expanded/aria-controls, bodies stay mounted in the
 * DOM (hidden, not unmounted) so the content remains crawlable.
 */
export const FaqAccordion: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => {
  const [openKeys, setOpenKeys] = useState<Set<number>>(() => new Set([0]))

  const toggle = (index: number) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="divide-y divide-line rounded-[var(--radius)] border border-line bg-dusk">
      {items.map((item, index) => {
        const open = openKeys.has(index)
        return (
          <div key={index}>
            <button
              aria-controls={`faq-${index}-body`}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
              onClick={() => toggle(index)}
              type="button"
            >
              <span className="text-[14.5px] font-medium text-paper sm:text-[15px]">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className={`font-mono text-sm text-gold transition-transform duration-200 ${
                  open ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            <div hidden={!open} id={`faq-${index}-body`} className="px-5 pb-5 sm:px-6">
              <p className="mb-0 text-[13.5px] leading-relaxed text-paper-dim">{item.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
