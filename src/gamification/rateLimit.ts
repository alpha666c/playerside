/**
 * vex-containment: lightweight in-memory rate limiting + per-IP profile
 * creation cap for the anonymous /api/gamification/* endpoints
 * (FIX-03/FIX-04, audit 2026-08-07).
 *
 * The XP economy is already bounded by the daily XP cap and the idempotency
 * laws; this bounds the DB-load and row-creation abuse surface that the
 * unauthenticated endpoints expose.
 *
 * DEPLOYMENT CAVEAT: on Vercel this store lives per serverless instance, so
 * it dampens abuse rather than globally enforcing it. Combined with the daily
 * XP cap and the per-IP creation cap, worst-case impact stays bounded.
 */

const LIMITS = {
  read: { windowMs: 10_000, max: 30 },
  write: { windowMs: 10_000, max: 10 },
} as const

type Tier = keyof typeof LIMITS

const buckets = new Map<string, number[]>()

/** True when `key` has exceeded its tier window — the caller should 429. */
export const rateLimited = (key: string, tier: Tier): boolean => {
  const { windowMs, max } = LIMITS[tier]
  const now = Date.now()
  const live = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (live.length >= max) {
    buckets.set(key, live)
    return true
  }
  live.push(now)
  buckets.set(key, live)
  // Opportunistic prune so a sustained attack can't grow the map forever.
  if (buckets.size > 5_000) {
    for (const [k, times] of buckets) {
      const alive = times.filter((t) => now - t < windowMs)
      if (alive.length === 0) buckets.delete(k)
      else buckets.set(k, alive)
    }
  }
  return false
}

/** Best-effort client IP (reads the edge proxy hop chain). */
export const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

/** Sliding-window key: one bucket per IP+player pair. */
export const requestKey = (request: Request, player: string): string =>
  `${clientIp(request)}|${player}`

/** FIX-04: cap anonymous profile CREATIONS per IP per day. Rows are cheap to
 * spam; the cap bounds the blast radius. Only increments on an actual create
 * (checked by ensureProfile), so returning players with an existing profile
 * never consume it. */
const creations = new Map<string, { date: string; count: number }>()

export const PROFILE_CREATIONS_PER_IP_PER_DAY =
  Number(process.env.GAMIFICATION_PROFILES_PER_IP_DAY) || 25

export const profileCreationAllowed = (ip: string): boolean => {
  const today = new Date().toISOString().slice(0, 10)
  const cur = creations.get(ip)
  if (!cur || cur.date !== today) {
    creations.set(ip, { date: today, count: 1 })
    return true
  }
  if (cur.count >= PROFILE_CREATIONS_PER_IP_PER_DAY) return false
  cur.count += 1
  return true
}
