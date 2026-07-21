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
    <header className="sticky top-0 z-40 border-b border-line bg-ink/72 backdrop-blur-[14px]">
      <div className="container relative flex items-center justify-between gap-4 py-5">
        <Link aria-label="Playerside — home" className="shrink-0" href="/">
          <Logo loading="eager" priority="high" />
        </Link>

        <HeaderNav data={data} />

        <div className="flex items-center gap-3">
          <PillLink className="hidden sm:inline-flex" href="/reviews" variant="primary">
            Browse reviews
          </PillLink>
          <MobileNav data={data} />
        </div>
      </div>
    </header>
  )
}
