import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()

    const { user } = await payload.auth({ headers: requestHeaders })
    if (!user) {
      return new Response('Action forbidden.', { status: 403 })
    }

    const payloadReq = await createLocalReq({ user }, payload)

    const result = await payload.find({
      collection: 'agent-logs',
      limit: 50,
      overrideAccess: false,
      req: payloadReq,
      sort: '-timestamp',
    })

    return Response.json({ logs: result.docs })
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Internal error' }, { status: 500 })
  }
}
