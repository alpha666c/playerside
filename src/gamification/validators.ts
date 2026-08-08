/**
 * vex-ledger: pure mission-step validators.
 *
 * Law: XP is emitted only by validated state transitions. The correct answer
 * for a `wagering_math` step is COMPUTED from the real bonus document at
 * submit time — never stored, never supplied by the client. If the bonus data
 * changes, the mission stays truthful.
 */

export type BonusSnapshot = {
  wageringMultiplier: number
  wageringAppliesTo: 'bonus_only' | 'bonus_plus_deposit'
}

export type QuizStep = {
  kind: 'quiz'
  prompt: string
  options: { key: string; label: string }[]
  correctKey: string
  rgExplain?: string
  hint?: string
}

export type WageringMathStep = {
  kind: 'wagering_math'
  prompt: string
  options: { key: string; label: string }[]
  /** Slug of the wagering-bonuses doc the answer is computed from. */
  bonusSlug: string
  /** Assumed deposit (the mission fixes this so the math is checkable). */
  depositAmount: number
  rgExplain?: string
  hint?: string
}

/**
 * Phase 4 (F4.4): the answer is the license field on a LIVE review doc —
 * never stored in the step, never supplied by the client. e.g. "who issued
 * Aurora Bay's licence?" -> correct answer = compliance.licenseAuthority.
 */
export type LicenseFieldMatchStep = {
  kind: 'license_field_match'
  prompt: string
  options: { key: string; label: string }[]
  /** Slug of a traditional-casino-reviews doc whose compliance field is the answer. */
  reviewSlug: string
  /** Which compliance field holds the expected value. */
  expectedField: 'licenseAuthority' | 'licenseNumber'
  rgExplain?: string
  hint?: string
}

/**
 * Phase 4 (F4.4): the answer is whether a LIVE bonus doc satisfies a filter.
 * Criteria are computed at submit time from the bonus data (only the criteria
 * the data can actually support are implemented — wageringLte today).
 */
export type CasinoFilterMatchStep = {
  kind: 'casino_filter_match'
  prompt: string
  options: { key: string; label: string }[]
  /** Slug of the wagering-bonuses doc the filter is evaluated against. */
  bonusSlug: string
  /** Filter criteria. Unset criteria are ignored; a step with NO criteria fails closed. */
  filter: { wageringLte?: number }
  /** Which option key is the "passes the filter" answer. */
  passKey: string
  /** Which option key is the "fails the filter" answer. */
  failKey: string
  rgExplain?: string
  hint?: string
}

export type QuestStep = QuizStep | WageringMathStep | LicenseFieldMatchStep | CasinoFilterMatchStep

export type StepResult =
  | { pass: true; correctValue?: string | number }
  | { pass: false; rgExplain: string }

/** Turnover required before withdrawal for a 100%-matched deposit. */
export const requiredTurnover = (
  bonus: BonusSnapshot,
  depositAmount: number,
): number => {
  const stake = bonus.wageringAppliesTo === 'bonus_plus_deposit' ? depositAmount * 2 : depositAmount
  return bonus.wageringMultiplier * stake
}

export const validateQuizStep = (step: QuizStep, answerKey: string): StepResult => {
  if (answerKey === step.correctKey) return { pass: true, correctValue: answerKey }
  return { pass: false, rgExplain: step.rgExplain ?? 'Check the terms again — the right answer is in there.' }
}

/**
 * Validates a wagering-math answer. The correct option is derived by
 * computing required turnover from the LIVE bonus snapshot, then matching the
 * option whose numeric label equals that value. The option key that carries
 * that value is the only acceptable answer.
 */
export const validateWageringMathStep = (
  step: WageringMathStep,
  bonus: BonusSnapshot,
  answerKey: string,
): StepResult => {
  const expected = requiredTurnover(bonus, step.depositAmount)
  const correctOption = step.options.find((o) => parseLabelAsNumber(o.label) === expected)
  if (!correctOption) {
    // Mission config drifted from the bonus data — fail closed, never mint.
    return {
      pass: false,
      rgExplain: 'The mission data is out of sync with the review. No XP awarded.',
    }
  }
  if (answerKey === correctOption.key) {
    return { pass: true, correctValue: expected }
  }
  return { pass: false, rgExplain: step.rgExplain ?? `Expected a €${expected.toLocaleString('en-US')} requirement. Recheck the multiplier and what it applies to.` }
}

/** Parses "€14,000", "$7,000", "7,000", "14000" into a number (best-effort). */
export const parseLabelAsNumber = (label: string): number => {
  const digits = label.replace(/[^0-9.-]/g, '')
  const n = Number(digits)
  return Number.isFinite(n) ? n : NaN
}

/** Normalizes a value for license matching: lowercase, strip non-alphanumerics. */
export const normalizeKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

/** True when one normalized string contains the other (either direction). */
export const keyMatches = (a: string, b: string): boolean => {
  const na = normalizeKey(a)
  const nb = normalizeKey(b)
  if (na.length === 0 || nb.length === 0) return false
  return na.includes(nb) || nb.includes(na)
}

export type LicenseReviewSnapshot = {
  compliance?: { licenseAuthority?: string | null; licenseNumber?: string | null } | null
}

/**
 * License-field match: the expected value is the LIVE review doc's compliance
 * field, and the correct option is the one whose label matches it. Fails
 * closed — if the review or the expected field is missing, no answer passes.
 */
export const validateLicenseFieldMatch = (
  step: LicenseFieldMatchStep,
  review: LicenseReviewSnapshot | null | undefined,
  answerKey: string,
): StepResult => {
  const expected = review?.compliance?.[step.expectedField]
  if (!expected) {
    return {
      pass: false,
      rgExplain: 'The review data is out of reach. No XP awarded — the mission stays honest.',
    }
  }
  const correctOption = step.options.find((o) => keyMatches(o.label, expected))
  if (!correctOption) {
    return {
      pass: false,
      rgExplain: 'The mission data is out of sync with the review. No XP awarded.',
    }
  }
  if (answerKey === correctOption.key) return { pass: true, correctValue: expected }
  return { pass: false, rgExplain: step.rgExplain ?? 'Check the licence line on the review — the issuing authority is stated there.' }
}

export type CasinoBonusSnapshot = {
  wageringMultiplier?: number | null
  wageringAppliesTo?: string | null
}

/**
 * Casino filter match: the answer is whether the LIVE bonus doc satisfies the
 * step's filter. The correct key (passKey vs failKey) is computed, never
 * stored. Fails closed when the bonus is missing or the filter is empty.
 */
export const validateCasinoFilterMatch = (
  step: CasinoFilterMatchStep,
  bonus: CasinoBonusSnapshot | null | undefined,
  answerKey: string,
): StepResult => {
  const { filter } = step
  const criteria = Object.keys(filter ?? {})
  if (!bonus || typeof bonus.wageringMultiplier !== 'number' || criteria.length === 0) {
    return {
      pass: false,
      rgExplain: 'The bonus data is out of reach. No XP awarded — the mission stays honest.',
    }
  }

  let pass = true
  if (typeof filter.wageringLte === 'number') {
    pass = pass && bonus.wageringMultiplier <= filter.wageringLte
  }

  const correctKey = pass ? step.passKey : step.failKey
  if (answerKey === correctKey) return { pass: true, correctValue: pass ? 'pass' : 'fail' }
  return { pass: false, rgExplain: step.rgExplain ?? 'Recheck the multiplier against the filter — the terms page has the number.' }
}
