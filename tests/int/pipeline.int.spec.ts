import { describe, it, expect } from 'vitest'

import {
  isPipelineStage,
  PIPELINE_STAGES,
  stageCounts,
  stageLabel,
  summarizePipeline,
} from '@/lib/pipeline'

/**
 * Phase 5 — review pipeline board logic. Pure; no DB.
 */
describe('Phase 5: pipeline stages', () => {
  it('exposes the seven blueprint stages in strict order', () => {
    expect(PIPELINE_STAGES).toEqual([
      'queued',
      'desk-research',
      'hands-on-testing',
      'editorial',
      'integrity-check',
      'published',
      'monitoring',
    ])
    expect(stageLabel['hands-on-testing']).toBe('Hands-on testing')
  })

  it('guards unknown statuses so the board never mislabels', () => {
    expect(isPipelineStage('queued')).toBe(true)
    expect(isPipelineStage('published')).toBe(true)
    expect(isPipelineStage('archived')).toBe(false)
    expect(isPipelineStage(null)).toBe(false)
  })

  it('counts cases per stage, ignoring unknown statuses', () => {
    const counts = stageCounts([
      { status: 'queued' },
      { status: 'queued' },
      { status: 'editorial' },
      { status: 'published' },
      { status: 'archived' },
      { status: null },
    ] as never[])
    expect(counts.queued).toBe(2)
    expect(counts.editorial).toBe(1)
    expect(counts.published).toBe(1)
    expect(counts.monitoring).toBe(0)
  })

  it('summarizes totals, in-review and published counts', () => {
    const summary = summarizePipeline([
      { status: 'queued' },
      { status: 'desk-research' },
      { status: 'integrity-check' },
      { status: 'published' },
      { status: 'monitoring' },
    ] as never[])
    expect(summary.total).toBe(5)
    expect(summary.inReview).toBe(3)
    expect(summary.published).toBe(2)
    expect(summary.byStage.published).toBe(1)
    expect(summary.byStage.monitoring).toBe(1)
  })

  it('never counts unknown-status cases as in review', () => {
    const summary = summarizePipeline([
      { status: 'queued' },
      { status: 'archived' },
      { status: null },
      { status: 'published' },
    ] as never[])
    expect(summary.total).toBe(4)
    expect(summary.inReview).toBe(1)
    expect(summary.published).toBe(1)
  })
})
