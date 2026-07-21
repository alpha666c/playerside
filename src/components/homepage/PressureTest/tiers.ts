/**
 * The Pressure Test's simulated commission offers — escalating tiers of the
 * exact "pay more, rank higher" approach the industry is accused of
 * (competitive-landscape.md §2). All figures are fictional and labelled as a
 * simulation in the UI; none reference a real operator or deal. Each tier adds
 * one offer on top of the previous tier's.
 */
export type PressureTier = {
  /** Slider stop label, e.g. "Featured placement". */
  label: string
  /** The mono ledger line for the offer this tier introduces. */
  offer: string
}

export const PRESSURE_TIERS: PressureTier[] = [
  { label: 'No pressure', offer: '' },
  { label: 'Standard deal', offer: 'REV SHARE 25% — standard listing terms' },
  { label: 'Featured placement', offer: 'REV SHARE 35% + CPA €250 — "featured placement"' },
  { label: 'Top-3 demand', offer: 'REV SHARE 45% + CPA €400 — "guarantee us top 3"' },
  { label: 'Name your number', offer: 'REV SHARE 60% + exclusivity — "name your number"' },
]

/** What the graders see the whole time. Constant on purpose — that is the argument. */
export const SEALED_SCORE = '8.2'
