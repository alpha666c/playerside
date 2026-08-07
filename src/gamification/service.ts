import type { Payload } from 'payload'

import { levelFromXp, rankTitleForLevel } from './curve'

/** Server-enforced daily XP cap per player (vex-containment: economy abuse). */
export const DAILY_XP_CAP =
  Number(process.env.GAMIFICATION_DAILY_XP_CAP) || 200

export const isValidPlayerKey = (key: unknown): key is string =>
  typeof key === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(key)

type ProfileLike = {
  id: number | string
  playerKey: string
  totalXp: number
  level: number
  rankTitle: string
  completedMissions: number
}

export type SanitizedStep = {
  kind: string
  prompt: string
  options: { key: string; label: string }[]
  hint?: string
  rgExplain?: string
}

/**
 * Strips every answer-bearing field from a quest before it leaves the
 * server: correctKey, bonusSlug (derivation source) and rgExplain (which for
 * wagering_math steps literally states the computed answer). The client sees
 * the mission and its options — never the answers. Hints are shown only via
 * the submit response's teaching beat, after an attempt.
 */
export const sanitizeQuestForClient = (quest: any) => ({
  id: quest.id,
  missionId: quest.missionId,
  title: quest.title,
  brief: quest.brief,
  rewardXp: quest.rewardXp,
  pageTarget: quest.pageTarget,
  steps: ((quest.steps ?? []) as any[]).map((s) => ({
    kind: s.kind,
    prompt: s.prompt,
    options: s.options ?? [],
  })),
})

/** Ensures a profile row exists for a playerKey; returns it either way. */
export const ensureProfile = async (
  payload: Payload,
  playerKey: string,
): Promise<ProfileLike> => {
  const existing = await payload.find({
    collection: 'gamification-profiles',
    limit: 1,
    overrideAccess: true,
    where: { playerKey: { equals: playerKey } },
  })
  if (existing.docs[0]) return existing.docs[0] as unknown as ProfileLike

  const created = await payload.create({
    collection: 'gamification-profiles',
    overrideAccess: true,
    data: {
      playerKey,
      totalXp: 0,
      level: 1,
      rankTitle: rankTitleForLevel(1),
      completedMissions: 0,
    },
  })
  return created as unknown as ProfileLike
}

/** Sum of XP minted for this player in the last 24h (from the append-only ledger). */
export const xpMintedToday = async (
  payload: Payload,
  playerKey: string,
): Promise<number> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const events = await payload.find({
    collection: 'xp-events',
    limit: 1000,
    overrideAccess: true,
    where: {
      and: [
        { playerKey: { equals: playerKey } },
        { createdAt: { greater_than_equal: since.toISOString() } },
      ],
    },
  })
  return (events.docs as any[]).reduce((sum, e) => sum + (e.amount ?? 0), 0)
}

/** Recompute level + rank from totalXp; persists via the caller's update. */
export const recomputeLevel = (totalXp: number) => ({
  level: levelFromXp(totalXp),
  rankTitle: rankTitleForLevel(levelFromXp(totalXp)),
})

export type PublicProfile = {
  playerKey: string
  totalXp: number
  level: number
  rankTitle: string
  completedMissions: number
}

export const toPublicProfile = (p: ProfileLike): PublicProfile => ({
  playerKey: p.playerKey,
  totalXp: p.totalXp,
  level: p.level,
  rankTitle: p.rankTitle,
  completedMissions: p.completedMissions,
})
