'use client'
import React, { useEffect, useState } from 'react'

type QuestDoc = {
  id: string | number
  missionId?: string | null
  title?: string | null
  rewardXp?: number | null
  pageTarget?: string | null
  enabled?: boolean | null
  steps?: unknown
  updatedAt?: string | null
}

type ProfileDoc = {
  id: string | number
  playerKey?: string | null
  totalXp?: number | null
  level?: number | null
  rankTitle?: string | null
  completedMissions?: number | null
  updatedAt?: string | null
}

type XpEventDoc = {
  id: string | number
  playerKey?: string | null
  amount?: number | null
  reason?: string | null
  quest?: unknown
  createdAt?: string | null
}

type UserQuestDoc = {
  id: string | number
  playerKey?: string | null
  status?: string | null
  updatedAt?: string | null
}

type GamificationData = {
  quests: QuestDoc[]
  profiles: ProfileDoc[]
  xpEvents: XpEventDoc[]
  userQuests: UserQuestDoc[]
}

/**
 * Phase 5 — admin mission roster (/admin/gamification).
 *
 * Read-only view over the vex-ledger: mission definitions, anonymous player
 * profiles, the append-only XP ledger, and per-player quest state. All writes
 * stay service-role (API routes) — this view only audits.
 */
export default function GamificationView() {
  const [data, setData] = useState<GamificationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/gamification')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const json = (await res.json()) as GamificationData
        if (!cancelled) setData(json)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load roster')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <div style={{ padding: 24, color: '#ff6b6b' }}>Failed to load roster: {error}</div>
  if (!data) return <div style={{ padding: 24, color: 'var(--theme-elevation-500)' }}>Loading roster…</div>

  const totalXp = data.xpEvents.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const userQuestStatusCounts = data.userQuests.reduce<Record<string, number>>((acc, u) => {
    const key = String(u.status ?? 'unknown')
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Mission roster</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--theme-elevation-500)', fontSize: 14 }}>
        The vex-ledger surface: missions, players, and the append-only XP ledger. Everything here
        is derived from service-role writes — no direct REST mutation is possible.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Missions', value: data.quests.length },
          { label: 'Players', value: data.profiles.length },
          { label: 'XP ledger rows', value: data.xpEvents.length },
          { label: 'XP minted (shown)', value: totalXp },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              border: '1px solid var(--theme-elevation-200)',
              borderRadius: 8,
              padding: '10px 18px',
              background: 'var(--theme-elevation-50)',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{stat.value}</div>
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'var(--theme-elevation-500)',
                marginTop: 4,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <Section title="Missions">
        <Table
          head={['Mission', 'ID', 'XP', 'Target', 'Steps', 'Enabled']}
          rows={data.quests.map((q) => [
            String(q.title ?? '—'),
            String(q.missionId ?? '—'),
            String(q.rewardXp ?? '—'),
            String(q.pageTarget ?? '—'),
            stepSummary(q.steps),
            q.enabled ? 'Yes' : 'No',
          ])}
        />
      </Section>

      <Section title="Player profiles (top XP)">
        <Table
          head={['Player', 'Level', 'Rank', 'Total XP', 'Missions', 'Updated']}
          rows={data.profiles.map((p) => [
            shortKey(p.playerKey),
            String(p.level ?? '—'),
            String(p.rankTitle ?? '—'),
            String(p.totalXp ?? 0),
            String(p.completedMissions ?? 0),
            prettyDate(p.updatedAt),
          ])}
        />
      </Section>

      <Section title="Recent XP ledger entries (append-only)">
        <Table
          head={['Player', 'Amount', 'Reason', 'Quest', 'When']}
          rows={data.xpEvents.map((e) => [
            shortKey(e.playerKey),
            `+${String(e.amount ?? 0)}`,
            String(e.reason ?? '—'),
            questLabel(e.quest),
            prettyDate(e.createdAt),
          ])}
        />
      </Section>

      <Section title="Player quest state">
        {Object.keys(userQuestStatusCounts).length === 0 ? (
          <p style={{ color: 'var(--theme-elevation-500)' }}>No active player quests yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(userQuestStatusCounts).map(([status, count]) => (
              <div
                key={status}
                style={{
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 13,
                  background: 'var(--theme-elevation-50)',
                }}
              >
                {status}: <strong>{count}</strong>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 28 }}>
    <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>{title}</h2>
    {children}
  </section>
)

const Table: React.FC<{ head: string[]; rows: string[][] }> = ({ head, rows }) =>
  rows.length === 0 ? (
    <p style={{ color: 'var(--theme-elevation-500)' }}>Nothing here yet.</p>
  ) : (
    <div style={{ overflowX: 'auto', border: '1px solid var(--theme-elevation-200)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--theme-elevation-200)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: 'var(--theme-elevation-500)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 ? 'var(--theme-elevation-50)' : 'var(--theme-bg)' }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: '7px 12px',
                    borderBottom: '1px solid var(--theme-elevation-100)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

/** Summarize a quest steps JSON array into "2 steps: quiz, quiz". */
const stepSummary = (steps: unknown): string => {
  if (!Array.isArray(steps) || steps.length === 0) return '—'
  const kinds = steps.map((s) => (typeof s === 'object' && s && 'kind' in s ? String((s as { kind: unknown }).kind) : '?'))
  return `${steps.length} step${steps.length === 1 ? '' : 's'}: ${kinds.join(', ')}`
}

const shortKey = (key: string | null | undefined): string => {
  const k = String(key ?? '—')
  return k.length > 12 ? `${k.slice(0, 12)}…` : k
}

const questLabel = (quest: unknown): string => {
  if (quest && typeof quest === 'object' && 'missionId' in quest) {
    return String((quest as { missionId: unknown }).missionId)
  }
  return String(quest ?? '—')
}

const prettyDate = (value: string | null | undefined): string => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
