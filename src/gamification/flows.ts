import { commitTransaction, createLocalReq, killTransaction, type Payload } from 'payload'

import { badgesForProfile } from './badges'
import {
  DAILY_XP_CAP,
  ONBOARDING_MISSION_ID,
  ensureProfile,
  isValidPlayerKey,
  recomputeLevel,
  sanitizeQuestForClient,
  toPublicProfile,
  xpMintedToday,
} from './service'
import { dayFromIso, deriveStreakState, FREEZE_GRANT_MISSION_IDS, type StreakState } from './streaks'
import {
  validateCasinoFilterMatch,
  validateLicenseFieldMatch,
  validateQuizStep,
  validateWageringMathStep,
} from './validators'

/**
 * Phase 4 (F4.2): derives streak state from a player's completed user-quest
 * rows. A streak day = a calendar day with a completed mission; a Focus Freeze
 * grant = a completed freeze-grant mission (risk_quiz / Tilt Protocol).
 */
const streakFromCompleted = async (
  payload: Payload,
  completedDocs: any[],
): Promise<StreakState> => {
  const freezeQuests = await payload.find({
    collection: 'quests',
    limit: 10,
    overrideAccess: true,
    where: { missionId: { in: [...FREEZE_GRANT_MISSION_IDS] } },
  })
  const freezeQuestIds = new Set(freezeQuests.docs.map((d) => String(d.id)))

  return deriveStreakState({
    activityDays: completedDocs.map((d) => dayFromIso(d.completedAt ?? d.updatedAt)),
    freezeGrantDays: completedDocs
      .filter((d) => freezeQuestIds.has(String(d.quest?.id ?? d.quest)))
      .map((d) => dayFromIso(d.completedAt ?? d.updatedAt)),
  })
}

/**
 * vex-ledger: the flow layer. API routes are thin adapters over these pure-
 * payload functions so every security law is testable via the local API
 * (repo convention: tests/int/*.int.spec.ts use getPayload directly).
 */

