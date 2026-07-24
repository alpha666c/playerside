import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { loadRoleFile, startAiRun, completeAiRun } from '@/agents/runner'
import { runDeskResearch } from '@/agents/deskResearcher'
import { logEvent } from '@/lib/logEvent'

export const maxDuration = 240

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })

  const payloadReq = await createLocalReq({ user }, payload)

  try {
    const { caseId, message, apply } = await request.json()

    const doc = await payload.findByID({
      collection: 'research-queue',
      id: caseId,
      req: payloadReq,
    })
    if (!doc) return new Response('Case not found', { status: 404 })

    const status = doc.status

    if (status === 'desk-research') {
      const { runId, deskResearchOutput, evidenceRegister } = await runDeskResearch(
        payload,
        payloadReq,
        caseId,
        apply
          ? {
              apply: true,
              expectedVersion: doc.version ?? 1,
              changedFields: ['deskResearchOutput', 'evidenceRegister'],
            }
          : undefined,
      )

      return Response.json({ runId, deskResearchOutput, evidenceRegister })
    }

    const roleMap: Record<string, 'score-analyst' | 'editorial-writer' | 'integrity-checker' | 'monitor'> = {
      editorial: 'editorial-writer',
      'integrity-check': 'integrity-checker',
      published: 'monitor',
      monitoring: 'monitor',
    }

    const agentRole = roleMap[status] ?? 'desk-researcher'
    const roleFile = await loadRoleFile(agentRole)
    const runId = await startAiRun(payload, payloadReq, caseId, agentRole)

    const assistantResponse = `Loaded role ${agentRole}. Role file length ${roleFile.length}. Received message: ${String(message ?? '').slice(0, 200)}`

    await completeAiRun(payload, payloadReq, caseId, runId, { assistantResponse })

    await logEvent(
      payload,
      {
        agentId: user.email,
        brand: '01-playerside',
        event: 'research_fetch',
        operator: doc.operatorName,
        pageId: String(doc.id),
        details: { role: agentRole },
      },
      payloadReq,
    )

    return Response.json({ runId, assistantResponse })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'review-chat error' })
    return new Response('Internal error', { status: 500 })
  }
}

