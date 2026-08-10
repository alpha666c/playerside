import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { publishCase } from '@/lib/cofounder/publish'

/**
 * Phase G (G.6b) — Approve & Publish (spec §12), admin-only.
 *
 * `POST /api/cofounder/publish` — `{ caseId, expectedVersion }`
 *
 * The publish tool is NOT in the Cofounder's tool surface (hard rule, §12.2):
 * this route accepts publish only from the authenticated Approve action.
 * Everything else lives in `src/lib/cofounder/publish.ts` (ordering, guards,
 * mapping, idempotency) — this route is a thin auth + args wrapper.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  let body: { caseId?: number | string; expectedVersion?: number }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const caseId = Number(body.caseId)
  const expectedVersion = Number(body.expectedVersion)
  if (!Number.isFinite(caseId) || caseId <= 0) {
    return new Response('caseId is required.', { status: 400 })
  }
  if (!Number.isFinite(expectedVersion) || expectedVersion <= 0) {
    return new Response('expectedVersion is required (review-before-write).', { status: 400 })
  }

  try {
    const result = await publishCase(payload, req, caseId, expectedVersion)
    return Response.json(result, { status: result.status ?? (result.ok ? 200 : 400) })
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder publish error' })
    return new Response((e as Error)?.message ?? 'Internal error', { status: 500 })
  }
}
