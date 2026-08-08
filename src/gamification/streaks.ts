/**
 * vex-ledger: Control Streaks + Focus Freezes (Phase 4, F4.2).
 *
 * DESIGN DECISION (DECISION-LOG 2026-08-08): streak state is FULLY DERIVED
 * from the existing append-only ledger — a streak day is a calendar day with
 * a completed mission (an xp-event with reason mission_completed), and a
 * Focus Freeze is granted by completing a freeze-grant mission (risk_quiz /
 * Tilt Protocol). There is no `streak_day` event and no new table or enum
 * value: the plan's "xp-events reason streak_day" was unnecessary for
 * correctness, and deriving avoids a Postgres migration (push is disabled in
 * this repo; enum additions are schema changes). This mirrors the badge
 * pattern: the ledger is the source of truth, the UI is a mirror.
 *
 * Freeze semantics: a freeze protects exactly ONE missed calendar day. Grants
 * are consumed in chronological order and only protect days on/after the
 * grant day. Streaks celebrate consistency ("recon streak"), never punish —
 * a streak only breaks after a FULL missed day with no freeze available.
 */

/** Canon mission ids whose completion grants one Focus Freeze (risk_quiz = Tilt Protocol). */
export const FREEZE_GRANT_MISSION_IDS = ['risk_quiz'] as const

export type StreakState = {
  /** Consecutive days (active or freeze-protected) ending today or yesterday. */
  current: number
  /** Longest run ever observed (freeze-protected days count toward it). */
  longest: number
  /** Unused Focus Freeze tokens. */
  freezesAvailable: number
  /** Missed days protected by a freeze so far. */
  protectedDays: number
  /** Last calendar day with a completed mission (UTC), or null. */
  lastActiveDay: string | null
}

/** UTC calendar day (yyyy-mm-dd) for a date. */
export const utcDay = (d: Date): string => d.toISOString().slice(0, 10)

const DAY_MS = 24 * 60 * 60 * 1000

/** yyyy-mm-dd of the previous calendar day (UTC). */
export const previousUtcDay = (day: string): string =>
  utcDay(new Date(Date.parse(`${day}T00:00:00.000Z`) - DAY_MS))

/** yyyy-mm-dd of the next calendar day (UTC). */
export const nextUtcDay = (day: string): string =>
  utcDay(new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS))

/** All distinct, sorted, non-empty UTC days from a raw list (robust to nulls). */
const sortedDays = (raw: Array<string | null | undefined>): string[] =>
  [...new Set(raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()

/**
 * Sorted UTC grant days WITHOUT dedupe — a freeze is a TOKEN, and two grants
 * on the same day are two tokens (e.g. two freeze-grant missions completed in
 * one day). Activity is day-granular; grants are count-granular.
 */
const sortedGrantDays = (raw: Array<string | null | undefined>): string[] =>
  raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()

/**
 * Derives streak state from ledger-derived day lists. Pure and deterministic;
 * `today` is injectable for tests.
 *
 * The walk covers every FULL day from the first activity/freeze day through
 * YESTERDAY (a day only "breaks" once it is fully missed). Today counts only
 * if it already has activity — an idle today never breaks the streak.
 */
export const deriveStreakState = (input: {
  /** UTC days with a completed mission (ledger activity). */
  activityDays: Array<string | null | undefined>
  /** UTC days a Focus Freeze was earned (freeze-grant mission completions). */
  freezeGrantDays?: Array<string | null | undefined>
  /** Injectable for tests; defaults to the real UTC today. */
  today?: string
}): StreakState => {
  const today = input.today ?? utcDay(new Date())
  const activities = new Set(sortedDays(input.activityDays))
  const freezes = sortedGrantDays(input.freezeGrantDays ?? [])

  const allDays = new Set([...activities, ...freezes])
  if (allDays.size === 0) {
    return { current: 0, longest: 0, freezesAvailable: freezes.length, protectedDays: 0, lastActiveDay: null }
  }

  // allDays is non-empty here (early return above) — `?? today` only satisfies
  // noUncheckedIndexedAccess.
  let cursor = [...allDays].sort()[0] ?? today
  const yesterday = previousUtcDay(today)

  let current = 0
  let longest = 0
  let freezesUsed = 0

  // Full days only — today is handled separately below.
  while (cursor <= yesterday) {
    if (activities.has(cursor)) {
      current += 1
      if (current > longest) longest = current
    } else {
      const grant = freezes[freezesUsed]
      if (grant !== undefined && grant <= cursor) {
        // Earliest unused grant protects exactly this one missed day.
        freezesUsed += 1
        current += 1
        if (current > longest) longest = current
      } else {
        current = 0
      }
    }
    cursor = nextUtcDay(cursor)
  }

  // Today: activity today continues/restarts the run; idle today never breaks it.
  if (activities.has(today)) {
    current += 1
    if (current > longest) longest = current
  }

  const active = sortedDays(input.activityDays)
  return {
    current,
    longest,
    freezesAvailable: Math.max(0, freezes.length - freezesUsed),
    protectedDays: freezesUsed,
    lastActiveDay: active.length > 0 ? active[active.length - 1] : null,
  }
}

/** Converts an ISO timestamp to a UTC day (null-safe for ledger rows). */
export const dayFromIso = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return utcDay(new Date(t))
}
