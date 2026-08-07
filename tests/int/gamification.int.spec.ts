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
