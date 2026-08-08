import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import { meFlow, startQuestFlow, submitStepFlow, missionsFlow } from '@/gamification/flows'

let payload: Payload
const playerKey = 'test-scout-0001'

/**
 * vex-ledger required tests before merge (against the real local DB):
 * - Bonus Heist fails on a wrong WR answer (0 XP)
 * - wagering_math is computed from the LIVE bonus doc
 * - Double submit same evidenceId grants XP once
 * - Direct REST write to gamification-profiles/xp-events is denied (no tamper)
 */
describe('Vex Missions flows', () => {
  const cleanup = async () => {
    await payload.delete({ collection: 'gamification-profiles', where: { playerKey: { equals: playerKey } }, overrideAccess: true })
    await payload.delete({ collection: 'user-quests', where: { playerKey: { equals: playerKey } }, overrideAccess: true })
    await payload.delete({ collection: 'xp-events', where: { playerKey: { equals: playerKey } }, overrideAccess: true })
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Hermetic: wipe any state a previous partial run may have left behind.
    await cleanup()
  })

  afterAll(async () => {
    await cleanup()
  })

  const questId = async () => {
    const q = await payload.find({ collection: 'quests', limit: 1, overrideAccess: true, where: { missionId: { equals: 'bonus_hunter' } } })
    expect(q.docs[0]).toBeDefined()
    return q.docs[0].id
  }

  it('me: lazy-creates a profile and offers the mission without leaking answers', async () => {
    const data = await meFlow(payload, playerKey, '/casinos/aurora-bay-casino')
    expect(data.profile.totalXp).toBe(0)
    expect(data.profile.level).toBe(1)
    expect(data.profile.rankTitle).toBe('Street Scout')
    expect(data.offers.some((q) => q.missionId === 'bonus_hunter')).toBe(true)
    expect(JSON.stringify(data.offers)).not.toContain('correctKey')
    expect(JSON.stringify(data.offers)).not.toContain('bonusSlug')
  })

  it('start: starts idempotently', async () => {
    const id = await questId()
    const first = await startQuestFlow(payload, playerKey, id)
    expect(first.userQuest.stepIndex).toBe(0)
    const second = await startQuestFlow(payload, playerKey, id)
    expect(second.userQuest.id).toBe(first.userQuest.id)
  })

  it('submit: wrong quiz answer grants 0 XP and teaches', async () => {
    const id = await questId()
    const res = await submitStepFlow(payload, { player: playerKey, questId: id, stepIndex: 0, answerKey: 'a', evidenceId: 'ev-wrong-0001' })
    expect(res.stepResult.pass).toBe(false)
    expect(res.profile.totalXp).toBe(0)
  })

  it('submit: full correct run mints XP exactly once (idempotent evidenceId)', async () => {
    const id = await questId()

    const s1 = await submitStepFlow(payload, { player: playerKey, questId: id, stepIndex: 0, answerKey: 'b', evidenceId: 'ev-s1' })
    expect(s1.stepResult.pass).toBe(true)
    expect(s1.profile.totalXp).toBe(0) // no XP until completion

    // Step 2 is wagering_math — server computes 35 × (200+200) = €14,000 → 'b'.
    const s2 = await submitStepFlow(payload, { player: playerKey, questId: id, stepIndex: 1, answerKey: 'b', evidenceId: 'ev-s2' })
    if (!s2.stepResult.pass) throw new Error('expected pass')
    if (!('correctValue' in s2.stepResult)) throw new Error('expected correctValue')
    expect(s2.stepResult.correctValue).toBe(14000)

    const s3 = await submitStepFlow(payload, { player: playerKey, questId: id, stepIndex: 2, answerKey: 'c', evidenceId: 'ev-s3' })
    expect(s3.missionComplete).toBe(true)
    const totalAfter = s3.profile.totalXp
    expect(totalAfter).toBeGreaterThan(0)

    // Replay the same evidenceId: idempotent, no double mint.
    const replay = await submitStepFlow(payload, { player: playerKey, questId: id, stepIndex: 2, answerKey: 'c', evidenceId: 'ev-s3' })
    expect(replay.idempotent).toBe(true)
    expect(replay.profile.totalXp).toBe(totalAfter)

    // Ledger is append-only and exactly one XP event exists.
    const events = await payload.find({ collection: 'xp-events', limit: 10, overrideAccess: true, where: { playerKey: { equals: playerKey } } })
    expect(events.docs.length).toBe(1)
  })

  it('submit: wagering_math fails closed when the bonus doc is missing', async () => {
    const id = await questId()
    const q = await payload.findByID({ collection: 'quests', id, overrideAccess: true })
    const steps = (q.steps as any[]) ?? []
    const badStep = { ...steps[1], bonusSlug: 'does-not-exist' }
    await payload.update({ collection: 'quests', id, overrideAccess: true, data: { steps: [steps[0], badStep, steps[2]] } })
    // Fresh player for a clean run; advance past step 0 first (anti-cheat
    // requires answering the current step in order).
    const other = 'test-scout-0002'
    await startQuestFlow(payload, other, id)
    await submitStepFlow(payload, { player: other, questId: id, stepIndex: 0, answerKey: 'b', evidenceId: 'evidence-fc-0001' })
    await expect(
      submitStepFlow(payload, { player: other, questId: id, stepIndex: 1, answerKey: 'b', evidenceId: 'evidence-fc-0002' }),
    ).rejects.toThrow('bonus data unavailable')
    await payload.delete({ collection: 'gamification-profiles', where: { playerKey: { equals: other } }, overrideAccess: true })
    await payload.delete({ collection: 'user-quests', where: { playerKey: { equals: other } }, overrideAccess: true })
    await payload.update({ collection: 'quests', id, overrideAccess: true, data: { steps } })
  })

  it('submit: skip-ahead exploit is rejected (cannot answer the final step first)', async () => {
    const id = await questId()
    const other = 'test-scout-0003'
    await startQuestFlow(payload, other, id)
    // Jump straight to the final step with the correct answer — must NOT mint.
    const exploit = await submitStepFlow(payload, {
      player: other, questId: id, stepIndex: 2, answerKey: 'c', evidenceId: 'evidence-skip-0001',
    })
    expect(exploit.stepResult.pass).toBe(false)
    expect(exploit.profile.totalXp).toBe(0)
    expect(exploit.questState.stepIndex).toBe(0)
    await payload.delete({ collection: 'gamification-profiles', where: { playerKey: { equals: other } }, overrideAccess: true })
    await payload.delete({ collection: 'user-quests', where: { playerKey: { equals: other } }, overrideAccess: true })
  })

  it('containment: direct writes without service role are denied', async () => {
    // Local API enforces access only when overrideAccess is explicitly false
    // (default is true, i.e. bypass). Clients hit the REST/HTTP layer, which
    // always evaluates access — so a tamper attempt must be refused there.
    await expect(
      payload.create({
        collection: 'gamification-profiles',
        data: { playerKey, totalXp: 999999 } as any,
        overrideAccess: false,
        draft: false,
      } as any),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'xp-events',
        data: { playerKey, amount: 9999, reason: 'mission_completed' } as any,
        overrideAccess: false,
        draft: false,
      } as any),
    ).rejects.toThrow()
  })

  it('containment: anonymous REST read of quests is denied — no answer-key leak (M1 regression)', async () => {
    // overrideAccess: false mirrors the anonymous REST surface (/api/quests),
    // which always evaluates collection access. read: authenticated must deny
    // public reads of the raw `steps` JSON (correctKey / bonusSlug / rgExplain).
    // read: authenticated must deny the anonymous read — the local API throws
    // the same error the REST surface returns as 403.
    await expect(
      payload.find({
        collection: 'quests',
        limit: 10,
        overrideAccess: false,
        draft: false,
      } as any),
    ).rejects.toThrow('You are not allowed to perform this action.')

    // The sanitized custom surface still serves published missions — with no
    // answer-bearing fields anywhere (sanitizeQuestForClient).
    const scout = 'm1-regression-scout'
    const missions = await missionsFlow(payload, scout)
    expect(missions.missions.length).toBeGreaterThan(0)
    for (const m of missions.missions) {
      for (const s of m.quest.steps) {
        expect(s).not.toHaveProperty('correctKey')
        expect(s).not.toHaveProperty('bonusSlug')
        expect(s).not.toHaveProperty('rgExplain')
        expect(s).not.toHaveProperty('hint')
      }
    }
    await payload.delete({
      collection: 'gamification-profiles',
      where: { playerKey: { equals: scout } },
      overrideAccess: true,
    })
  })

  it('missions board: full roster with per-player status, never leaking answers', async () => {
    const board = 'test-board-0001'
    const id = await questId()

    // Fresh scout: mission not started, zero badges earned.
    const fresh = await missionsFlow(payload, board)
    const freshEntry = fresh.missions.find((m) => m.quest.id === id)
    expect(freshEntry).toBeDefined()
    expect(freshEntry?.status).toBe('not_started')
    expect(fresh.badges.every((b) => !b.earned)).toBe(true)
    expect(JSON.stringify(fresh.missions)).not.toContain('correctKey')
    expect(JSON.stringify(fresh.missions)).not.toContain('bonusSlug')
    expect(JSON.stringify(fresh.missions)).not.toContain('rgExplain')
    expect(JSON.stringify(fresh.missions)).not.toContain('hint')

    // After starting: in progress, step 0 of 3.
    await startQuestFlow(payload, board, id)
    const started = await missionsFlow(payload, board)
    const startedEntry = started.missions.find((m) => m.quest.id === id)
    expect(startedEntry?.status).toBe('in_progress')
    expect(startedEntry?.stepIndex).toBe(0)
    expect(startedEntry?.totalSteps).toBe(3)

    // After a full correct run: completed, step progress at end, first badge earned.
    await submitStepFlow(payload, { player: board, questId: id, stepIndex: 0, answerKey: 'b', evidenceId: 'evidence-b1' })
    await submitStepFlow(payload, { player: board, questId: id, stepIndex: 1, answerKey: 'b', evidenceId: 'evidence-b2' })
    await submitStepFlow(payload, { player: board, questId: id, stepIndex: 2, answerKey: 'c', evidenceId: 'evidence-b3' })

    const done = await missionsFlow(payload, board)
    const doneEntry = done.missions.find((m) => m.quest.id === id)
    expect(doneEntry?.status).toBe('completed')
    expect(doneEntry?.stepIndex).toBe(3)
    expect(done.badges.find((b) => b.id === 'first_blood')?.earned).toBe(true)

    await payload.delete({ collection: 'gamification-profiles', where: { playerKey: { equals: board } }, overrideAccess: true })
    await payload.delete({ collection: 'user-quests', where: { playerKey: { equals: board } }, overrideAccess: true })
    await payload.delete({ collection: 'xp-events', where: { playerKey: { equals: board } }, overrideAccess: true })
  })
})

