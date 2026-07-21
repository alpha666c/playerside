'use client'

import { Menu, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { PillLink } from '@/components/PillButton'

/** Hamburger + slide-down panel — the concept file hid nav links under 760px with no replacement; this is the real mobile nav. */
export const MobileNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        aria-controls="mobile-nav-panel"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex size-10 items-center justify-center rounded-full border border-line text-paper"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
      </button>

      {open ? (
        <div
          className="absolute inset-x-0 top-full border-b border-line bg-ink/95 px-4 pb-6 pt-2 backdrop-blur-md sm:px-6"
          id="mobile-nav-panel"
        >
          {navItems.length > 0 ? (
            <nav className="flex flex-col gap-1 border-b border-line pb-4">
              {navItems.map(({ link }, i) => (
                <CMSLink
                  className="rounded-md px-2 py-3 text-[15px] text-paper-dim transition-colors hover:bg-dusk hover:text-paper"
                  key={i}
                  onClick={() => setOpen(false)}
                  {...link}
                  appearance="inline"
                />
              ))}
            </nav>
          ) : null}
          <PillLink
            className="mt-4 w-full"
            href="/#reviews"
            onClick={() => setOpen(false)}
            variant="primary"
          >
            Browse reviews
          </PillLink>
        </div>
      ) : null}
    </div>
  )
}
