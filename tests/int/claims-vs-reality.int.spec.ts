import { describe, it, expect } from 'vitest'

import {
  buildClaimsRows,
  CLAIM_DEFS,
  CLAIM_KEYS,
  deriveClaimVerdict,
  formatClaimValue,
  PARTIAL_BAND,
  UNTESTED_TEXT,
} from '@/lib/claimsVsReality'

/**
 * MASTER-BLUEPRINT.md §6 — Claims vs Reality derivation. Pure; no DB.
 */
describe('§6 claims vs reality: verdict derivation', () => {
  it('marks met when measured is at or under the claim (lower is better)', () => {
    expect(deriveClaimVerdict(24, 24)).toBe('met')
    expect(deriveClaimVerdict(24, 18)).toBe('met')
  })

  it('marks partial within the 25% tolerance band', () => {
    expect(deriveClaimVerdict(24, 30)).toBe('partial') // 1.25× exactly
    expect(deriveClaimVerdict(20, 25)).toBe('partial')
  })

  it('marks missed beyond the band', () => {
    expect(deriveClaimVerdict(24, 31)).toBe('missed')
    expect(deriveClaimVerdict(10, 26)).toBe('missed')
  })

  it('renders untested when either side is missing (no fabrication)', () => {
    expect(deriveClaimVerdict(null, 24)).toBe('untested')
    expect(deriveClaimVerdict(24, null)).toBe('untested')
    expect(deriveClaimVerdict(undefined, undefined)).toBe('untested')
    expect(deriveClaimVerdict(0, 5)).toBe('untested') // claimed 0 is meaningless
    expect(deriveClaimVerdict(24, 0)).toBe('untested') // measured 0 is impossible
    expect(deriveClaimVerdict(24, -3)).toBe('untested') // negative = data typo
  })

  it('exposes the tolerance band as a documented constant', () => {
    expect(PARTIAL_BAND).toBe(1.25)
  })
})

describe('§6 claims vs reality: formatting + rows', () => {
  it('formats values with their unit', () => {
    expect(formatClaimValue(24, 'hours')).toBe('24 hours')
    expect(formatClaimValue(35, '×')).toBe('35×')
    expect(formatClaimValue(1.5, 'days')).toBe('1.5 days')
    expect(formatClaimValue(null, 'hours')).toBeNull()
  })

  it('builds rows in the standardized test order with derived verdicts', () => {
    const rows = buildClaimsRows({
      withdrawal: { claimedHours: 24, measuredHours: 18 },
      support: { claimedMinutes: 15, measuredMinutes: 18 }, // 1.2× — inside the 1.25 band
      kyc: { claimedDays: 2, measuredDays: 5 },
      bonus: null,
    })
    expect(rows.map((r) => r.key)).toEqual(CLAIM_KEYS)
    expect(rows[0].verdict).toBe('met')
    expect(rows[1].verdict).toBe('partial')
    expect(rows[2].verdict).toBe('missed')
    expect(rows[3].verdict).toBe('untested')
    expect(rows[3].measuredValue).toBeNull()
  })

  it('exposes the fixed untested copy used on the page', () => {
    expect(UNTESTED_TEXT).toBe('Not yet tested — pending hands-on verification.')
  })

  it('labels all four claims in human terms', () => {
    for (const key of CLAIM_KEYS) {
      expect(CLAIM_DEFS[key].label.length).toBeGreaterThan(3)
      expect(CLAIM_DEFS[key].unit.length).toBeGreaterThan(0)
    }
  })
})
