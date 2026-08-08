'use client'
import React, { useEffect, useState } from 'react'

import {
  PIPELINE_STAGES,
  stageLabel,
  summarizePipeline,
  type PipelineCase,
} from '@/lib/pipeline'

/**
 * Phase 5 — admin pipeline board (/admin/pipeline).
 *
 * Read-only kanban of the Review Intelligence System cases, grouped by the
 * seven blueprint stages. Data comes from the authenticated
 * /api/dashboard/cases route, so collection access control still applies.
 */
export default function PipelineView() {
  const [cases, setCases] = useState<PipelineCase[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/cases')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = (await res.json()) as { cases: PipelineCase[] }
        if (!cancelled) setCases(data.cases)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load cases')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <div style={{ padding: 24, color: '#ff6b6b' }}>Failed to load cases: {error}</div>
  if (!cases) return <div style={{ padding: 24, color: 'var(--theme-elevation-500)' }}>Loading pipeline…</div>

  const summary = summarizePipeline(cases)

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Review pipeline</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--theme-elevation-500)', fontSize: 14 }}>
        Case files in the Review Intelligence System, by stage (MASTER-BLUEPRINT.md §3 — one
        stage at a time, no skipping). Illustrative seed cases use the #PS-YYYY-SNN format.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total cases', value: summary.total },
          { label: 'In review', value: summary.inReview },
          { label: 'Published', value: summary.published },
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
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--theme-elevation-500)', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {PIPELINE_STAGES.map((stage) => {
          const stageCases = cases.filter((c) => c.status === stage)
          return (
            <div
              key={stage}
              style={{
                border: '1px solid var(--theme-elevation-200)',
                borderRadius: 10,
                background: 'var(--theme-elevation-50)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 160,
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--theme-elevation-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{stageLabel[stage]}</span>
                <span
                  style={{
                    background: 'var(--theme-elevation-200)',
                    borderRadius: 999,
                    padding: '1px 9px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {stageCases.length}
                </span>
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stageCases.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)' }}>—</div>
                ) : (
                  stageCases.map((c) => (
                    <div
                      key={String(c.caseNumber ?? c.operatorName ?? '?')}
                      style={{
                        border: '1px solid var(--theme-elevation-200)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: 'var(--theme-bg)',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{String(c.operatorName ?? '—')}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
                        {String(c.caseNumber ?? '')}
                        {c.casinoType ? ` · ${String(c.casinoType)}` : ''}
                      </div>
                      {c.updatedAt ? (
                        <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
                          {new Date(String(c.updatedAt)).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
