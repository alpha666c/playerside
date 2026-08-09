import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { createTicketWithRetry } from '@/lib/cofounder/tools'
import type { CofounderSession } from '@/payload-types'

/**
 * Phase G (G.3) — ticket lifecycle (spec §3.2), admin-only.
 *
 * POST /api/cofounder/tickets  — create `{ title, sessionType?, plan? }`
 * GET  /api/cofounder/tickets  — open/active/paused tickets + today's plan rollup
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  try {
    const body = (await request.json()) as { title?: string; sessionType?: string; plan?: unknown[] }
    const title = body.title?.trim()
    if (!title) return new Response('title is required.', { status: 400 })
    if (title.length > 200) return new Response('title too long (max 200).', { status: 400 })

    const ticket = await createTicketWithRetry(payload, req, {
      title,
      sessionType:
        body.sessionType === 'research-brief' || body.sessionType === 'ops'
          ? body.sessionType
          : 'review-run',
      ...(Array.isArray(body.plan)
        ? { plan: body.plan as NonNullable<CofounderSession['plan']> }
        : {}),
    })
    return Response.json({ id: ticket.id, ticketNumber: ticket.ticketNumber, status: ticket.status })
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder tickets create error' })
    const status = e instanceof Error && 'status' in e && typeof (e as { status?: unknown }).status === 'number' ? ((e as { status: number }).status >= 400 && (e as { status: number }).status < 600 ? (e as { status: number }).status : 500) : 500
    return new Response(e instanceof Error ? e.message : 'Internal error', { status })
  }
}

const todayStartIso = (): string => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  const tickets = await payload.find({
    collection: 'cofounder-sessions',
    req,
    limit: 100,
    depth: 0,
    sort: '-lastActiveAt',
    where: { status: { in: ['open', 'active', 'paused'] } },
  })

  const todayTickets = await payload.find({
    collection: 'cofounder-sessions',
    req,
    limit: 100,
    depth: 0,
    where: { createdAt: { greater_than_equal: todayStartIso() } },
  })

  // Today's plan rollup: plan items grouped by kind + status
  const rollup: Record<string, Record<string, number>> = {}
  for (const t of todayTickets.docs) {
    for (const item of t.plan ?? []) {
      const kind = item.kind ?? 'ops'
      const status = item.status ?? 'todo'
      rollup[kind] ??= {}
      rollup[kind][status] = (rollup[kind][status] ?? 0) + 1
    }
  }

  return Response.json({
    tickets: tickets.docs.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      sessionType: t.sessionType,
      status: t.status,
      lastActiveAt: t.lastActiveAt,
    })),
    today: { planRollup: rollup, ticketsToday: todayTickets.docs.length },
  })
}
