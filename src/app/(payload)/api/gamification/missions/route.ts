import { getPayload } from 'payload'
import config from '@payload-config'

import { missionsFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'
import { clientIp, rateLimited, requestKey } from '@/gamification/rateLimit'

/** GET /api/gamification/missions?player= — the /missions board payload. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const player = url.searchParams.get('player')

  if (!isValidPlayerKey(player)) {
    return Response.json({ error: 'invalid player' }, { status: 400 })
  }
  if (rateLimited(requestKey(request, player), 'read')) {
    return Response.json({ error: 'rate limited' }, { status: 429 })
  }

  const payload = await getPayload({ config })
  try {
    const data = await missionsFlow(payload, player, clientIp(request))
    return Response.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error'
    if (message === 'profile creation capped') {
      return Response.json({ error: message }, { status: 429 })
    }
    throw e
  }
}
