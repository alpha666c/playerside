'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'

/** Desktop-only inline nav links. Hidden below `md`; see `MobileNav` for the small-viewport equivalent. */
export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  if (navItems.length === 0) return null

  return (
    <nav className="hidden items-center gap-8 md:flex" data-testid="header-nav">
      {navItems.map(({ link }, i) => (
        <CMSLink
          className="text-[14.5px] text-paper-dim transition-colors hover:text-paper"
          key={i}
          {...link}
          appearance="inline"
        />
      ))}
    </nav>
  )
}
