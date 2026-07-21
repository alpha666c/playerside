import React from 'react'

import type { Homepage } from '@/payload-types'

import { PillLink } from '@/components/PillButton'
import { Eyebrow } from '@/components/homepage/shared/Eyebrow'
import { Glow } from '@/components/homepage/shared/Glow'
import { HeroBlind } from './HeroBlind'

type HomepageHeroProps = {
  data: Homepage
}

export const HomepageHero: React.FC<HomepageHeroProps> = ({ data }) => {
  const stats = data.stats?.length
    ? data.stats
    : [
        { value: '0', label: 'Commission data seen by graders' },
        { value: '9', label: 'Graded categories per operator' },
        { value: '100%', label: 'Bonus terms stated exactly' },
      ]

  return (
    <header className="relative isolate grid gap-10 overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-28">
      <Glow className="-left-40 -top-40 h-[520px] w-[520px] bg-coral" color="var(--coral)" />
      <Glow
        className="-bottom-36 right-[10%] h-[420px] w-[420px]"
        color="var(--evidence)"
        opacity={0.1}
      />

      <div className="relative z-[3]">
        <Eyebrow>{data.heroEyebrow}</Eyebrow>
        <h1 className="mb-5 text-[34px] leading-[1.05] sm:text-[44px] lg:text-[58px]">
          {data.heroHeadline}
        </h1>
        <p className="mb-8 max-w-[480px] text-base text-paper-dim sm:text-lg">
          {data.heroSubhead}
        </p>
        <div className="flex flex-wrap gap-4">
          <PillLink href={data.heroPrimaryCtaHref || '/#method'} variant="primary">
            {data.heroPrimaryCtaLabel}
          </PillLink>
          <PillLink href={data.heroSecondaryCtaHref || '/#wall'} variant="ghost">
            {data.heroSecondaryCtaLabel} &darr;
          </PillLink>
        </div>

        <div className="mt-12 flex flex-wrap gap-8 sm:mt-14 sm:gap-9">
          {stats.map((stat) => (
            <div className="font-mono" key={stat.label}>
              <span className="block text-2xl text-coral sm:text-[26px]">{stat.value}</span>
              <span className="text-[11px] uppercase leading-snug tracking-[1px] text-paper-dim sm:text-xs">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <HeroBlind />
    </header>
  )
}
