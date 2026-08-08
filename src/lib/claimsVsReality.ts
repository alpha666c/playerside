/**
 * Claims vs Reality — MASTER-BLUEPRINT.md §6.
 *
 * Every published review carries claimed/measured pairs for the four
 * standardized hands-on tests. Verdicts are DERIVED from the two numbers —
 * never hand-set (same ethos as overallScore). All four claims are
 * lower-is-better: a measured value at or under the claim is Met, up to 25%
 * over is Partial, beyond that is Not met. Missing either side renders the
 * honest §6 fallback: "Not yet tested — pending hands-on verification."
 */
export type ClaimVerdict = 'met' | 'partial' | 'missed' | 'untested'

/**
 * The stored shape — mirrors the `claimsVsReality` group on the review
 * collections (claimsVsRealityFields in collections/shared/reviewFields.ts).
 * Field names are the payload column names (claimedHours, measuredHours, …).
 */
export type ClaimsInput = {
  withdrawal?: { claimedHours?: number | null; measuredHours?: number | null } | null
  support?: { claimedMinutes?: number | null; measuredMinutes?: number | null } | null
  kyc?: { claimedDays?: number | null; measuredDays?: number | null } | null
  bonus?: { claimedWager?: number | null; measuredWager?: number | null } | null
}

export type ClaimKey = keyof ClaimsInput

/** All stored column names across the four claim groups. */
export type ClaimField =
  | 'claimedHours'
  | 'measuredHours'
  | 'claimedMinutes'
  | 'measuredMinutes'
  | 'claimedDays'
  | 'measuredDays'
  | 'claimedWager'
  | 'measuredWager'

export const CLAIM_KEYS: ClaimKey[] = ['withdrawal', 'support', 'kyc', 'bonus']

export const CLAIM_DEFS: Record<
  ClaimKey,
  {
    label: string
    claimedLabel: string
    measuredLabel: string
    /** Field names on the stored group. */
    claimedField: ClaimField
    measuredField: ClaimField
    /** Display suffix: "hours", "minutes", "days", "×". */
    unit: string
  }
> = {
  withdrawal: {
    label: 'Withdrawal speed',
    claimedLabel: 'Stated processing time',
    measuredLabel: 'Actual payout time',
    claimedField: 'claimedHours',
    measuredField: 'measuredHours',
    unit: 'hours',
  },
  support: {
    label: 'Support response (live chat)',
    claimedLabel: 'Stated response time',
    measuredLabel: 'Time to first human reply',
    claimedField: 'claimedMinutes',
    measuredField: 'measuredMinutes',
    unit: 'minutes',
  },
  kyc: {
    label: 'KYC turnaround',
    claimedLabel: 'Stated verification time',
    measuredLabel: 'Actual approval time',
    claimedField: 'claimedDays',
    measuredField: 'measuredDays',
    unit: 'days',
  },
  bonus: {
    label: 'Bonus wagering',
    claimedLabel: 'Stated wagering requirement',
    measuredLabel: 'Actual requirement faced',
    claimedField: 'claimedWager',
    measuredField: 'measuredWager',
    unit: '×',
  },
}

/** 1.0 = met exactly; the tolerance band before a claim counts as missed. */
export const PARTIAL_BAND = 1.25

/** Derive the verdict for one claimed/measured pair (lower is better). */
export const deriveClaimVerdict = (
  claimed: number | null | undefined,
  measured: number | null | undefined,
): ClaimVerdict => {
  // A claimed 0 is meaningless, and a measured 0 (or negative — data typo) is
  // impossible for a real measurement (a payout cannot take 0 hours). Either
  // degrades to untested, never to a proud green "Met".
  if (
    typeof claimed !== 'number' ||
    typeof measured !== 'number' ||
    claimed <= 0 ||
    measured <= 0
  ) {
    return 'untested'
  }
  if (measured <= claimed) return 'met'
  if (measured <= claimed * PARTIAL_BAND) return 'partial'
  return 'missed'
}

/** Format a number for display, e.g. 24 hours → "24 hours", 35 → "35×". */
export const formatClaimValue = (value: number | null | undefined, unit: string): string | null => {
  if (typeof value !== 'number') return null
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1)
  // The × unit reads better joined ("35×" not "35 ×").
  return unit === '×' ? `${formatted}${unit}` : `${formatted} ${unit}`
}

export type ClaimRow = {
  key: ClaimKey
  label: string
  claimedLabel: string
  measuredLabel: string
  claimedValue: string | null
  measuredValue: string | null
  verdict: ClaimVerdict
}

/** Build the display rows for the table, in the standardized test order. */
export const buildClaimsRows = (claims: ClaimsInput | null | undefined): ClaimRow[] =>
  CLAIM_KEYS.map((key) => {
    // The stored group is a record of optional numeric fields; the defs know
    // which field is the claimed/measured side per claim.
    const pair = (claims?.[key] ?? null) as Record<string, number | null | undefined> | null
    const def = CLAIM_DEFS[key]
    const claimed = pair?.[def.claimedField] ?? null
    const measured = pair?.[def.measuredField] ?? null
    return {
      key,
      label: def.label,
      claimedLabel: def.claimedLabel,
      measuredLabel: def.measuredLabel,
      claimedValue: formatClaimValue(claimed, def.unit),
      measuredValue: formatClaimValue(measured, def.unit),
      verdict: deriveClaimVerdict(claimed, measured),
    }
  })

/** The §6 cell text for untested measurements — fixed, no fabrication. */
export const UNTESTED_TEXT = 'Not yet tested — pending hands-on verification.'
