'use client'

import React, { useState } from 'react'

import { Reveal } from '@/components/Reveal'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export const MethodologyRow: React.FC<{ label: string; weight: number }> = ({
  label,
  weight,
}) => {
  const [filled, setFilled] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <Reveal
      as="div"
      className="grid grid-cols-[120px_1fr_46px] items-center gap-3.5 border-b border-line py-3 sm:grid-cols-[200px_1fr_60px] sm:gap-3.5"
      onReveal={() => setFilled(true)}
      threshold={0.4}
    >
      <span className="text-[13.5px] sm:text-[14.5px]">{label}</span>
      <div className="h-2 overflow-hidden rounded-[5px] bg-dusk">
        <div
          className="h-full rounded-[5px]"
          style={{
            width: filled ? `${weight}%` : '0%',
            background: 'linear-gradient(90deg, var(--coral), var(--evidence))',
            transition: reducedMotion ? 'width 0.3s ease' : 'width 1.1s cubic-bezier(.2,.7,.2,1)',
          }}
        />
      </div>
      <span className="text-right font-mono text-[13px] text-evidence sm:text-sm">{weight}%</span>
    </Reveal>
  )
}
