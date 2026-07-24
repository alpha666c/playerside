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
        { value: '8', label: 'Graded categories per operator' },
        { value: '100%', label: 'Bonus terms stated exactly' },
      ]

  return (
    <header className="relative isolate grid gap-10 overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-12 lg:pb-28 lg:pt-28">
      {/* Background Ambient Glows */}
      <Glow className="-left-40 -top-40 h-[560px] w-[560px] bg-amber-500/20 blur-[100px]" color="rgba(245, 158, 11, 0.2)" />
      <Glow className="-bottom-36 right-[10%] h-[460px] w-[460px] bg-emerald-500/15 blur-[90px]" color="rgba(16, 185, 129, 0.15)" />

      <div className="relative z-[3]">
        {/* State-of-the-Art Badge Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-xs font-mono font-medium text-amber-400 mb-6 shadow-md backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          100% Commission-Blind & Evidence-Logged
        </div>

        <Eyebrow>{data.heroEyebrow || 'Commission-Blind Casino Reviews'}</Eyebrow>

        <h1 className="mb-6 text-[36px] leading-[1.05] sm:text-[48px] lg:text-[62px] font-extrabold tracking-tight text-white">
          {data.heroHeadline || "The review site that isn't secretly working for the casinos."}
        </h1>

        <p className="mb-8 max-w-[500px] text-base text-zinc-400 sm:text-lg leading-relaxed">
          {data.heroSubhead || 'Every score traces back to logged evidence. Every bonus term is spelled out exactly — wagering, withdrawal caps, expiry, all of it.'}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <PillLink href={data.heroPrimaryCtaHref || '/#method'} variant="primary">
            {data.heroPrimaryCtaLabel || 'See How We Grade'}
          </PillLink>
          <PillLink href={data.heroSecondaryCtaHref || '/#wall'} variant="ghost">
            {data.heroSecondaryCtaLabel || 'Read The Wall'} &darr;
          </PillLink>
        </div>

        {/* Dynamic Stats Bar with Glassmorphic Cards */}
        <div className="mt-12 grid grid-cols-3 gap-4 sm:mt-14 max-w-xl">
          {stats.map((stat) => (
            <div
              className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 backdrop-blur-md shadow-xs hover:border-zinc-700 transition-all"
              key={stat.label}
            >
              <span className="block text-2xl font-bold text-amber-400 sm:text-[28px] font-mono tracking-tight">
                {stat.value}
              </span>
              <span className="text-[10px] uppercase font-mono leading-tight tracking-[0.5px] text-zinc-400 mt-1 block">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <HeroBlind />
      </div>
    </header>
  )
}
