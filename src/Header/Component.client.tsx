'use client'
import Link from 'next/link'
import React from 'react'

import type { Header } from '@/payload-types'

import { PillLink } from '@/components/PillButton'
import { Logo } from '@/components/Logo/Logo'
import { MobileNav } from '@/Header/MobileNav'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-line border-t-2 border-t-coral/60 bg-ink/72 backdrop-blur-[14px]">
      <div className="container relative flex items-center justify-between gap-4 py-5">
        <Link aria-label="Playerside — home" className="shrink-0" href="/">
          <Logo loading="eager" priority="high" />
        </Link>

        <HeaderNav data={data} />

        <div className="flex items-center gap-3">
          <Link
            aria-label="Search reviews and bonuses"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
            href="/search"
            title="Search"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <PillLink className="hidden sm:inline-flex" href="/reviews" variant="primary">
            Browse reviews
          </PillLink>
          <MobileNav data={data} />
        </div>
      </div>
    </header>
  )
}
