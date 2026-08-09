import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

type PillButtonBaseProps = {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'ghost'
}

const variantClasses: Record<NonNullable<PillButtonBaseProps['variant']>, string> = {
  primary:
    'bg-coral text-ink-2 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(255,93,69,0.35)]',
  ghost: 'bg-transparent text-paper border border-line hover:border-paper/40',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-[14.5px] font-semibold transition-[transform,box-shadow,border-color] duration-fast ease-quart'

type PillLinkProps = PillButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, 'className' | 'children'>

type PillButtonProps = PillButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

/** Playerside's pill-shaped CTA — the only bold-color, high-motion button in the brand. */
export function PillButton({
  children,
  className,
  variant = 'primary',
  ...props
}: PillButtonProps) {
  return (
    <button className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </button>
  )
}

export function PillLink({ children, className, variant = 'primary', ...props }: PillLinkProps) {
  return (
    <Link className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </Link>
  )
}
