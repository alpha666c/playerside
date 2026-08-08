'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Site search input. Seeded from the URL's ?q= so shared/back-navigated
 * search links keep their query visible, and it never pushes a redundant
 * navigation on mount (which used to wipe ?q= from the URL the instant a
 * shared search link loaded — Phase 3 reviewer finding).
 */
export const Search: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(() => searchParams.get('q') ?? '')

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    const target = `/search${debouncedValue ? `?q=${debouncedValue}` : ''}`
    const current = `${window.location.pathname}${window.location.search}`
    if (target !== current) {
      router.push(target)
    }
  }, [debouncedValue, router])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          id="search"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Search casinos, bonuses…"
          value={value}
        />
        <button type="submit" className="sr-only">
          submit
        </button>
      </form>
    </div>
  )
}
