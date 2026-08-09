import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { findTicketAndResume } from '@/lib/cofounder/tools'

/**
 * Phase G (G.3) — ticket resume (spec §3.2), admin-only.
 *
 * `POST /api/cofounder/tickets/resume` — `{ ticketId? | ticketNumber? }`
 *
 * Marks the ticket `active` and returns the full ticket (plan, thread,
 * pinnedCases, lastActiveAt) so the G.4 panel can rebuild the workspace.
 * Shares `findTicketAndResume` with the `resume_ticket` tool (reviewer S3 —
 * the two paths must not drift).
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  let body: { ticketId?: string | number; ticketNumber?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const updated = await findTicketAndResume(payload, req, {
    ticketId: body.ticketId !== undefined ? Number(body.ticketId) : undefined,
    ticketNumber: typeof body.ticketNumber === 'string' ? body.ticketNumber : undefined,
  })

  if (!updated) {
    return new Response('Ticket not found — pass ticketId or ticketNumber.', { status: 404 })
  }

  return Response.json({
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    title: updated.title,
    sessionType: updated.sessionType,
    status: updated.status,
    plan: updated.plan ?? [],
    thread: updated.thread ?? [],
    pinnedCases: updated.pinnedCases ?? [],
    lastActiveAt: updated.lastActiveAt,
    version: updated.version,
  })
}
