import { cn } from '@/utilities/ui'
import React from 'react'

/** Ambient soft-focus color blob used behind the hero. Decorative only — always aria-hidden. */
export const Glow: React.FC<{ className?: string; color: string; opacity?: number }> = ({
  className,
  color,
  opacity = 0.16,
}) => (
  <div
    aria-hidden="true"
    className={cn('pointer-events-none absolute z-0 rounded-full blur-[90px]', className)}
    style={{ background: color, opacity }}
  />
)
