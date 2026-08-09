'use client'

import React, { useState } from 'react'

export interface FilterState {
  category: 'all' | 'traditional' | 'crypto'
  currency: string
  payoutSpeed: string
  jurisdiction: string
  searchQuery: string
}

export function InstantFilterBar({ onFilterChange }: { onFilterChange?: (filters: FilterState) => void }) {
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    currency: 'all',
    payoutSpeed: 'all',
    jurisdiction: 'all',
    searchQuery: '',
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    if (onFilterChange) onFilterChange(updated)
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-line bg-ink/80 p-4 shadow-panel backdrop-blur-xl sm:p-5">
      {/* Top Search & Filter Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Search operator, casino, or bonus terms..."
            className="w-full rounded-[10px] border border-line bg-ink-2 px-4 py-2.5 pl-9 font-sans text-xs text-paper outline-hidden transition-colors placeholder:text-paper-dim/50 focus:border-evidence"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-paper-dim/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Currency Selector */}
        <div>
          <select
            value={filters.currency}
            onChange={(e) => updateFilter('currency', e.target.value)}
            className="w-full cursor-pointer rounded-[10px] border border-line bg-ink-2 px-3 py-2.5 font-sans text-xs text-paper-dim outline-hidden transition-colors focus:border-evidence"
          >
            <option value="all">All Currencies</option>
            <option value="USDT">Tether (USDT)</option>
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="EUR">Euro (€)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>

        {/* Payout Speed Selector */}
        <div>
          <select
            value={filters.payoutSpeed}
            onChange={(e) => updateFilter('payoutSpeed', e.target.value)}
            className="w-full cursor-pointer rounded-[10px] border border-line bg-ink-2 px-3 py-2.5 font-sans text-xs text-paper-dim outline-hidden transition-colors focus:border-evidence"
          >
            <option value="all">Any Payout Speed</option>
            <option value="instant">Instant (&lt; 10 mins)</option>
            <option value="fast">&lt; 1 Hour</option>
            <option value="same-day">&lt; 24 Hours</option>
          </select>
        </div>

        {/* Jurisdiction Selector */}
        <div>
          <select
            value={filters.jurisdiction}
            onChange={(e) => updateFilter('jurisdiction', e.target.value)}
            className="w-full cursor-pointer rounded-[10px] border border-line bg-ink-2 px-3 py-2.5 font-sans text-xs text-paper-dim outline-hidden transition-colors focus:border-evidence"
          >
            <option value="all">All Regulators</option>
            <option value="MGA">Malta (MGA)</option>
            <option value="Curaçao">Curaçao eGaming</option>
            <option value="UKGC">UKGC (UK)</option>
            <option value="Isle of Man">Isle of Man GSC</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Category:</span>
          {(['all', 'traditional', 'crypto'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`rounded-[10px] px-3 py-1 text-xs font-medium transition-all duration-200 ${
                filters.category === cat
                  ? 'bg-coral text-ink-2 font-bold shadow-sm'
                  : 'border border-line bg-ink-2 text-paper-dim hover:border-evidence/50 hover:text-paper'
              }`}
            >
              {cat === 'all' ? 'All Casinos' : cat === 'crypto' ? 'Crypto Casinos' : 'Traditional Casinos'}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-2 font-mono text-[11px] text-paper-dim sm:flex">
          <span className="h-2 w-2 rounded-full bg-evidence" />
          Traceable Protocol Spec
        </div>
      </div>
    </div>
  )
}
