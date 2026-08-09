'use client'
import React, { useEffect, useState } from 'react'

import { summarizePipeline, type PipelineCase } from '@/lib/pipeline'

type GamificationSummary = {
  quests: unknown[]
  profiles: unknown[]
  xpEvents: unknown[]
  userQuests: unknown[]
}

/**
 * Phase 5 — the admin dashboard home is now an operations summary (the
 * template "welcome + seed pages/posts/projects" block was Payload-template
 * boilerplate that meant nothing for Playerside). Read-only: every number
 * comes from the authenticated dashboard API routes.
 */
const BeforeDashboard: React.FC = () => {
  const [cases, setCases] = useState<PipelineCase[] | null>(null)
  const [roster, setRoster] = useState<GamificationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Phase G (G.4): a live Cofounder ticket count for the dashboard block.
  const [tickets, setTickets] = useState<Array<{ plan?: unknown[] | null }> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/dashboard/cases').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/dashboard/gamification').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([casesData, rosterData]) => {
        if (cancelled) return
        if (casesData) setCases((casesData as { cases: PipelineCase[] }).cases)
        if (rosterData) setRoster(rosterData as GamificationSummary)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/cofounder/tickets')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setTickets((data as { tickets: Array<{ plan?: unknown[] | null }> }).tickets)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ff6b6b' }}>
        Failed to load dashboard: {error}
      </div>
    )
  }

  const pipeline = cases ? summarizePipeline(cases) : null
  const xpEvents = (roster?.xpEvents ?? []) as Array<{ amount?: number }>
  const totalXp = xpEvents.reduce((sum, e) => sum + (e.amount ?? 0), 0)

  const ticketCount = tickets === null ? '…' : tickets.length
  const planItemCount =
    tickets === null
      ? '…'
      : tickets.reduce((sum, t) => sum + (Array.isArray(t.plan) ? t.plan.length : 0), 0)

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--theme-elevation-200)',
          background: 'var(--theme-elevation-50)',
          padding: 20,
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Playerside operations</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--theme-elevation-500)', fontSize: 13.5 }}>
          Review pipeline + mission roster at a glance. All numbers are live, read-only, and
          illustrative cases are flagged by their #PS-YYYY-SNN case number.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Block
            title="Review pipeline"
            href="/admin/pipeline"
            stats={
              pipeline
                ? [
                    { label: 'Cases', value: pipeline.total },
                    { label: 'In review', value: pipeline.inReview },
                    { label: 'Published', value: pipeline.published },
                  ]
                : []
            }
          />
          <Block
            title="Mission roster"
            href="/admin/gamification"
            stats={[
              { label: 'Missions', value: roster?.quests.length ?? '…' },
              { label: 'Players', value: roster?.profiles.length ?? '…' },
              { label: 'XP minted', value: totalXp },
            ]}
          />
          <Block
            title="Cofounder workspace"
            href="/admin/cofounder"
            stats={[
              { label: 'Tickets', value: ticketCount },
              { label: 'Plan items', value: planItemCount },
              { label: 'Mode', value: 'AI ops' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

const Block: React.FC<{
  title: string
  href: string
  stats: Array<{ label: string; value: number | string }>
}> = ({ title, href, stats }) => (
  <a
    href={href}
    style={{
      flex: '1 1 220px',
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid var(--theme-elevation-200)',
      borderRadius: 10,
      background: 'var(--theme-bg)',
      padding: 14,
      display: 'block',
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{title} →</div>
    <div style={{ display: 'flex', gap: 18 }}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{stat.value}</div>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: 'var(--theme-elevation-500)',
              marginTop: 4,
            }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  </a>
)

export default BeforeDashboard
