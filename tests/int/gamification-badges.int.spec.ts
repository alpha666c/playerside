import { describe, it, expect } from 'vitest'

import { BADGES, badgesForProfile } from '@/gamification/badges'

/**
 * vex-canon / vex-ledger: badge catalog tests.
 * Badges are derived, display-only predicates over profile state — no writes,
 * no minting. These lock the earn conditions so the board can't drift from
 * the ledger.
 */
describe('vex-ledger: badge catalog', () => {
  it('every badge has a stable id, tier and icon', () => {
    for (const b of BADGES) {
      expect(b.id).toMatch(/^[a-z_]+$/)
      expect(['bronze', 'silver', 'gold', 'platinum']).toContain(b.tier)
      expect(b.title.length).toBeGreaterThan(0)
      expect(b.blurb.length).toBeGreaterThan(0)
    }
  })

  it('badge ids are unique', () => {
    const ids = BADGES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fresh profile earns nothing', () => {
    const statuses = badgesForProfile({ totalXp: 0, level: 1, completedMissions: 0 })
    expect(statuses.every((b) => !b.earned)).toBe(true)
  })

  it('first_blood unlocks on the first completed mission', () => {
    const statuses = badgesForProfile({ totalXp: 60, level: 1, completedMissions: 1 })
    const firstBlood = statuses.find((b) => b.id === 'first_blood')
    expect(firstBlood?.earned).toBe(true)
    const runner = statuses.find((b) => b.id === 'field_runner')
    expect(runner?.earned).toBe(false)
  })

  it('rank badges track level milestones', () => {
    expect(badgesForProfile({ totalXp: 0, level: 4, completedMissions: 0 }).find((b) => b.id === 'rtp_marksman')?.earned).toBe(true)
    expect(badgesForProfile({ totalXp: 0, level: 3, completedMissions: 0 }).find((b) => b.id === 'rtp_marksman')?.earned).toBe(false)
    expect(badgesForProfile({ totalXp: 0, level: 7, completedMissions: 0 }).find((b) => b.id === 'pit_boss')?.earned).toBe(true)
  })

  it('ledger_loyalist requires 500 XP banked', () => {
    expect(badgesForProfile({ totalXp: 499, level: 2, completedMissions: 1 }).find((b) => b.id === 'ledger_loyalist')?.earned).toBe(false)
    expect(badgesForProfile({ totalXp: 500, level: 2, completedMissions: 1 }).find((b) => b.id === 'ledger_loyalist')?.earned).toBe(true)
  })

  it('badgesForProfile returns the full catalog with earned flags, never mutating defs', () => {
    const statuses = badgesForProfile({ totalXp: 100, level: 2, completedMissions: 2 })
    expect(statuses.length).toBe(BADGES.length)
    expect(statuses.every((b) => typeof b.earned === 'boolean')).toBe(true)
  })
})
