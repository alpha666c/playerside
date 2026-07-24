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
    <div className="w-full bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="lg:col-span-2 relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Search operator, casino, or bonus terms..."
            className="w-full bg-zinc-950 border border-zinc-800/90 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-hidden transition-colors pl-9 font-sans"
          />
          <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Currency Selector */}
        <div>
          <select
            value={filters.currency}
            onChange={(e) => updateFilter('currency', e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800/90 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-hidden font-sans cursor-pointer"
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
            className="w-full bg-zinc-950 border border-zinc-800/90 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-hidden font-sans cursor-pointer"
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
            className="w-full bg-zinc-950 border border-zinc-800/90 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-hidden font-sans cursor-pointer"
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
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider font-semibold">Category:</span>
          {(['all', 'traditional', 'crypto'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filters.category === cat
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              {cat === 'all' ? 'All Casinos' : cat === 'crypto' ? 'Crypto Casinos' : 'Traditional Casinos'}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Verified Intel
        </div>
      </div>
    </div>
  )
}
