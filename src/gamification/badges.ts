/**
 * vex-canon / vex-ledger: badge catalog.
 *
 * Badges are DERIVED from profile state — totalXp, level and completed
 * missions are the ledger's source of truth, and a badge is a pure predicate
 * over them. There is no badge table, no badge minting, no writes: the board
 * is computed server-side on read, so it can never drift from the ledger.
 *
 * Copy is canon-audited: celebrates reading the clause and process, never
 * deposit size, never "easy" anything.
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type BadgeProfile = {
  totalXp: number
  level: number
  completedMissions: number
}

export type BadgeDef = {
  id: string
  title: string
  blurb: string
  icon: string
  tier: BadgeTier
  earned: (p: BadgeProfile) => boolean
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    blurb: 'Complete your first mission — one clause read, one trap spotted.',
    icon: '🎯',
    tier: 'bronze',
    earned: (p) => p.completedMissions >= 1,
  },
  {
    id: 'field_runner',
    title: 'Field Runner',
    blurb: 'Complete 3 missions. The terms stop being a wall of text.',
    icon: '🥾',
    tier: 'bronze',
    earned: (p) => p.completedMissions >= 3,
  },
  {
    id: 'terms_cartographer',
    title: 'Terms Cartographer',
    blurb: 'Complete 5 missions — you now map wagering like terrain.',
    icon: '🗺️',
    tier: 'silver',
    earned: (p) => p.completedMissions >= 5,
  },
  {
    id: 'odds_runner',
    title: 'Odds Runner',
    blurb: 'Reach level 2. The multiplier reads like a native tongue.',
    icon: '🎲',
    tier: 'silver',
    earned: (p) => p.level >= 2,
  },
  {
    id: 'rtp_marksman',
    title: 'RTP Marksman',
    blurb: 'Reach level 4 — hit percentages, not slots.',
    icon: '🎯',
    tier: 'gold',
    earned: (p) => p.level >= 4,
  },
  {
    id: 'black_chip',
    title: 'Black-Chip Strategist',
    blurb: 'Reach level 6. Value under constraints is your whole game.',
    icon: '♠️',
    tier: 'gold',
    earned: (p) => p.level >= 6,
  },
  {
    id: 'pit_boss',
    title: 'Pit Boss Emeritus',
    blurb: 'Stand at the top of the ladder — the terms fear you now.',
    icon: '🏆',
    tier: 'platinum',
    earned: (p) => p.level >= 7,
  },
  {
    id: 'ledger_loyalist',
    title: 'Ledger Loyalist',
    blurb: 'Bank 500 XP. The append-only ledger knows your name.',
    icon: '📒',
    tier: 'platinum',
    earned: (p) => p.totalXp >= 500,
  },
]

export type BadgeStatus = Omit<BadgeDef, 'earned'> & { earned: boolean }

/** Computes earned/locked state for every badge from a profile snapshot. */
export const badgesForProfile = (profile: BadgeProfile): BadgeStatus[] =>
  BADGES.map(({ earned, ...def }) => ({ ...def, earned: earned(profile) }))
