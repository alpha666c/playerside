import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

/**
 * Phase 5 — read-only gamification roster data for the admin views.
 * Same auth pattern as /api/dashboard/cases: admin session required, then a
 * local request bound to that user (so collection access controls still
 * apply — every collection queried here is `read: authenticated`).
 */
export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()

    const { user } = await payload.auth({ headers: requestHeaders })
    if (!user) {
      return new Response('Action forbidden.', { status: 403 })
    }

    const payloadReq = await createLocalReq({ user }, payload)

    const [quests, profiles, xpEvents, userQuests] = await Promise.all([
      payload.find({
        collection: 'quests',
        limit: 100,
        overrideAccess: false,
        req: payloadReq,
        sort: 'missionId',
      }),
      payload.find({
        collection: 'gamification-profiles',
        limit: 50,
        overrideAccess: false,
        req: payloadReq,
        sort: '-totalXp',
      }),
      payload.find({
        collection: 'xp-events',
        depth: 1,
        limit: 25,
        overrideAccess: false,
        req: payloadReq,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'user-quests',
        depth: 1,
        limit: 100,
        overrideAccess: false,
        req: payloadReq,
        sort: '-updatedAt',
      }),
    ])

    return Response.json({
      quests: quests.docs,
      profiles: profiles.docs,
      xpEvents: xpEvents.docs,
      userQuests: userQuests.docs,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
