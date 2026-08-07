/**
 * vex-surface: anonymous player identity.
 *
 * The site has no public auth (Users are admin-only), so every scout is
 * identified by a client-generated UUID in localStorage. This module is
 * client-safe (window/crypto guarded) and shared by every Vex hook so the
 * dock, the missions board and any future surface all speak the same identity.
 */

export const PLAYER_KEY_STORAGE = 'vex.playerKey'

/** Returns the stored player key, minting and persisting one if absent. */
export const getPlayerKey = (): string => {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(PLAYER_KEY_STORAGE)
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `scout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(PLAYER_KEY_STORAGE, fresh)
    return fresh
  } catch {
    return ''
  }
}
