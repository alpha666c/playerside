import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { updateTicketPlanItem } from '@/lib/cofounder/tools'

/**
 * Phase G (G.4) — plan-item add/update for the workspace panel (spec §11,
 * center pane), admin-only.
 *
 * `POST /api/cofounder/tickets/:id/plan` — `{ planItemId?, kind?, target?,
 * status?, notes? }` (planItemId omitted → append a new item).
 *
 * Shares `updateTicketPlanItem` with the model's `set_plan_item` tool, so the
 * panel and the Cofounder mutate the plan through the exact same
 * optimistic-version path (reviewer S3 — no drift).
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const result = await updateTicketPlanItem(payload, req, Number(id), {
      planItemId: body.planItemId,
      kind: body.kind,
      target: body.target,
      status: body.status,
      notes: body.notes,
    })

    if (!result.ok) {
      // "Ticket not found" and "Plan item not found" both surface as 404 with
      // their own message; a thrown error below (e.g. the optimistic-version
      // 409 under a concurrent edit) keeps its real status (reviewer S3).
      const msg = typeof result.output === 'string' ? result.output : 'Plan update failed.'
      return new Response(msg, { status: 404 })
    }
    return Response.json(result.output)
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder plan update error' })
    const status =
      typeof (e as { status?: unknown })?.status === 'number' &&
      (e as { status: number }).status >= 400 &&
      (e as { status: number }).status < 600
        ? (e as { status: number }).status
        : 500
    return new Response((e as Error)?.message ?? 'Internal error', { status })
  }
}
