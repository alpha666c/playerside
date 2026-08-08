/**
 * Review pipeline — Phase 5.
 *
 * The single source of stage order/labels shared by the admin pipeline board,
 * the gamification-free public /reviews overview, and the seed script. The
 * stage order mirrors MASTER-BLUEPRINT.md §3 exactly (no skipping, no
 * reordering — ResearchQueue.enforceStatusTransition enforces it at write
 * time; this module is the read-side view of the same contract).
 */

export const PIPELINE_STAGES = [
  'queued',
  'desk-research',
  'hands-on-testing',
  'editorial',
  'integrity-check',
  'published',
  'monitoring',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const stageLabel: Record<PipelineStage, string> = {
  queued: 'Queued',
  'desk-research': 'Desk research',
  'hands-on-testing': 'Hands-on testing',
  editorial: 'Editorial',
  'integrity-check': 'Integrity check',
  published: 'Published',
  monitoring: 'Monitoring',
}

export const isPipelineStage = (value: unknown): value is PipelineStage =>
  typeof value === 'string' && (PIPELINE_STAGES as readonly string[]).includes(value)

/** A minimal shape of a research-queue case for counting purposes. */
export type PipelineCase = {
  status?: unknown
  isIllustrativeSample?: unknown
  casinoType?: unknown
  operatorName?: unknown
  caseNumber?: unknown
  updatedAt?: unknown
}

/** Count cases per stage, in pipeline order (missing/unknown statuses ignored). */
export const stageCounts = (cases: PipelineCase[]): Record<PipelineStage, number> => {
  const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
    PipelineStage,
    number
  >
  for (const c of cases) {
    if (isPipelineStage(c.status)) counts[c.status] += 1
  }
  return counts
}

export type PipelineSummary = {
  total: number
  /** Cases at any stage before published (i.e. still in the pipeline). */
  inReview: number
  /** Cases that reached published or monitoring. */
  published: number
  byStage: Record<PipelineStage, number>
}

/** The stages that count as "in review" — everything before published. */
const PRE_PUBLISHED = PIPELINE_STAGES.slice(0, PIPELINE_STAGES.indexOf('published'))

/** Aggregate the board numbers shown in the admin board and public overview. */
export const summarizePipeline = (cases: PipelineCase[]): PipelineSummary => {
  const byStage = stageCounts(cases)
  const published = byStage.published + byStage.monitoring
  // Strict: only known pre-published stages count as in-review, so cases with
  // an unknown/missing status are never silently counted as "under review".
  const inReview = PRE_PUBLISHED.reduce((sum, stage) => sum + byStage[stage], 0)
  return {
    total: cases.length,
    inReview,
    published,
    byStage,
  }
}
