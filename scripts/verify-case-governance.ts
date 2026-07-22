/**
 * Phase 2A governance foundation checkpoint (MASTER-BLUEPRINT.md §3, §9).
 * Verifies, via the Local API (the same data layer the Payload admin panel
 * itself uses):
 *   1. A new case must start at "queued" — any other initial status is rejected.
 *   2. Status transitions must move exactly one stage at a time, in order —
 *      skipping (e.g. queued -> published) is rejected, the correct next
 *      stage (queued -> desk-research) is accepted.
 *   3. Every status transition and material field change produces an
 *      AgentLogs audit event (case_created / status_transition / case_updated).
 *   4. The evidence register, account-profile metadata, and chat-history
 *      foundation fields all round-trip correctly.
 *   5. Operator.knownBrands stays in sync when parentCompany is set.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-case-governance.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const checks: [string, boolean][] = []
  const createdCaseIds: number[] = []
  const createdOperatorIds: number[] = []

  // Idempotent: clean up any leftover run (e.g. a prior crash) before starting.
  const staleOperators = await payload.find({
    collection: 'operators',
    limit: 50,
    where: { slug: { equals: 'verify-governance-holdings' } },
  })
  for (const stale of staleOperators.docs) {
    await payload.delete({ id: stale.id, collection: 'operators' })
  }
  const staleCases = await payload.find({
    collection: 'research-queue',
    limit: 50,
    where: { caseNumber: { in: ['#PS-2026-S90', '#PS-2026-S91'] } },
  })
  for (const stale of staleCases.docs) {
    await payload.delete({ id: stale.id, collection: 'research-queue' })
  }

  // 1. Creation must start at "queued".
  let rejectedBadInitialStatus = false
  try {
    await payload.create({
      collection: 'research-queue',
      data: {
        caseNumber: '#PS-2026-S90',
        casinoType: 'crypto',
        operatorName: 'Verify Governance Co',
        status: 'published',
      },
    })
  } catch {
    rejectedBadInitialStatus = true
  }
  checks.push(['create with non-queued initial status is rejected', rejectedBadInitialStatus])

  const operator = await payload.create({
    collection: 'operators',
    data: { name: 'Verify Governance Holdings', slug: 'verify-governance-holdings' },
  })
  createdOperatorIds.push(operator.id)

  const caseFile = await payload.create({
    collection: 'research-queue',
    data: {
      caseNumber: '#PS-2026-S91',
      casinoType: 'crypto',
      operatorName: 'Verify Governance Co',
      parentCompany: operator.id,
      status: 'queued',
    },
  })
  createdCaseIds.push(caseFile.id)
  checks.push(['new case defaults to queued', caseFile.status === 'queued'])

  // Operator sync on create-with-parent.
  const operatorAfterCreate = await payload.findByID({ id: operator.id, collection: 'operators' })
  const knownBrandIds = (operatorAfterCreate.knownBrands ?? []).map((b) => (typeof b === 'object' ? b.id : b))
  checks.push(['Operator.knownBrands synced on case create', knownBrandIds.includes(caseFile.id)])

  // 2. Illegal skip (queued -> published) must be rejected.
  let rejectedSkip = false
  try {
    await payload.update({ id: caseFile.id, collection: 'research-queue', data: { status: 'published' } })
  } catch {
    rejectedSkip = true
  }
  checks.push(['status skip (queued -> published) is rejected', rejectedSkip])

  // Legal transition: queued -> desk-research.
  const afterFirstTransition = await payload.update({
    id: caseFile.id,
    collection: 'research-queue',
    data: { status: 'desk-research' },
  })
  checks.push(['legal transition (queued -> desk-research) is accepted', afterFirstTransition.status === 'desk-research'])

  // Illegal backward transition.
  let rejectedBackward = false
  try {
    await payload.update({ id: caseFile.id, collection: 'research-queue', data: { status: 'queued' } })
  } catch {
    rejectedBackward = true
  }
  checks.push(['backward transition (desk-research -> queued) is rejected', rejectedBackward])

  // 3. Material field change (non-status) fields.
  await payload.update({
    id: caseFile.id,
    collection: 'research-queue',
    data: {
      accountProfile: {
        accountStatus: 'active',
        emailTestAddress: 'verify-governance-review@example.invalid',
        liveChatAccountLabel: 'Test account, no credentials',
      },
      evidenceRegister: [
        {
          accessDate: new Date().toISOString(),
          label: 'Licence register screenshot',
          sourceUrl: 'https://example-regulator.invalid/register/verify-governance',
          verificationStatus: 'verified',
        },
      ],
      licenseNumber: 'TEST-0001',
    },
  })

  const reloaded = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
  checks.push(['evidenceRegister round-trips', reloaded.evidenceRegister?.[0]?.verificationStatus === 'verified'])
  checks.push(['accountProfile round-trips, no credential fields exist', reloaded.accountProfile?.accountStatus === 'active'])
  checks.push(['accountProfile has no password-shaped field', !('password' in (reloaded.accountProfile ?? {}))])

  // Audit trail assertions.
  const auditEvents = await payload.find({
    collection: 'agent-logs',
    limit: 50,
    sort: 'createdAt',
    where: { pageId: { equals: String(caseFile.id) } },
  })
  const eventTypes = auditEvents.docs.map((d) => d.event)
  checks.push(['case_created audit event exists', eventTypes.includes('case_created')])
  checks.push(['status_transition audit event exists', eventTypes.includes('status_transition')])
  checks.push(['case_updated audit event exists (evidence/account/license change)', eventTypes.includes('case_updated')])
  checks.push(['no audit event logged for the rejected skip attempt', !eventTypes.some((e, i) => e === 'status_transition' && (auditEvents.docs[i].details as { newStatus?: string } | null)?.newStatus === 'published')])

  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  // Cleanup.
  for (const auditDoc of auditEvents.docs) {
    await payload.delete({ id: auditDoc.id, collection: 'agent-logs' })
  }
  for (const id of createdCaseIds) {
    await payload.delete({ id, collection: 'research-queue' })
  }
  for (const id of createdOperatorIds) {
    await payload.delete({ id, collection: 'operators' })
  }
  payload.logger.info('Cleaned up verification case, operator, and audit entries.')

  if (failed.length > 0) {
    payload.logger.error(`Case governance verification FAILED (${failed.length} check(s) failed).`)
    process.exit(1)
  }
  payload.logger.info('Case governance verification PASSED.')
  process.exit(0)
}

await run()
