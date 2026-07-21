import React from 'react'

import type { Homepage } from '@/payload-types'

import { PillLink } from '@/components/PillButton'
import { Reveal } from '@/components/Reveal'

export const CtaBand: React.FC<{ data: Homepage }> = ({ data }) => (
  <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
    <Reveal
      as="div"
      className="rounded-[28px] bg-dusk px-6 py-14 text-center sm:px-10 sm:py-16 lg:px-12 lg:py-16"
    >
      <h2 className="mx-auto mb-5 max-w-[560px] text-[26px] leading-tight sm:text-[34px] lg:text-[42px]">
        {data.ctaHeading}
      </h2>
      <p className="mx-auto mb-7 max-w-[480px] text-paper-dim">{data.ctaSubtext}</p>
      <PillLink href={data.ctaButtonHref || '/#reviews'} variant="primary">
        {data.ctaButtonLabel}
      </PillLink>
    </Reveal>
  </section>
)
