import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'
import { runAgentLlm } from '@/agents/llmBridge'

/**
 * Phase G (G.5) — Monitor rewired onto the real model call (spec §5).
 *
 * Honesty pin (spec §0/§6.1): the agent has no registry/live-lobby access, so
 * it can never claim a license standing or complaint spike as fact. The old
 * placeholder asserted "License standing active at regulator database" — a
 * fabricated status. G.5 replaces that with `CHECK_SCHEDULED`: the model
 * produces the monitoring brief (what to watch, grounded in the case context)
 * and the human runs the live check and records the outcome. Decision logged
 * in DECISION-LOG.
 */

/**
 * Build the monitor entry: model prose for the brief, deterministic envelope.
 * Pure + exported for unit tests.
 */
export const buildMonitorEntry = (
  context: Record<string, unknown>,
  parsed: Record<string, unknown> | null,
  now = new Date(),
): Record<string, unknown> => {
  const today = now.toISOString().slice(0, 10)
  const nextCheckDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const operatorName = String(context.operatorName ?? 'Operator')
  const findings =
    parsed && typeof parsed.findings === 'string' && parsed.findings.trim().length > 0
      ? parsed.findings.trim()
      : `Monitor brief for ${operatorName} — verify license standing at the regulator database, complaint patterns and ownership changes before recording a status.`
  const watchList = Array.isArray(parsed?.watchList)
    ? parsed.watchList.filter((w): w is string => typeof w === 'string' && w.trim().length > 0).slice(0, 8)
    : []
  return {
    checkedAt: today,
    result: 'CHECK_SCHEDULED',
    severity: 'INFORMATIONAL',
    findings,
    ...(watchList.length > 0 ? { watchList } : {}),
    nextCheckDate,
  }
}

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

  // 4. Model pass: the monitoring brief (never a live status claim)
  const task = [
    'The operator in the context was published and is in the monitoring stage.',
    'Return a strict JSON object:',
    '{ "findings": "a short paragraph on what to watch for this operator — license',
    'standing, complaint patterns, ownership changes, bonus-term drift — grounded',
    'only in the case context", "watchList": ["specific checks to run"] }.',
    'RULES: never claim a registry status, complaint spike or ownership change as',
    'fact — you have no live access. Describe what to check and why, from the',
    'context. If the context gives you nothing specific, say so.',
    'Return ONLY the JSON object.',
  ].join('\n')

  let parsed: Record<string, unknown> | null = null
  let fallbackReason: string | null = null
  try {
    const res = await runAgentLlm(payload, req, {
      agentRole: 'monitor',
      roleFile,
      context,
      task,
      maxTokens: 1000,
    })
    parsed = res.parsed
    if (res.fallback) fallbackReason = 'Model reply was not parseable JSON — skeleton brief used.'
  } catch (err) {
    fallbackReason = 'Model call failed — skeleton brief used.'
    payload.logger.error({ err, message: 'monitor model call failed — using skeleton brief', caseId, runId })
  }

  const monitorLogEntry = buildMonitorEntry(context, parsed)

  // 5. Complete aiRun (marked when the model never ran)
  await completeAiRun(
    payload,
    req,
    caseId,
    runId,
    {
      monitorLogEntry,
      ...(fallbackReason ? { _fallback: true, _fallbackReason: fallbackReason } : {}),
    },
    fallbackReason ? 'complete-with-warning' : 'complete',
  )

  // 6. Log audit event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'license_recheck',
      operator: String(context.operatorName ?? 'Operator'),
      pageId: String(caseId),
      details: { runId, result: 'CHECK_SCHEDULED' },
    },
    req,
  )

  // 7. Optionally append to monitorLog using concurrency contract
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
