import { describe, it, expect } from 'vitest'

import {
  rateLimited,
  profileCreationAllowed,
  PROFILE_CREATIONS_PER_IP_PER_DAY,
} from '@/gamification/rateLimit'

/**
 * vex-containment: FIX-03 (rate limiter) + FIX-04 (per-IP profile creation
 * cap) — audit 2026-08-07. Pure in-memory logic, no DB required.
 */
describe('vex-containment: rate limiter (FIX-03)', () => {
  it('allows a burst under the write limit, then denies beyond it', () => {
    const key = 'test-ip|test-player-w'
    for (let i = 0; i < 10; i++) {
      expect(rateLimited(key, 'write')).toBe(false)
    }
    expect(rateLimited(key, 'write')).toBe(true)
  })

  it('read tier has a higher ceiling', () => {
    const key = 'test-ip|test-player-r'
    for (let i = 0; i < 30; i++) {
      expect(rateLimited(key, 'read')).toBe(false)
    }
    expect(rateLimited(key, 'read')).toBe(true)
  })

  it('different keys are independent buckets', () => {
    const a = 'ip-a|p'
    const b = 'ip-b|p'
    for (let i = 0; i < 12; i++) rateLimited(a, 'write')
    expect(rateLimited(a, 'write')).toBe(true)
    expect(rateLimited(b, 'write')).toBe(false)
  })
})

describe('vex-containment: per-IP profile creation cap (FIX-04)', () => {
  it('allows up to the cap per day, then denies', () => {
    for (let i = 0; i < PROFILE_CREATIONS_PER_IP_PER_DAY; i++) {
      expect(profileCreationAllowed('cap-test-ip')).toBe(true)
    }
    expect(profileCreationAllowed('cap-test-ip')).toBe(false)
  })
})