/**
 * Phase 4 — onboarding path (F4.1), Control Streaks + Focus Freezes (F4.2),
 * and the new step kinds (F4.4). Requires the seeded missions
 * (scripts/seed-gamification.ts).
 */
describe('Phase 4: onboarding, streaks, new step kinds', () => {
  const purge = async (player: string) => {
    await payload.delete({ collection: 'gamification-profiles', where: { playerKey: { equals: player } }, overrideAccess: true })
    await payload.delete({ collection: 'user-quests', where: { playerKey: { equals: player } }, overrideAccess: true })
    await payload.delete({ collection: 'xp-events', where: { playerKey: { equals: player } }, overrideAccess: true })
  }

  const questIdFor = async (missionId: string) => {
    const q = await payload.find({ collection: 'quests', limit: 1, overrideAccess: true, where: { missionId: { equals: missionId } } })
    if (!q.docs[0]) throw new Error(`mission ${missionId} not seeded`)
    return q.docs[0].id
  }

  const complete = async (player: string, missionId: string, answers: string[]) => {
    const id = await questIdFor(missionId)
    await startQuestFlow(payload, player, id)
    for (let i = 0; i < answers.length; i++) {
      const res = await submitStepFlow(payload, {
        player,
        questId: id,
        stepIndex: i,
        answerKey: answers[i],
        evidenceId: `ev-p4-${missionId}-${i}-${player}`,
      })
      if (!res.stepResult.pass) throw new Error(`step ${i} of ${missionId} failed`)
    }
    return id
  }

  it('F4.1: a fresh scout gets Paper Trail surfaced as onboarding on any path', async () => {
    const scout = 'p4-onboard-scout'
    await purge(scout)
    // Homepage path — pageTarget filter would exclude a casino-review mission
    // from `offers`, so onboarding must be path-independent.
    const data = await meFlow(payload, scout, '/')
    expect(data.profile.completedMissions).toBe(0)
    expect(data.onboarding?.mission.missionId).toBe('license_hawk')
    expect(JSON.stringify(data.onboarding)).not.toContain('correctKey')
    expect(JSON.stringify(data.onboarding)).not.toContain('reviewSlug')
    await purge(scout)
  })

  it('F4.2: completing a mission starts the recon streak and clears onboarding', async () => {
    const scout = 'p4-streak-scout'
    await purge(scout)
    const fresh = await meFlow(payload, scout, '/')
    expect(fresh.streak.current).toBe(0)

    // Paper Trail: quiz (a) then license_field_match (a = KSA).
    await complete(scout, 'license_hawk', ['a', 'a'])

    const after = await meFlow(payload, scout, '/')
    expect(after.profile.completedMissions).toBe(1)
    expect(after.streak.current).toBe(1)
    expect(after.streak.longest).toBe(1)
    expect(after.onboarding).toBeNull() // onboarding is only for zero-completion scouts
    await purge(scout)
  })

  it('F4.2: completing Tilt Protocol grants exactly one Focus Freeze', async () => {
    const scout = 'p4-freeze-scout'
    await purge(scout)
    // risk_quiz steps are both RG quizzes: (c) then (b).
    await complete(scout, 'risk_quiz', ['c', 'b'])
    const data = await meFlow(payload, scout, '/')
    expect(data.streak.freezesAvailable).toBe(1)
    expect(data.streak.current).toBe(1) // the completion day is an active day
    await purge(scout)
  })

  it('F4.4: Glass Cannon (casino_filter_match) is playable end-to-end', async () => {
    const scout = 'p4-glass-scout'
    await purge(scout)
    // quiz (b = long-run average) then filter: 35x vs <=30x -> fails -> (b).
    const res = await complete(scout, 'rtp_detective', ['b', 'b'])
    expect(res).toBeDefined()
    const board = await missionsFlow(payload, scout)
    const entry = board.missions.find((m) => m.quest.missionId === 'rtp_detective')
    expect(entry?.status).toBe('completed')
    await purge(scout)
  })

  it('F4.4: license_field_match fails closed when the review doc is missing', async () => {
    const scout = 'p4-license-fc-scout'
    await purge(scout)
    const id = await questIdFor('license_hawk')
    const q = await payload.findByID({ collection: 'quests', id, overrideAccess: true })
    const steps = (q.steps as any[]) ?? []
    const badStep = { ...steps[1], reviewSlug: 'does-not-exist' }
    await payload.update({ collection: 'quests', id, overrideAccess: true, data: { steps: [steps[0], badStep] } })
    await startQuestFlow(payload, scout, id)
    await submitStepFlow(payload, { player: scout, questId: id, stepIndex: 0, answerKey: 'a', evidenceId: 'ev-lf-1' })
    await expect(
      submitStepFlow(payload, { player: scout, questId: id, stepIndex: 1, answerKey: 'a', evidenceId: 'ev-lf-2' }),
    ).rejects.toThrow('review data unavailable')
    await payload.update({ collection: 'quests', id, overrideAccess: true, data: { steps } })
    await purge(scout)
  })

  it('F4.4: new step kinds leak no answer-bearing fields in sanitized output', async () => {
    const scout = 'p4-sanitize-scout'
    await purge(scout)
    const board = await missionsFlow(payload, scout)
    for (const m of board.missions) {
      for (const s of m.quest.steps) {
        expect(Object.keys(s).sort()).toEqual(['kind', 'options', 'prompt'])
      }
    }
    // Field-name leak check on the payload (the word "filter" legitimately
    // appears in player-facing copy, so only answer-bearing FIELD names count).
    const blob = JSON.stringify(board.missions)
    for (const leak of ['correctKey', 'bonusSlug', 'reviewSlug', 'expectedField', 'passKey', 'failKey', 'rgExplain', 'hint']) {
      expect(blob).not.toContain(leak)
    }
    await purge(scout)
  })
})
