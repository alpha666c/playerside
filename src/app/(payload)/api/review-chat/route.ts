import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { runDeskResearch } from '@/agents/deskResearcher'
import { runScoreAnalyst } from '@/agents/scoreAnalyst'
import { runEditorialWriter } from '@/agents/editorialWriter'
import { runIntegrityChecker } from '@/agents/integrityChecker'
import { runMonitor } from '@/agents/monitor'

export const maxDuration = 240

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })

  const payloadReq = await createLocalReq({ user }, payload)

  try {
    const { caseId, message, apply } = await request.json()

    const doc: any = await payload.findByID({
      collection: 'research-queue',
      id: caseId,
      req: payloadReq,
    })
    if (!doc) return new Response('Case not found', { status: 404 })

    const status = doc.status
    const expectedVersion = doc.version ?? 1

    if (status === 'desk-research') {
      const res = await runDeskResearch(
        payload,
        payloadReq,
        caseId,
        apply
          ? {
              apply: true,
              expectedVersion,
              changedFields: ['deskResearchOutput', 'evidenceRegister'],
            }
          : undefined,
      )
      return Response.json(res)
    }

    if (status === 'editorial' && (!doc.computedScores || Object.keys(doc.computedScores).length === 0)) {
      const res = await runScoreAnalyst(
        payload,
        payloadReq,
        caseId,
        apply
          ? {
              apply: true,
              expectedVersion,
              changedFields: ['computedScores'],
            }
          : undefined,
      )
      return Response.json(res)
    }

    if (status === 'editorial') {
      const res = await runEditorialWriter(
        payload,
        payloadReq,
        caseId,
        apply
          ? {
              apply: true,
              expectedVersion,
              changedFields: ['editorialDraft'],
            }
          : undefined,
      )
      return Response.json(res)
    }

    if (status === 'integrity-check') {
      const res = await runIntegrityChecker(payload, payloadReq, caseId)
      return Response.json(res)
    }

    if (status === 'published' || status === 'monitoring') {
      const res = await runMonitor(
        payload,
        payloadReq,
        caseId,
        apply
          ? {
              apply: true,
              expectedVersion,
              changedFields: ['monitorLog'],
            }
          : undefined,
      )
      return Response.json(res)
    }

    return Response.json({ status, message: `No active agent for status '${status}'.` })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'review-chat error' })
    return new Response('Internal error', { status: 500 })
  }
}


