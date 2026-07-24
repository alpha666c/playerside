import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TeamDashboardClient } from '@/components/dashboard/TeamDashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const payload = await getPayload({ config })

  const casesRes = await payload.find({
    collection: 'research-queue',
    limit: 100,
    sort: '-updatedAt',
  })

  const logsRes = await payload.find({
    collection: 'agent-logs',
    limit: 50,
    sort: '-timestamp',
  })

  const cases = (casesRes.docs || []).map((doc: any) => ({
    id: doc.id,
    caseNumber: doc.caseNumber,
    operatorName: doc.operatorName,
    operatorUrl: doc.operatorUrl,
    casinoType: doc.casinoType,
    status: doc.status,
    version: doc.version,
    licenseJurisdiction: doc.licenseJurisdiction,
    licenseNumber: doc.licenseNumber,
    parentCompany: doc.parentCompany,
    deskResearchOutput: doc.deskResearchOutput,
    evidenceRegister: doc.evidenceRegister,
    computedScores: doc.computedScores,
    aiRuns: doc.aiRuns,
    updatedAt: doc.updatedAt,
  }))

  const logs = (logsRes.docs || []).map((doc: any) => ({
    id: doc.id,
    event: doc.event,
    agentId: doc.agentId,
    operator: doc.operator,
    pageId: doc.pageId,
    details: doc.details,
    timestamp: doc.timestamp,
  }))

  return <TeamDashboardClient initialCases={cases as any} initialLogs={logs as any} />
}
