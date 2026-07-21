/**
 * Task 3 checkpoint (tasks/backlog.md, Phase 1): "A logged event round-trips
 * correctly." Writes one grade_assigned event via the logEvent() write path,
 * reads it back, and asserts the fields survive the round trip — including
 * that the beforeChange hook correctly classified it as retention:
 * 'compliance' (logging-spec.md retention section).
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-logging.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')
const { logEvent } = await import('../src/lib/logEvent')

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  const written = await logEvent(payload, {
    agentId: 'verify-logging-script',
    brand: '01-playerside',
    details: { note: 'round-trip verification, safe to delete' },
    event: 'grade_assigned',
    evidenceRef: 'verify-logging-script-evidence-ref',
    operator: 'aurora-bay-casino',
    rubricCategory: 'withdrawals',
    score: 9.6,
    siteCategory: 'traditional',
  })

  const read = await payload.findByID({ id: written.id, collection: 'agent-logs' })

  const checks: [string, boolean][] = [
    ['event persisted', read.event === 'grade_assigned'],
    ['agentId persisted', read.agentId === 'verify-logging-script'],
    ['evidenceRef persisted', read.evidenceRef === 'verify-logging-script-evidence-ref'],
    ['score persisted', read.score === 9.6],
    ['retentionClass computed to compliance', read.retentionClass === 'compliance'],
    [
      'details JSON round-tripped',
      (read.details as Record<string, unknown> | null)?.note === 'round-trip verification, safe to delete',
    ],
  ]

  const failed = checks.filter(([, ok]) => !ok)

  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  // Enforce the audit-trail requirement itself: a grade_assigned event
  // without evidenceRef must be rejected, not silently accepted.
  let rejectedMissingEvidence = false
  try {
    // Intentionally missing evidenceRef — this call is expected to throw at
    // runtime (that's what's being tested), so the literal is deliberately
    // incomplete and cast past Payload's generated create-data type.
    await payload.create({
      collection: 'agent-logs',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        agentId: 'verify-logging-script',
        brand: '01-playerside',
        event: 'grade_assigned',
      } as any,
    })
  } catch {
    rejectedMissingEvidence = true
  }
  payload.logger.info(
    `${rejectedMissingEvidence ? 'PASS' : 'FAIL'} — grade_assigned without evidenceRef is rejected`,
  )

  await payload.delete({ id: written.id, collection: 'agent-logs' })
  payload.logger.info('Cleaned up verification log entry.')

  if (failed.length > 0 || !rejectedMissingEvidence) {
    payload.logger.error('Logging round-trip verification FAILED.')
    process.exit(1)
  }
  payload.logger.info('Logging round-trip verification PASSED.')
  process.exit(0)
}

await run()
