import React from 'react'

import { Reveal } from '@/components/Reveal'
import { Eyebrow } from './Eyebrow'

export const SectionHead: React.FC<{
  eyebrow: string
  heading: React.ReactNode
  className?: string
}> = ({ eyebrow, heading, className }) => (
  <Reveal className={`mb-12 max-w-[640px] sm:mb-14 ${className ?? ''}`}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="text-[26px] leading-[1.15] sm:text-[32px] lg:text-[40px]">{heading}</h2>
  </Reveal>
)
