'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'

/** Desktop-only inline nav links. Hidden below `md`; see `MobileNav` for the small-viewport equivalent. */
export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  if (navItems.length === 0) return null

  return (
    <nav className="hidden items-center gap-5 md:flex lg:gap-7" data-testid="header-nav">
      {navItems.map(({ link }, i) => (
        <CMSLink
          className="group relative font-mono text-[11px] uppercase tracking-[0.12em] text-paper-dim transition-colors duration-fast hover:text-paper lg:text-[12px] lg:tracking-[0.14em] after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-paper/70 after:transition-transform after:duration-med after:ease-quart hover:after:scale-x-100"
          key={i}
          {...link}
          appearance="inline"
        />
      ))}
    </nav>
  )
}
