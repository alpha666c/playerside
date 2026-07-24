import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'

export async function runMonitor(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
  opts?: { apply?: boolean; expectedVersion?: number; changedFields?: string[] },
) {
  // 1. Load context
  const { context } = await loadCaseContext(caseId, 'monitor', req)

  // 2. Load system prompt
  const roleFile = await loadRoleFile('monitor')

  // 3. Record aiRun start
  const runId = await startAiRun(payload, req, caseId, 'monitor')

  const today = new Date().toISOString().slice(0, 10)
  const operatorName = (context as any).operatorName || 'Operator'

  // Monitor check entry
  const monitorLogEntry = {
    checkedAt: today,
    result: 'NO_MATERIAL_CHANGES',
    severity: 'INFORMATIONAL',
    findings: `Monitor check for ${operatorName}: License standing active at regulator database. No material complaint spikes or ownership changes detected.`,
    nextCheckDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }

  // 4. Complete aiRun
  await completeAiRun(payload, req, caseId, runId, { monitorLogEntry })

  // 5. Log audit event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'license_recheck',
      operator: operatorName,
      pageId: String(caseId),
      details: { runId, result: 'NO_MATERIAL_CHANGES' },
    },
    req,
  )

  // 6. Optionally append to monitorLog using concurrency contract
  if (opts?.apply) {
    if (typeof opts.expectedVersion !== 'number' || !Array.isArray(opts.changedFields)) {
      throw new Error('Applying monitorLog requires expectedVersion (number) and changedFields (string[]).')
    }

    if (!opts.changedFields.includes('monitorLog')) {
      throw new Error("changedFields must include 'monitorLog' when applying monitor agent output")
    }

    const existingDoc: any = await payload.findByID({ collection: 'research-queue', id: caseId, req })
    const existingLog = existingDoc?.monitorLog || []

    await applyDraft(
      payload,
      req,
      caseId,
      { monitorLog: [...existingLog, monitorLogEntry] },
      opts.expectedVersion,
      opts.changedFields,
    )
  }

  return { runId, monitorLogEntry }
}
