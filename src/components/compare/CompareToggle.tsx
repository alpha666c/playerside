'use client'
import React, { useCallback, useEffect, useState } from 'react'

/**
 * Compare selection — Phase 3 (F3.2). Persisted in localStorage so the
 * selection survives navigation; a shared CustomEvent keeps every toggle and
 * the floating CompareBar in sync (across tabs too via the storage event).
 */
export type CompareItem = {
  slug: string
  name: string
  score: number
  category: 'traditional' | 'crypto'
}

export const COMPARE_STORAGE_KEY = 'playerside.compare'
export const COMPARE_EVENT = 'playerside:compare-change'

const isCompareItem = (item: unknown): item is CompareItem => {
  if (!item || typeof item !== 'object') return false
  const x = item as Record<string, unknown>
  return (
    typeof x.slug === 'string' &&
    typeof x.name === 'string' &&
    (x.category === 'traditional' || x.category === 'crypto')
  )
}

export const readCompareSelection = (): CompareItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCompareItem)
  } catch {
    return []
  }
}

export const writeCompareSelection = (items: CompareItem[]): void => {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(COMPARE_EVENT))
}

export const CompareToggle: React.FC<{
  item: CompareItem
  /** Human label for the active state, e.g. "In compare". */
  activeLabel?: string
  idleLabel?: string
}> = ({ item, activeLabel = 'In compare', idleLabel = 'Compare' }) => {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(readCompareSelection().some((x) => x.slug === item.slug))
  }, [item.slug])

  const toggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const current = readCompareSelection()
      const next = current.some((x) => x.slug === item.slug)
        ? current.filter((x) => x.slug !== item.slug)
        : [...current, item].slice(0, 4)
      writeCompareSelection(next)
      setActive(next.some((x) => x.slug === item.slug))
    },
    [item],
  )

  return (
    <button
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px] transition-colors duration-200 ${
        active
          ? 'border-gold bg-gold/15 text-gold'
          : 'border-line bg-ink/40 text-paper-dim hover:border-evidence hover:text-paper'
      }`}
      onClick={toggle}
      type="button"
    >
      {active ? activeLabel : idleLabel}
    </button>
  )
}
