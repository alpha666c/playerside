import { getPayload } from 'payload'
import config from '@payload-config'

import { meFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'
import { clientIp, rateLimited, requestKey } from '@/gamification/rateLimit'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const player = url.searchParams.get('player')
  const path = url.searchParams.get('path') ?? '/'

  if (!isValidPlayerKey(player)) {
    return Response.json({ error: 'invalid player' }, { status: 400 })
  }
  if (rateLimited(requestKey(request, player), 'read')) {
    return Response.json({ error: 'rate limited' }, { status: 429 })
  }

  const payload = await getPayload({ config })
  try {
    const data = await meFlow(payload, player, path, clientIp(request))
    return Response.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error'
    if (message === 'profile creation capped') {
      return Response.json({ error: message }, { status: 429 })
    }
    throw e
  }
}
