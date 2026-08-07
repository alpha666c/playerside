'use client'

import { useCallback, useEffect, useState } from 'react'

import type { BadgeStatus } from '@/gamification/badges'
import { getPlayerKey } from '@/gamification/playerKey'

import type { Profile, Quest } from './useGamification'

/**
 * vex-surface hook for the /missions board.
 *
 * Same identity contract as useGamification (shared localStorage UUID), but
 * reads the full roster (all page targets) plus derived badges instead of the
 * per-page offer set. All state is a mirror of the server — XP, ranks, badges
 * and mission statuses are never computed client-side.
 */

export type MissionStatus = 'not_started' | 'in_progress' | 'completed'

export type MissionEntry = {
  quest: Quest
  status: MissionStatus
  stepIndex: number
  totalSteps: number
}
export type MissionsData = {
  profile: Profile
  badges: BadgeStatus[]
  missions: MissionEntry[]
}

export const useMissions = () => {
  const [playerKey, setPlayerKey] = useState<string>('')
  const [data, setData] = useState<MissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<Quest['id'] | null>(null)

  const refresh = useCallback(async () => {
    if (!playerKey) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gamification/missions?player=${encodeURIComponent(playerKey)}`)
      if (!res.ok) throw new Error(`missions API ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'missions unavailable')
      // Fail soft — the page renders an empty board rather than breaking.
    } finally {
      setLoading(false)
    }
  }, [playerKey])

  useEffect(() => {
    setPlayerKey(getPlayerKey())
  }, [])

  useEffect(() => {
    if (playerKey) refresh()
  }, [playerKey, refresh])

  const startMission = useCallback(
    async (questId: Quest['id']) => {
      if (!playerKey) return
      setStartingId(questId)
      setError(null)
      try {
        const res = await fetch('/api/gamification/quests/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player: playerKey, questId }),
        })
        if (!res.ok) throw new Error(`start failed ${res.status}`)
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'start failed')
      } finally {
        setStartingId(null)
      }
    },
    [playerKey, refresh],
  )

  return { data, loading, error, startingId, actions: { refresh, startMission } }
}

export type UseMissions = ReturnType<typeof useMissions>
