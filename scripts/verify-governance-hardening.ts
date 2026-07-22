/**
 * Phase 2A hardening checkpoint. Verifies, via the Local API:
 *   1. agent-logs is truly immutable: create requires the internalWrite
 *      context flag (server-generated only), update/delete are always
 *      denied, and a correction is a new event referencing the original.
 *   2. Every material field on research-queue produces a case_updated
 *      audit event with before/after values and actor (agentId) data —
 *      walking a case through its full seven-stage lifecycle naturally
 *      exercises every field, since satisfying each stage's entry gate
 *      requires populating the field that gate checks.
 *   3. Every gated stage transition rejects the invalid (precondition not
 *      met) path and accepts the valid one, in order.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-governance-hardening.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const MATERIAL_FIELDS = [
  'caseNumber',
  'operatorName',
  'operatorUrl',
  'casinoType',
  'parentCompany',
  'licenseJurisdiction',
  'licenseNumber',
  'assignedReviewer',
  'deskResearchOutput',
  'handsOnResults',
  'computedScores',
  'editorialDraft',
  'integritySignOff',
  'publishedReviewId',
  'internalNotes',
  'monitorLog',
  'evidenceRegister',
  'accountProfile',
  'aiRuns',
] as const

const MINIMAL_LEXICAL = {
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'placeholder', type: 'text', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const checks: [string, boolean][] = []

  // ---------------------------------------------------------------------
  // 1. agent-logs immutability
  // ---------------------------------------------------------------------
  let directCreateRejected = false
  try {
    await payload.create({
      collection: 'agent-logs',
      data: { agentId: 'hardening-script', brand: '01-playerside', event: 'case_created', timestamp: new Date().toISOString() },
      overrideAccess: false,
    })
  } catch {
    directCreateRejected = true
  }
  checks.push(['agent-logs: create WITHOUT internalWrite context is rejected', directCreateRejected])

  const logEntry = await payload.create({
    collection: 'agent-logs',
    data: { agentId: 'hardening-script', brand: '01-playerside', event: 'case_created', timestamp: new Date().toISOString() },
    context: { internalWrite: true },
    overrideAccess: false,
  })
  checks.push(['agent-logs: create WITH internalWrite context succeeds', Boolean(logEntry.id)])

  let updateRejected = false
  try {
    await payload.update({
      id: logEntry.id,
      collection: 'agent-logs',
      context: { internalWrite: true },
      data: { event: 'qa_check' },
      overrideAccess: false,
    })
  } catch {
    updateRejected = true
  }
  checks.push(['agent-logs: update is rejected even WITH internalWrite context', updateRejected])

  let deleteRejected = false
  try {
    await payload.delete({ id: logEntry.id, collection: 'agent-logs', overrideAccess: false })
  } catch {
    deleteRejected = true
  }
  checks.push(['agent-logs: delete is rejected', deleteRejected])

  const correction = await payload.create({
    collection: 'agent-logs',
    data: {
      agentId: 'hardening-script',
      brand: '01-playerside',
      correctsEventId: String(logEntry.id),
      event: 'case_updated',
      timestamp: new Date().toISOString(),
    },
    context: { internalWrite: true },
    overrideAccess: false,
  })
  checks.push(['agent-logs: correction references the original via correctsEventId', correction.correctsEventId === String(logEntry.id)])

  // ---------------------------------------------------------------------
  // Setup for lifecycle walk
  // ---------------------------------------------------------------------
  const staleOps = await payload.find({ collection: 'operators', limit: 50, where: { slug: { in: ['hardening-op-a', 'hardening-op-b'] } } })
  for (const s of staleOps.docs) await payload.delete({ id: s.id, collection: 'operators' })
  const staleCases = await payload.find({ collection: 'research-queue', limit: 50, where: { caseNumber: { in: ['#PS-2026-S93', '#PS-2026-S94'] } } })
  for (const s of staleCases.docs) await payload.delete({ id: s.id, collection: 'research-queue' })

  const operatorA = await payload.create({ collection: 'operators', data: { name: 'Hardening Op A', slug: 'hardening-op-a' } })
  const operatorB = await payload.create({ collection: 'operators', data: { name: 'Hardening Op B', slug: 'hardening-op-b' } })
  const auroraBay = await payload.find({ collection: 'traditional-casino-reviews', limit: 1, where: { slug: { equals: 'aurora-bay-casino' } } })
  checks.push(['setup: aurora-bay-casino seed review exists (needed for publishedReviewId)', auroraBay.docs.length === 1])
  const auroraBayId = auroraBay.docs[0]?.id

  let caseFile = await payload.create({
    collection: 'research-queue',
    data: {
      caseNumber: '#PS-2026-S93',
      casinoType: 'crypto',
      operatorName: 'Hardening Verify Co',
      parentCompany: operatorA.id,
      status: 'queued',
    },
  })

  // ---------------------------------------------------------------------
  // 3. Stage gates — invalid then valid, per transition
  // ---------------------------------------------------------------------
  const update = async (data: Record<string, unknown>) => {
    caseFile = await payload.update({ id: caseFile.id, collection: 'research-queue', data })
    return caseFile
  }
  const attemptRejected = async (data: Record<string, unknown>) => {
    try {
      await payload.update({ id: caseFile.id, collection: 'research-queue', data })
      return false
    } catch {
      return true
    }
  }

  // queued -> desk-research: no extra gate.
  await update({ status: 'desk-research' })
  checks.push(['gate: queued -> desk-research succeeds (no extra precondition)', caseFile.status === 'desk-research'])

  // desk-research -> hands-on-testing: requires deskResearchOutput.
  checks.push(['gate: hands-on-testing INVALID path rejected (no deskResearchOutput)', await attemptRejected({ status: 'hands-on-testing' })])
  await update({ deskResearchOutput: { licenseNumber: { confidence: 'VERIFIED', value: 'HARDEN-0001' } } })
  await update({ status: 'hands-on-testing' })
  checks.push(['gate: hands-on-testing VALID path accepted', caseFile.status === 'hands-on-testing'])

  // hands-on-testing -> editorial: requires all 4 actuals + evidence.
  checks.push(['gate: editorial INVALID path rejected (missing actuals/evidence)', await attemptRejected({ status: 'editorial' })])
  await update({
    evidenceRegister: [
      {
        accessDate: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
        capturedBy: 'hardening-script',
        claimKey: 'withdrawalSpeed',
        claimSummary: 'Withdrawal processed within claimed window.',
        isCurrent: true,
        label: 'Withdrawal test screenshot',
        sourceType: 'hands-on-test',
        sourceUrl: 'https://example.invalid/evidence/1',
        verificationStatus: 'corroborated',
      },
    ],
    handsOnResults: {
      bonusActualWager: 500,
      kycActualDays: 1,
      supportActualMinutes: 12,
      withdrawalActualHours: 3,
    },
  })
  await update({ status: 'editorial' })
  checks.push(['gate: editorial VALID path accepted', caseFile.status === 'editorial'])

  // editorial -> integrity-check: requires editorialDraft.
  checks.push(['gate: integrity-check INVALID path rejected (no editorialDraft)', await attemptRejected({ status: 'integrity-check' })])
  await update({ editorialDraft: MINIMAL_LEXICAL })
  await update({ status: 'integrity-check' })
  checks.push(['gate: integrity-check VALID path accepted', caseFile.status === 'integrity-check'])

  // integrity-check -> published: requires integritySignOff === true.
  checks.push(['gate: published INVALID path rejected (integritySignOff false)', await attemptRejected({ status: 'published' })])
  await update({ computedScores: { overallScore: 8.1 }, integritySignOff: true })
  await update({ status: 'published' })
  checks.push(['gate: published VALID path accepted', caseFile.status === 'published'])

  // published -> monitoring: requires publishedReviewId.
  checks.push(['gate: monitoring INVALID path rejected (no publishedReviewId)', await attemptRejected({ status: 'monitoring' })])
  await update({
    monitorLog: [{ date: new Date().toISOString(), flagType: 'setup', summary: 'Hardening test monitor entry.' }],
    publishedReviewId: { relationTo: 'traditional-casino-reviews', value: auroraBayId },
  })
  await update({ status: 'monitoring' })
  checks.push(['gate: monitoring VALID path accepted', caseFile.status === 'monitoring'])

  // Touch the remaining material fields not yet exercised above.
  await update({
    accountProfile: { accountStatus: 'active', emailTestAddress: 'harden-review@example.invalid' },
    aiRuns: [{ agentRole: 'chat', runId: 'harden-run-1', status: 'complete', version: 1 }],
    assignedReviewer: 'Hardening Reviewer',
    caseNumber: '#PS-2026-S94',
    casinoType: 'traditional',
    internalNotes: MINIMAL_LEXICAL,
    licenseJurisdiction: 'Curaçao',
    licenseNumber: 'HARDEN-LIC-0001',
    operatorName: 'Hardening Verify Co (renamed)',
    operatorUrl: 'https://example.invalid',
    parentCompany: operatorB.id,
  })

  // ---------------------------------------------------------------------
  // 2. Material-field audit coverage — before/after + actor
  // ---------------------------------------------------------------------
  const auditEvents = await payload.find({
    collection: 'agent-logs',
    limit: 100,
    sort: 'createdAt',
    where: { pageId: { equals: String(caseFile.id) } },
  })

  const coveredFields = new Set<string>()
  let allEventsHaveActor = true
  let allChangesHaveBeforeAfterKeys = true
  for (const event of auditEvents.docs) {
    if (!event.agentId) allEventsHaveActor = false
    if (event.event !== 'case_updated') continue
    const changes = (event.details as { changes?: { after?: unknown; before?: unknown; field?: string }[] } | null)?.changes ?? []
    for (const change of changes) {
      if (typeof change.field === 'string') coveredFields.add(change.field)
      if (!('before' in change) || !('after' in change)) allChangesHaveBeforeAfterKeys = false
    }
  }

  for (const field of MATERIAL_FIELDS) {
    checks.push([`material-field policy: "${field}" produced a case_updated audit event`, coveredFields.has(field)])
  }
  checks.push(['material-field policy: every audit event has actor data (agentId)', allEventsHaveActor])
  checks.push(['material-field policy: every recorded change has before/after keys', allChangesHaveBeforeAfterKeys])

  const statusTransitionEvents = auditEvents.docs.filter((d) => d.event === 'status_transition')
  checks.push(['status_transition: 6 transitions logged (queued through monitoring)', statusTransitionEvents.length === 6])

  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  // Cleanup.
  for (const event of auditEvents.docs) {
    await payload.delete({ id: event.id, collection: 'agent-logs' })
  }
  await payload.delete({ id: logEntry.id, collection: 'agent-logs' })
  await payload.delete({ id: correction.id, collection: 'agent-logs' })
  await payload.delete({ id: caseFile.id, collection: 'research-queue' })
  await payload.delete({ id: operatorA.id, collection: 'operators' })
  await payload.delete({ id: operatorB.id, collection: 'operators' })
  payload.logger.info('Cleaned up hardening verification data.')

  if (failed.length > 0) {
    payload.logger.error(`Governance hardening verification FAILED (${failed.length} check(s) failed).`)
    process.exit(1)
  }
  payload.logger.info('Governance hardening verification PASSED.')
  process.exit(0)
}

await run()
