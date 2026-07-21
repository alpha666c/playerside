'use client'

import React, { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

/** The dashed gold line splitting "The Wall" — scales in from the top once revealed. */
export const WallDivider: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-hidden="true"
      className="mx-7 hidden origin-top transition-transform duration-1000 ease-out md:block"
      ref={ref}
      style={{
        width: 2,
        background:
          'repeating-linear-gradient(180deg, var(--gold) 0 10px, transparent 10px 20px)',
        transform: reducedMotion ? 'none' : visible ? 'scaleY(1)' : 'scaleY(0)',
        opacity: reducedMotion ? (visible ? 1 : 0) : 1,
        transitionProperty: reducedMotion ? 'opacity' : 'transform',
      }}
    />
  )
}