export const meFlow = async (payload: Payload, player: string, path: string, ip?: string) => {
  const profile = await ensureProfile(payload, player, ip)

  const active = await payload.find({
    collection: 'user-quests',
    limit: 5,
    overrideAccess: true,
    where: { and: [{ playerKey: { equals: player } }, { status: { equals: 'active' } }] },
  })
  const activeQuestDoc = active.docs[0]
  let activeQuest = null
  if (activeQuestDoc) {
    const quest = await payload.findByID({
      collection: 'quests',
      id: (activeQuestDoc.quest as any).id ?? (activeQuestDoc.quest as number),
      overrideAccess: true,
    })
    if (quest) {
      activeQuest = {
        userQuestId: activeQuestDoc.id,
        stepIndex: activeQuestDoc.stepIndex,
        quest: sanitizeQuestForClient(quest),
      }
    }
  }

  const pageTarget =
    path.startsWith('/crypto-casinos') ? 'crypto-review' :
    path.startsWith('/casinos') ? 'casino-review' : 'homepage'

  const quests = await payload.find({
    collection: 'quests',
    limit: 50,
    overrideAccess: true,
    where: {
      and: [
        { enabled: { equals: true } },
        { pageTarget: { equals: pageTarget } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  const completed = await payload.find({
    collection: 'user-quests',
    limit: 100,
    overrideAccess: true,
    where: { and: [{ playerKey: { equals: player } }, { status: { equals: 'completed' } }] },
  })
  const completedQuestIds = new Set(completed.docs.map((d) => String((d.quest as any)?.id ?? d.quest)))

  // Phase 4 (F4.2): streak from the ledger (completed-mission days + freeze grants).
  const streak = await streakFromCompleted(payload, completed.docs as any[])

  // Phase 4 (F4.1): a fresh scout (0 completed missions) gets the onboarding
  // mission surfaced regardless of page target — Paper Trail (license_hawk).
  let onboarding = null
  if (profile.completedMissions === 0) {
    const pt = await payload.find({
      collection: 'quests',
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { missionId: { equals: ONBOARDING_MISSION_ID } },
          { enabled: { equals: true } },
          { _status: { equals: 'published' } },
        ],
      },
    })
    const paperTrail = pt.docs[0]
    if (paperTrail && !completedQuestIds.has(String(paperTrail.id))) {
      onboarding = { mission: sanitizeQuestForClient(paperTrail) }
    }
  }

  const offers = quests.docs
    .filter((q) => !completedQuestIds.has(String(q.id)))
    .map((q) => sanitizeQuestForClient(q))

  return { profile: toPublicProfile(profile), activeQuest, offers, streak, onboarding }
}

/**
 * vex-surface: the missions board payload for /missions.
 *
 * Returns every published+enabled mission (across ALL page targets — the
 * board is the full roster, not a per-page offer), each with the player's
 * per-mission state (not started / in progress with step progress / completed),
 * plus the derived badge board. Sanitization laws are identical to meFlow:
 * correctKey / bonusSlug / rgExplain never leave the server.
 */
export const missionsFlow = async (payload: Payload, player: string, ip?: string) => {
  const profile = await ensureProfile(payload, player, ip)

  const quests = await payload.find({
    collection: 'quests',
    limit: 100,
    overrideAccess: true,
    where: {
      and: [
        { enabled: { equals: true } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  // All rows for this player — statuses AND step progress come from here.
  const userQuests = await payload.find({
    collection: 'user-quests',
    limit: 200,
    overrideAccess: true,
    where: { playerKey: { equals: player } },
  })
  const stateByQuestId = new Map<number, { status: string; stepIndex: number }>()
  const completedDocs: any[] = []
  for (const uq of userQuests.docs as any[]) {
    const questId = Number(uq.quest?.id ?? uq.quest)
    stateByQuestId.set(questId, { status: uq.status, stepIndex: uq.stepIndex ?? 0 })
    if (uq.status === 'completed') completedDocs.push(uq)
  }

  const missions = (quests.docs as any[]).map((q) => {
    const state = stateByQuestId.get(Number(q.id))
    const totalSteps = Array.isArray(q.steps) ? q.steps.length : 0
    const status = state?.status === 'completed' ? 'completed' : state?.status === 'active' ? 'in_progress' : 'not_started'
    return {
      quest: sanitizeQuestForClient(q),
      status,
      stepIndex: state?.stepIndex ?? 0,
      totalSteps,
    }
  })

  // Phase 4 (F4.2): streak from the ledger, same derivation as meFlow.
  const streak = await streakFromCompleted(payload, completedDocs)

  return {
    profile: toPublicProfile(profile),
    badges: badgesForProfile(profile),
    missions,
    streak,
  }
}

export const startQuestFlow = async (
  payload: Payload,
  player: string,
  questId: number | string,
  ip?: string,
) => {
  const profile = await ensureProfile(payload, player, ip)

  const quest = await payload.findByID({ collection: 'quests', id: questId, overrideAccess: true })
  if (!quest || !quest.enabled || quest._status !== 'published') {
    throw new Error('quest unavailable')
  }

  const existing = await payload.find({
    collection: 'user-quests',
    limit: 1,
    overrideAccess: true,
    where: { and: [{ playerKey: { equals: player } }, { quest: { equals: Number(questId) } }] },
  })
  if (existing.docs[0]) {
    const doc = existing.docs[0]
    return {
      userQuest: { id: doc.id, stepIndex: doc.stepIndex, status: doc.status },
      quest: sanitizeQuestForClient(quest),
      profile: toPublicProfile(profile),
    }
  }

  const created = await payload.create({
    collection: 'user-quests',
    overrideAccess: true,
    data: { playerKey: player, quest: Number(questId), status: 'active', stepIndex: 0 },
  })

  return {
    userQuest: { id: created.id, stepIndex: 0, status: 'active' },
    quest: sanitizeQuestForClient(quest),
    profile: toPublicProfile(profile),
  }
}

export type SubmitStepInput = {
  player: string
  questId: number | string
  stepIndex: number
  answerKey: string
  evidenceId: string
  /** Optional client IP for the per-IP profile-creation cap (FIX-04). */
  ip?: string
}

export const submitStepFlow = async (payload: Payload, input: SubmitStepInput) => {
  const { player, questId, stepIndex, answerKey, evidenceId, ip } = input
  const profile = await ensureProfile(payload, player, ip)

  const quest = await payload.findByID({ collection: 'quests', id: questId, overrideAccess: true })
  if (!quest || !quest.enabled || quest._status !== 'published') {
    throw new Error('quest unavailable')
  }

  const userQuest = await payload.find({
    collection: 'user-quests',
    limit: 1,
    overrideAccess: true,
    where: { and: [{ playerKey: { equals: player } }, { quest: { equals: Number(questId) } }] },
  })
  const uq = userQuest.docs[0]
  if (!uq) throw new Error('quest not started')

  // Idempotency law: dedup FIRST — a replayed evidenceId must return the
  // stored outcome even on a completed quest, never re-mint and never 409.
  if (uq.lastEvidenceId === evidenceId) {
    return {
      idempotent: true,
      stepResult: { pass: false, rgExplain: 'Already submitted — no double XP.' },
      questState: { stepIndex: uq.stepIndex, status: uq.status },
      profile: toPublicProfile(profile),
    }
  }

  if (uq.status !== 'active') throw new Error('quest not started')

  const steps: any[] = Array.isArray(quest.steps) ? quest.steps : []

  // Anti-cheat: the client may only answer the CURRENT step. A skip-ahead
  // (submit final step directly) or a regression (re-answer an old step with
  // a fresh evidenceId) is rejected — never mints, never advances.
  if (stepIndex !== uq.stepIndex) {
    return {
      stepResult: {
        pass: false,
        rgExplain: 'You can only answer the step in front of you — no skipping ahead, Scout.',
      },
      questState: { stepIndex: uq.stepIndex, status: uq.status },
      profile: toPublicProfile(profile),
    }
  }

  const step = steps[stepIndex]
  if (!step) throw new Error('invalid step')

  let stepResult
  if (step.kind === 'quiz') {
    stepResult = validateQuizStep(step, String(answerKey ?? ''))
  } else if (step.kind === 'wagering_math') {
    const bonus = await payload.find({
      collection: 'wagering-bonuses',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: step.bonusSlug } },
    })
    const bonusDoc = bonus.docs[0]
    if (!bonusDoc) throw new Error('bonus data unavailable')
    stepResult = validateWageringMathStep(
      step,
      {
        wageringMultiplier: bonusDoc.wageringMultiplier,
        wageringAppliesTo: bonusDoc.wageringAppliesTo,
      },
      String(answerKey ?? ''),
    )
  } else if (step.kind === 'license_field_match') {
    // Phase 4 (F4.4): answer computed from the LIVE review's compliance field.
    const review = await payload.find({
      collection: 'traditional-casino-reviews',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: step.reviewSlug } },
    })
    const reviewDoc = review.docs[0]
    if (!reviewDoc) throw new Error('review data unavailable')
    stepResult = validateLicenseFieldMatch(step, reviewDoc as any, String(answerKey ?? ''))
  } else if (step.kind === 'casino_filter_match') {
    // Phase 4 (F4.4): answer computed from whether the LIVE bonus passes the filter.
    const bonus = await payload.find({
      collection: 'wagering-bonuses',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: step.bonusSlug } },
    })
    const bonusDoc = bonus.docs[0]
    if (!bonusDoc) throw new Error('bonus data unavailable')
    stepResult = validateCasinoFilterMatch(step, bonusDoc as any, String(answerKey ?? ''))
  } else {
    throw new Error('unsupported step kind')
  }

  const isLastStep = stepIndex >= steps.length - 1
  const completed = stepResult.pass && isLastStep

  if (!stepResult.pass) {
    await payload.update({
      collection: 'user-quests',
      id: uq.id,
      overrideAccess: true,
      data: { lastEvidenceId: evidenceId },
    })
    return {
      stepResult: { ...stepResult, hint: step.hint },
      questState: { stepIndex: uq.stepIndex, status: uq.status },
      profile: toPublicProfile(profile),
    }
  }

  if (!isLastStep) {
    const updated = await payload.update({
      collection: 'user-quests',
      id: uq.id,
      overrideAccess: true,
      data: { stepIndex: stepIndex + 1, lastEvidenceId: evidenceId },
    })
    return {
      stepResult,
      questState: { stepIndex: updated.stepIndex, status: updated.status },
      profile: toPublicProfile(profile),
    }
  }

  // Completion: mint XP against the daily cap — ALL inside one transaction so
  // two concurrent completions cannot both pass the cap, and the append-only
  // ledger insert + profile update + quest update commit or fail together.
  const rewardXp = Number(quest.rewardXp ?? 0)
  const req = await createLocalReq({}, payload)
  const transactionID = await payload.db.beginTransaction()
  if (transactionID) req.transactionID = transactionID
  try {
    const mintedToday = await xpMintedToday(payload, player)
    if (mintedToday + rewardXp > DAILY_XP_CAP) {
      await payload.update({
        collection: 'user-quests',
        id: uq.id,
        overrideAccess: true,
        data: { lastEvidenceId: evidenceId },
        req,
      })
      await commitTransaction(req)
      return {
        stepResult: {
          pass: false,
          rgExplain: 'Daily XP cap reached — the ledger stays honest. Come back tomorrow, Scout.',
        },
        questState: { stepIndex: uq.stepIndex, status: uq.status },
        profile: toPublicProfile(profile),
      }
    }

    try {
      await payload.create({
        collection: 'xp-events',
        overrideAccess: true,
        data: { playerKey: player, amount: rewardXp, reason: 'mission_completed', quest: Number(questId), evidenceId },
        req,
      })
    } catch (e) {
      // Unique (playerKey, evidenceId) violation = a concurrent double-submit
      // already minted. Fail closed as idempotent — never a 500, never double XP.
      await killTransaction(req)
      return {
        idempotent: true,
        stepResult: { pass: false, rgExplain: 'Already submitted — no double XP.' },
        questState: { stepIndex: uq.stepIndex, status: uq.status },
        profile: toPublicProfile(profile),
      }
    }

    const newTotal = profile.totalXp + rewardXp
    const { level, rankTitle } = recomputeLevel(newTotal)

    await payload.update({
      collection: 'gamification-profiles',
      id: profile.id,
      overrideAccess: true,
      data: { totalXp: newTotal, level, rankTitle, completedMissions: profile.completedMissions + 1 },
      req,
    })
    await payload.update({
      collection: 'user-quests',
      id: uq.id,
      overrideAccess: true,
      data: { status: 'completed', stepIndex: steps.length, lastEvidenceId: evidenceId, completedAt: new Date().toISOString() },
      req,
    })

    await commitTransaction(req)

    return {
      stepResult: { pass: true, xpAwarded: rewardXp },
      questState: { stepIndex: steps.length, status: 'completed' },
      profile: { ...toPublicProfile(profile), totalXp: newTotal, level, rankTitle, completedMissions: profile.completedMissions + 1 },
      missionComplete: true,
    }
  } catch (e) {
    await killTransaction(req)
    throw e
  }
}
