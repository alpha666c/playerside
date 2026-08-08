import { describe, it, expect } from 'vitest'

import {
  deriveStreakState,
  FREEZE_GRANT_MISSION_IDS,
  nextUtcDay,
  previousUtcDay,
  utcDay,
} from '@/gamification/streaks'

/**
 * Phase 4 (F4.2) — Control Streaks + Focus Freezes, pure ledger derivation.
 *
 * Required vex-ledger test before merge: "a streak freeze grants exactly one
 * protected day" — one grant covers one missed day; a second consecutive
 * missed day breaks the streak.
 */
describe('vex-ledger: recon streak derivation (F4.2)', () => {
  it('fresh scout has no streak and no freezes', () => {
    const s = deriveStreakState({ activityDays: [], freezeGrantDays: [], today: '2026-08-08' })
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.freezesAvailable).toBe(0)
    expect(s.protectedDays).toBe(0)
    expect(s.lastActiveDay).toBeNull()
  })

  it('three consecutive active days ending today => current 3, longest 3', () => {
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-06', '2026-08-07'],
      today: '2026-08-08', // today idle — day not over, streak survives
    })
    expect(s.current).toBe(3)
    expect(s.longest).toBe(3)
    expect(s.lastActiveDay).toBe('2026-08-07')
  })

  it('a full missed day with no freeze breaks the streak', () => {
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-06', '2026-08-08'],
      today: '2026-08-08',
    })
    // 08-07 was fully missed with no freeze -> broken; 08-08 restarts at 1.
    expect(s.current).toBe(1)
    expect(s.longest).toBe(2)
  })

  it('a freeze grants exactly one protected day (required test)', () => {
    // Active 08-05, missed 08-06, active 08-07, today 08-08 idle.
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-07'],
      freezeGrantDays: ['2026-08-05'], // earned before the missed day
      today: '2026-08-08',
    })
    expect(s.current).toBe(3) // 08-05 + 08-06 protected + 08-07
    expect(s.longest).toBe(3)
    expect(s.protectedDays).toBe(1)
    expect(s.freezesAvailable).toBe(0) // the single grant is spent
  })

  it('one freeze cannot protect two consecutive missed days', () => {
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-08'],
      freezeGrantDays: ['2026-08-05'],
      today: '2026-08-08',
    })
    // 08-06 protected (freeze spent); 08-07 unprotected -> broken; 08-08 restarts.
    expect(s.current).toBe(1)
    expect(s.protectedDays).toBe(1)
    expect(s.longest).toBe(2)
  })

  it('two freezes protect two consecutive missed days', () => {
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-08'],
      freezeGrantDays: ['2026-08-05', '2026-08-05'],
      today: '2026-08-08',
    })
    // 08-05 active (1) + 08-06 protected (2) + 08-07 protected (3) + 08-08 active (4)
    expect(s.current).toBe(4)
    expect(s.protectedDays).toBe(2)
    expect(s.freezesAvailable).toBe(0)
    expect(s.longest).toBe(4)
  })

  it('a freeze earned after a missed day cannot retroactively protect it', () => {
    const s = deriveStreakState({
      activityDays: ['2026-08-05', '2026-08-07'],
      freezeGrantDays: ['2026-08-07'], // earned on the SECOND active day
      today: '2026-08-08',
    })
    // 08-06 was already broken before the grant existed; 08-07 restarts.
    expect(s.current).toBe(1)
    expect(s.protectedDays).toBe(0)
    expect(s.freezesAvailable).toBe(1) // unspent
    expect(s.longest).toBe(1)
  })

  it('longest is tracked across breaks', () => {
    const s = deriveStreakState({
      activityDays: [
        '2026-08-01', '2026-08-02', '2026-08-03', // run of 3
        '2026-08-05', '2026-08-06', // gap on 08-04, new run of 2
      ],
      today: '2026-08-06',
    })
    expect(s.current).toBe(2)
    expect(s.longest).toBe(3)
  })

  it('streak walks calendar month boundaries correctly', () => {
    const s = deriveStreakState({
      activityDays: ['2026-01-31', '2026-02-01', '2026-02-02'],
      today: '2026-02-02',
    })
    expect(s.current).toBe(3)
  })

  it('activity today extends/restarts the streak', () => {
    const idleToday = deriveStreakState({ activityDays: ['2026-08-06', '2026-08-07'], today: '2026-08-08' })
    expect(idleToday.current).toBe(2)
    const activeToday = deriveStreakState({ activityDays: ['2026-08-06', '2026-08-07', '2026-08-08'], today: '2026-08-08' })
    expect(activeToday.current).toBe(3)
  })

  it('day helpers round-trip across month boundaries', () => {
    expect(previousUtcDay('2026-03-01')).toBe('2026-02-28')
    expect(nextUtcDay('2026-12-31')).toBe('2027-01-01')
    expect(utcDay(new Date('2026-08-08T12:00:00.000Z'))).toBe('2026-08-08')
  })

  it('freeze-grant set is the canon Tilt Protocol mission', () => {
    expect([...FREEZE_GRANT_MISSION_IDS]).toEqual(['risk_quiz'])
  })
})
