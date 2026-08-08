import { getPayload } from 'payload'
import config from '@payload-config'

import { startQuestFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'
import { clientIp, rateLimited, requestKey } from '@/gamification/rateLimit'

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  const { player, questId } = body ?? {}
  if (!isValidPlayerKey(player) || !questId) {
    return Response.json({ error: 'invalid payload' }, { status: 400 })
  }
  if (rateLimited(requestKey(request, player), 'write')) {
    return Response.json({ error: 'rate limited' }, { status: 429 })
  }

  try {
    const data = await startQuestFlow(payload, player, questId, clientIp(request))
    return Response.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error'
    if (message === 'quest unavailable') return Response.json({ error: message }, { status: 404 })
    if (message === 'profile creation capped') {
      return Response.json({ error: message }, { status: 429 })
    }
    throw e
  }
}
