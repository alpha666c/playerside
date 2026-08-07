/**
 * vex-ledger: XP curve + level recompute (pure functions, no framework deps).
 *
 * xp_required(L) = floor(100 * L^1.5) — XP needed to go FROM level L TO level L+1.
 * Level = highest L such that cumulative XP to reach L is <= totalXp.
 * Rank titles are canon flavor only (vex-canon ladder) — the level→title mapping
 * lives here as the single source of truth.
 */

export const xpRequiredForLevel = (level: number): number => {
  if (!Number.isFinite(level) || level < 1) return 0
  return Math.floor(100 * Math.pow(level, 1.5))
}

/** Cumulative XP needed to REACH level L (i.e. sum of xp_required(1..L-1)). */
export const cumulativeXpForLevel = (level: number): number => {
  if (!Number.isFinite(level) || level <= 1) return 0
  let total = 0
  for (let l = 1; l < level; l++) total += xpRequiredForLevel(l)
  return total
}

/** Highest level a player with `totalXp` has reached (level 1 is the floor). */
export const levelFromXp = (totalXp: number): number => {
  const safe = Math.max(0, Math.floor(totalXp))
  let level = 1
  while (cumulativeXpForLevel(level + 1) <= safe) level++
  return level
}

/** XP progress within the current level: 0..1 (1 = exactly enough to level up). */
export const progressWithinLevel = (totalXp: number): number => {
  const level = levelFromXp(totalXp)
  const base = cumulativeXpForLevel(level)
  const need = xpRequiredForLevel(level)
  if (need <= 0) return 0
  return Math.min(1, Math.max(0, (totalXp - base) / need))
}

/** Canon rank ladder (flavor only — vex-canon). Index 0 = Street Scout. */
export const RANK_LADDER = [
  'Street Scout',
  'Odds Runner',
  'Bonus Cartographer',
  'RTP Marksman',
  'Table Analyst',
  'Black-Chip Strategist',
  'Pit Boss Emeritus',
] as const

export const rankTitleForLevel = (level: number): string => {
  const idx = Math.min(RANK_LADDER.length - 1, Math.max(0, level - 1))
  return RANK_LADDER[idx]
}
