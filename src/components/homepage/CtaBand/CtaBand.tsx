import React from 'react'

import type { Homepage } from '@/payload-types'

import { PillLink } from '@/components/PillButton'
import { Reveal } from '@/components/Reveal'
import { VerificationSeal } from '@/components/VerificationSeal/VerificationSeal'

/**
 * The close of the evidence archive — a filed, sealed document rather than a
 * marketing band: asymmetric, hairline-ruled, stamped once, with a mono filing
 * line as the last word. Leaves with trust, not pressure.
 */
export const CtaBand: React.FC<{ data: Homepage }> = ({ data }) => (
  <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
    <Reveal
      as="div"
      className="relative mx-auto max-w-[860px] rounded-[var(--radius)] border border-line bg-ink-2/70 px-6 py-12 sm:px-10 sm:py-14 lg:px-14"
    >
      <VerificationSeal
        className="absolute -top-6 right-6 sm:right-10"
        delayMs={200}
        size={64}
        title="Playerside — filed and sealed"
      />
      <h2 className="mb-5 max-w-[560px] text-[26px] leading-tight sm:text-[34px] lg:text-[42px]">
        {data.ctaHeading}
      </h2>
      <p className="mb-8 max-w-[480px] text-paper-dim">{data.ctaSubtext}</p>
      <PillLink href={data.ctaButtonHref || '/#reviews'} variant="primary">
        {data.ctaButtonLabel}
      </PillLink>
      <div className="mt-10 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-[2.5px] text-paper-dim">
        Playerside — independent · evidence logged · commission-blind
      </div>
    </Reveal>
  </section>
)
