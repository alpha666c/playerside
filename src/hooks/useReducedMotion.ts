'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks `(prefers-reduced-motion: reduce)`. Starts `true` (the safe default
 * for SSR/first paint) and corrects itself on mount, so nothing animates
 * before we know the user's preference.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}
