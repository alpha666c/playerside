import { getPayload } from 'payload'
import config from '@payload-config'

import { missionsFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'

/** GET /api/gamification/missions?player= — the /missions board payload. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const player = url.searchParams.get('player')

  if (!isValidPlayerKey(player)) {
    return Response.json({ error: 'invalid player' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const data = await missionsFlow(payload, player)
  return Response.json(data)
}
