import { getPayload } from 'payload'
import config from '@payload-config'

import { submitStepFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'
import { clientIp, rateLimited, requestKey } from '@/gamification/rateLimit'

/**
 * POST /api/gamification/quests/submit — the ONLY route that mints XP.
 * All laws (idempotency, server-derived answers, daily cap, append-only
 * ledger) are enforced inside submitStepFlow; this route only adapts HTTP.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  const { player, questId, stepIndex, answerKey, evidenceId } = body ?? {}
  if (!isValidPlayerKey(player) || !questId || !isValidPlayerKey(evidenceId) || typeof stepIndex !== 'number') {
    return Response.json({ error: 'invalid payload' }, { status: 400 })
  }
  if (rateLimited(requestKey(request, player), 'write')) {
    return Response.json({ error: 'rate limited' }, { status: 429 })
  }

  try {
    const data = await submitStepFlow(payload, {
      player,
      questId,
      stepIndex,
      answerKey: String(answerKey ?? ''),
      evidenceId,
      ip: clientIp(request),
    })
    return Response.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error'
    if (message === 'quest unavailable') return Response.json({ error: message }, { status: 404 })
    if (message === 'quest not started') return Response.json({ error: message }, { status: 409 })
    if (message === 'profile creation capped') {
      return Response.json({ error: message }, { status: 429 })
    }
    throw e
  }
}
