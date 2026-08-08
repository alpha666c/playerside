/**
 * Pure wagering-reality math for the bonus value calculator (Phase 1 F1.5).
 * Uses ONLY exact-term fields from `wagering-bonuses` — multiplier,
 * applies-to — never invented terms. The match percentage is an explicit,
 * user-adjustable assumption the UI labels as such.
 */

export type WageringAppliesTo = 'bonus_only' | 'bonus_plus_deposit'

export type WageringRealityInput = {
  deposit: number
  /** Assumed match percentage (0–200). The UI labels this as adjustable. */
  matchPercent: number
  multiplier: number
  appliesTo: WageringAppliesTo
}

export type WageringReality = {
  bonusAmount: number
  /** The amount the multiplier is applied against. */
  baseAmount: number
  /** Total turnover required to clear the wagering requirement. */
  requiredTurnover: number
  /** EUR wagered per EUR of bonus value (lower = friendlier terms). */
  effectiveRate: number
}

export const computeWageringReality = ({
  deposit,
  matchPercent,
  multiplier,
  appliesTo,
}: WageringRealityInput): WageringReality => {
  const safeDeposit = Math.max(0, Math.floor(deposit || 0))
  const safeMatch = Math.max(0, Math.min(200, Math.floor(matchPercent || 0)))
  const bonusAmount = Math.round((safeDeposit * safeMatch) / 100)
  const baseAmount =
    appliesTo === 'bonus_plus_deposit' ? safeDeposit + bonusAmount : bonusAmount
  const requiredTurnover = baseAmount * multiplier
  const effectiveRate = bonusAmount > 0 ? requiredTurnover / bonusAmount : 0
  return { bonusAmount, baseAmount, requiredTurnover, effectiveRate }
}

export const formatEur = (n: number): string =>
  `€${Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
