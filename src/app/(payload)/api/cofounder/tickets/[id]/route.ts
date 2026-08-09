import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

/**
 * Phase G (G.3) — ticket status transitions (spec §3.2), admin-only.
 *
 * `POST /api/cofounder/tickets/:id` — `{ action: 'pause' | 'close', confirm? }`
 *
 * Deliberate deviation (DECISION-LOG 2026-08-09): the spec lists
 * `/tickets/:id/pause` and `/tickets/:id/close` as separate URLs; a single
 * `[id]` route with an `action` body keeps the surface to one thin handler
 * with identical behavior. `close` refuses while plan items are still open
 * unless `confirm: true` (same rule as the `close_ticket` tool).
 */
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
