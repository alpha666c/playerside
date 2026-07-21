import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto border-t border-line bg-ink-2 text-paper-dim">
      <div className="container flex flex-col gap-7 py-12 sm:py-14">
        <div className="flex flex-col justify-between gap-6 border-b border-line pb-7 md:flex-row md:items-center">
          <Link aria-label="Playerside — home" href="/">
            <Logo />
          </Link>

          {navItems.length > 0 ? (
            <nav className="flex flex-wrap gap-x-7 gap-y-2">
              {navItems.map(({ link }, i) => (
                <CMSLink
                  className="text-[13.5px] text-paper-dim transition-colors hover:text-paper"
                  key={i}
                  {...link}
                  appearance="inline"
                />
              ))}
            </nav>
          ) : null}

          <p className="max-w-[360px] text-[13px] leading-relaxed md:text-right">
            Commission-blind. Licensed operators only in regulated markets. Reviews verified
            continuously.
          </p>
        </div>

        <p className="max-w-[640px] text-[12.5px] leading-relaxed opacity-80">
          Playerside is an independent review and comparison site. We may earn a commission when
          you sign up through links on this site — commission never influences a review score;
          see &ldquo;The wall&rdquo; above for how that separation actually works. All operator
          names, scores, and figures on this site are clearly marked when illustrative. 18+.
          Gambling can be addictive — play responsibly.
        </p>
      </div>
    </footer>
  )
}
