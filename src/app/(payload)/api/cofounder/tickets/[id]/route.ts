import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

/**
 * Phase G (G.3/G.4) — ticket detail + status transitions (spec §3.2, §11),
 * admin-only.
 *
 * `GET  /api/cofounder/tickets/:id` — the full ticket (plan, thread,
 * pinnedCases resolved at depth 1, version) for the workspace panel.
 *
 * `POST /api/cofounder/tickets/:id` — `{ action: 'pause' | 'close', confirm? }`
 *
 * Deliberate deviation (DECISION-LOG 2026-08-09): the spec lists
 * `/tickets/:id/pause` and `/tickets/:id/close` as separate URLs; a single
 * `[id]` route with an `action` body keeps the surface to one thin handler
 * with identical behavior. `close` refuses while plan items are still open
 * unless `confirm: true` (same rule as the `close_ticket` tool).
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  const { id } = await ctx.params
  const doc = await payload.findByID({
    collection: 'cofounder-sessions',
    id: Number(id),
    req,
    depth: 1,
  })
  if (!doc) return new Response('Ticket not found.', { status: 404 })

  // G.6 — per-pinned-case run summaries for the "agents at work" pane.
  // Each pinned case is populated at depth 1 (research-queue doc), so its
  // `aiRuns` array is available here; we ship a compact projection (role,
  // status, times, runId, expandable output + case version for approve).
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null
  const runs = ((doc.pinnedCases ?? []) as unknown[]).flatMap((p) => {
    if (!isObject(p) || !Array.isArray(p.aiRuns)) return []
    return (p.aiRuns as unknown[]).map((r) => {
      const run = isObject(r) ? r : {}
      return {
        runId: String(run.runId ?? ''),
        caseId: Number(p.id),
        caseNumber: (p.caseNumber as string | null) ?? null,
        operatorName: (p.operatorName as string | null) ?? null,
        caseStatus: (p.status as string | null) ?? null,
        caseVersion: (p.version as number | null | undefined) ?? 1,
        agentRole: String(run.agentRole ?? 'chat'),
        status: String(run.status ?? 'pending'),
        startedAt: typeof run.startedAt === 'string' ? run.startedAt : null,
        completedAt: typeof run.completedAt === 'string' ? run.completedAt : null,
        // Expandable structured output (agents-at-work pane, spec §11).
        output: isObject(run.output) ? run.output : null,
      }
    })
  })

  return Response.json({
    id: doc.id,
    ticketNumber: doc.ticketNumber,
    title: doc.title,
    sessionType: doc.sessionType,
    status: doc.status,
    plan: doc.plan ?? [],
    thread: doc.thread ?? [],
    pinnedCases: doc.pinnedCases ?? [],
    delegationQueue: doc.delegationQueue ?? [],
    runs,
    lastActiveAt: doc.lastActiveAt,
    createdAt: doc.createdAt,
    version: doc.version,
  })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  const { id } = await ctx.params

  let body: { action?: string; confirm?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const action = body.action
  if (action !== 'pause' && action !== 'close') {
    return new Response("action must be 'pause' or 'close'.", { status: 400 })
  }

  const doc = await payload.findByID({
    collection: 'cofounder-sessions',
    id: Number(id),
    req,
    depth: 0,
  })
  if (!doc) return new Response('Ticket not found.', { status: 404 })

  let status: 'paused' | 'done'
  if (action === 'pause') {
    status = 'paused'
  } else {
    const openItems = (doc.plan ?? []).filter((p) =>
      ['todo', 'in-progress', 'blocked'].includes(String((p as { status?: unknown }).status)),
    )
    if (openItems.length > 0 && body.confirm !== true) {
      return new Response(
        `Ticket ${doc.ticketNumber} still has ${openItems.length} open plan item(s) — close requires confirm:true (or mark plan items done first).`,
        { status: 400 },
      )
    }
    status = 'done'
  }

  const updated = await payload.update({
    id: doc.id,
    collection: 'cofounder-sessions',
    req,
    context: { expectedVersion: doc.version ?? 1, changedFields: ['status'] },
    data: { status },
  })

  return Response.json({
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    status: updated.status,
  })
}
