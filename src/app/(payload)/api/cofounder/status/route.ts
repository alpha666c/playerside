import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { summarizePipeline } from '@/lib/pipeline'

/**
 * Phase G (G.6) — control-room status aggregation (spec §11), admin-only.
 *
 * `GET /api/cofounder/status` — the compact strip + polling payload the
 * right pane consumes: open tickets, active/stale aiRuns across the pinned
 * cases of open tickets, delegation jobs awaiting approve, and the pipeline
 * rollup. The UI polls fast (~5s) only while a run is in progress, backing
 * off to ~30s when idle (S3). Everything is read-only.
 *
 * Staleness rule (S2-2): aiRun.status flips to `running` when the model call
 * actually starts — in this codebase the runner sets `pending` at start and
 * completes the run, so the aggregation treats a `pending` run started more
 * than ~15 min ago as `stale` (with a dismissable entry) and a fresh
 * `pending` run as `active`.
 */

const STALE_AFTER_MS = 15 * 60 * 1000

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

export async function GET(_request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  try {
    const openTickets = await payload.find({
      collection: 'cofounder-sessions',
      req,
      depth: 0,
      limit: 50,
      where: { status: { in: ['open', 'active', 'paused'] } },
      sort: '-lastActiveAt',
    })

    // Collect pinned cases across open tickets (single-writer per case).
    const caseIds = new Set<number>()
    for (const t of openTickets.docs) {
      for (const p of (t.pinnedCases ?? []) as unknown[]) {
        if (typeof p === 'number') caseIds.add(p)
        else if (isObject(p) && typeof p.id === 'number') caseIds.add(p.id)
      }
    }

    const now = Date.now()
    const runs: Array<{
      runId: string
      caseId: number
      caseNumber: string | null
      operatorName: string | null
      agentRole: string
      status: string
      startedAt: string | null
      completedAt: string | null
      stale: boolean
    }> = []

    if (caseIds.size > 0) {
      const cases = await payload.find({
        collection: 'research-queue',
        req,
        depth: 0,
        limit: 100,
        where: { id: { in: [...caseIds] } },
      })
      for (const c of cases.docs) {
        // Single-writer: at most one active run shown per case.
        const aiRuns = Array.isArray(c.aiRuns) ? c.aiRuns : []
        for (const r of aiRuns) {
          if (!isObject(r)) continue
          const status = String(r.status ?? '')
          if (status !== 'pending' && status !== 'running') continue
          const startedAt = typeof r.startedAt === 'string' ? r.startedAt : null
          const ageMs = startedAt ? now - new Date(startedAt).getTime() : Number.POSITIVE_INFINITY
          runs.push({
            runId: String(r.runId ?? ''),
            caseId: Number(c.id),
            caseNumber: (c.caseNumber as string | null) ?? null,
            operatorName: (c.operatorName as string | null) ?? null,
            agentRole: String(r.agentRole ?? 'chat'),
            status,
            startedAt,
            completedAt: typeof r.completedAt === 'string' ? r.completedAt : null,
            stale: ageMs > STALE_AFTER_MS,
          })
        }
      }
    }

    // Delegation jobs awaiting a human decision.
    let jobsAwaitingApprove = 0
    for (const t of openTickets.docs) {
      for (const j of (t.delegationQueue ?? []) as unknown[]) {
        if (isObject(j) && j.status === 'QUEUED') jobsAwaitingApprove += 1
      }
    }

    const allCases = await payload.find({
      collection: 'research-queue',
      req,
      depth: 0,
      limit: 500,
      pagination: false,
    })
    const pipeline = summarizePipeline(allCases.docs)

    return Response.json({
      tickets: {
        open: openTickets.docs.length,
        active: openTickets.docs.filter((t) => t.status === 'active').length,
      },
      runs: {
        active: runs.filter((r) => !r.stale).length,
        stale: runs.filter((r) => r.stale).length,
        detail: runs,
      },
      jobsAwaitingApprove,
      pipeline,
    })
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder status error' })
    return new Response((e as Error)?.message ?? 'Internal error', { status: 500 })
  }
}
