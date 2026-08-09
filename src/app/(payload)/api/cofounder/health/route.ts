import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { healthCheck } from '@/lib/reviewChat/llm'

/**
 * Phase G (G.1) — the model-id self-check (spec §1, QA S0-1).
 *
 * GET /api/cofounder/health — admin-only. Returns whether the LLM client is
 * configured and, when a key exists, fires one tiny call to verify the
 * configured model id is actually served by the endpoint. The admin UI
 * renders this as a status chip ("LLM ready" / "key missing" / "model id
 * rejected"). Never throws for configuration — a JSON state is returned so
 * the UI can show a helpful message instead of an error page.
 */
export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })

  const payloadReq = await createLocalReq({ user }, payload)
  const result = await healthCheck(payload, payloadReq)
  return Response.json(result)
}
