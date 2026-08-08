'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getPlayerKey } from '@/gamification/playerKey'

/**
 * vex-surface hook contract (skills/vex-surface):
 * useGamification() → { profile, activeQuest, offers, actions, ui }
 *
 * Player identity is an anonymous localStorage UUID (no public auth on this
 * site). XP is NEVER computed or shown from client state — the server returns
 * profile totals, and the client is a mirror.
 */

export type SanitizedStep = {
  kind: string
  prompt: string
  options: { key: string; label: string }[]
  hint?: string
  rgExplain?: string
}

export type Quest = {
  id: string | number
  missionId: string
  title: string
  brief: string
  rewardXp: number
  pageTarget: string
  steps: SanitizedStep[]
}

export type Profile = {
  playerKey: string
  totalXp: number
  level: number
  rankTitle: string
  completedMissions: number
}

export type ActiveQuest = {
  userQuestId: string | number
  stepIndex: number
  quest: Quest
}

/** Phase 4 (F4.2): ledger-derived streak state — server is the source of truth. */
export type Streak = {
  current: number
  longest: number
  freezesAvailable: number
  protectedDays: number
  lastActiveDay: string | null
}

/** Phase 4 (F4.1): the recommended first mission for a fresh scout. */
export type Onboarding = { mission: Quest } | null

export type QuestState = {
  stepIndex: number
  status: 'active' | 'completed'
}

export type StepResult =
  | { pass: true; xpAwarded?: number; correctValue?: string | number }
  | { pass: false; rgExplain: string; hint?: string }

export const useGamification = () => {
  const [playerKey, setPlayerKey] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null)
  const [offers, setOffers] = useState<Quest[]>([])
  const [offersDismissed, setOffersDismissed] = useState(false)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dockOpen, setDockOpen] = useState(false)
  const [toast, setToast] = useState<{ title: string; xp: number } | null>(null)

  const path = useMemo(() => (typeof window !== 'undefined' ? window.location.pathname : '/'), [])

  const refresh = useCallback(async () => {
    if (!playerKey) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/gamification/me?player=${encodeURIComponent(playerKey)}&path=${encodeURIComponent(path)}`,
      )
      if (!res.ok) throw new Error(`gamification API ${res.status}`)
      const data = await res.json()
      setProfile(data.profile)
      setActiveQuest(data.activeQuest)
      setOffers(data.offers ?? [])
      setStreak(data.streak ?? null)
      setOnboarding(data.onboarding ?? null)
      if (data.onboarding == null) setOnboardingDismissed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'gamification unavailable')
      // Fail soft — the review page must never break because Vex is down.
    } finally {
      setLoading(false)
    }
  }, [playerKey, path])

  useEffect(() => {
    setPlayerKey(getPlayerKey())
  }, [])

  useEffect(() => {
    if (playerKey) refresh()
  }, [playerKey, refresh])

  const startQuest = useCallback(
    async (questId: string | number) => {
      if (!playerKey) return
      const res = await fetch('/api/gamification/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: playerKey, questId }),
      })
      if (!res.ok) {
        setError(`start failed ${res.status}`)
        return
      }
      const data = await res.json()
      if (data.activeQuest) setActiveQuest(data.activeQuest)
      if (data.quest && data.userQuest) {
        setActiveQuest({ userQuestId: data.userQuest.id, stepIndex: data.userQuest.stepIndex, quest: data.quest })
      }
      if (data.profile) setProfile(data.profile)
      setOffersDismissed(false)
      setDockOpen(true)
      setError(null)
    },
    [playerKey],
  )

  const submitEvidence = useCallback(
    async (stepIndex: number, answerKey: string): Promise<StepResult | null> => {
      if (!playerKey || !activeQuest) return null
      const evidenceId = getPlayerKey() // unique per submit attempt
      const res = await fetch('/api/gamification/quests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: playerKey,
          questId: activeQuest.quest.id,
          stepIndex,
          answerKey,
          evidenceId: `${evidenceId}-${Date.now()}`,
        }),
      })
      if (!res.ok) {
        setError(`submit failed ${res.status}`)
        return null
      }
      const data = await res.json()
      if (data.profile) setProfile(data.profile)
      if (data.questState) {
        if (data.questState.status === 'completed') {
          setActiveQuest((q) => (q ? { ...q, stepIndex: data.questState.stepIndex } : q))
          const xp = data.stepResult?.xpAwarded ?? 0
          if (xp > 0) setToast({ title: activeQuest.quest.title, xp })
          // Phase 4 (F4.2): re-pull /me so the streak + onboarding reflect the ledger.
          refresh()
        } else {
          setActiveQuest((q) => (q ? { ...q, stepIndex: data.questState.stepIndex } : q))
        }
      }
      return data.stepResult ?? null
    },
    [playerKey, activeQuest, refresh],
  )

  const dismissOffer = useCallback(() => {
    setOffersDismissed(true)
    setDockOpen(false)
  }, [])

  // Reward toast auto-dismisses (≤4s per vex-surface).
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  return {
    profile,
    activeQuest,
    offers: offersDismissed ? [] : offers,
    streak,
    onboarding: onboardingDismissed ? null : onboarding,
    loading,
    error,
    actions: { refresh, startQuest, submitEvidence, dismissOffer, dismissOnboarding: () => setOnboardingDismissed(true) },
    ui: { dockOpen, setDockOpen, toast },
  }
}

export type UseGamification = ReturnType<typeof useGamification>
