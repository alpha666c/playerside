import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="container">
      <div className="panel overflow-hidden px-6 py-10 md:px-10 md:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-blueprint" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[46rem]">
            <p className="t-eyebrow mb-4 flex items-center gap-2">
              <span aria-hidden="true" className="text-coral">
                ▸
              </span>
              Field directive
            </p>
            {richText && <RichText className="mb-0" data={richText} enableGutter={false} />}
          </div>
          {(links || []).length > 0 ? (
            <div className="flex shrink-0 flex-col gap-4 sm:flex-row md:flex-col lg:flex-row">
              {(links || []).map(({ link }, i) => (
                <CMSLink key={i} size="lg" {...link} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4">
          <span className="t-caption font-mono uppercase tracking-[0.14em]">
            Commission-blind review ops
          </span>
          <span className="t-caption font-mono uppercase tracking-[0.14em]">18+ · Play responsibly</span>
        </div>
      </div>
    </div>
  )
}
