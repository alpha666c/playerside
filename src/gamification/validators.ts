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

export type QuestStep = QuizStep | WageringMathStep

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
