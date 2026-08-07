import { getPayload } from 'payload'
import config from '@payload-config'

import { meFlow } from '@/gamification/flows'
import { isValidPlayerKey } from '@/gamification/service'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const player = url.searchParams.get('player')
  const path = url.searchParams.get('path') ?? '/'

  if (!isValidPlayerKey(player)) {
    return Response.json({ error: 'invalid player' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const data = await meFlow(payload, player, path)
  return Response.json(data)
}
