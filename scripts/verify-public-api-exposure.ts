/**
 * Phase 2A governance requirement: "Public API must not expose internal
 * notes, account metadata, evidence, audit events, chat history, or
 * unapproved drafts." Verifies the REAL access-control rules a non-admin
 * request hits — via `overrideAccess: false` with no `user`, the same gate
 * Payload's REST/GraphQL API applies to an anonymous request — rather than
 * just inspecting collection config.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-public-api-exposure.ts
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

  const anonFindIsEmpty = async (collection: 'research-queue' | 'operators' | 'agent-logs') => {
    try {
      const result = await payload.find({ collection, overrideAccess: false })
      return result.docs.length === 0
    } catch {
      return true // access denied outright also satisfies "not exposed"
    }
  }

  checks.push(['research-queue: anonymous find returns nothing', await anonFindIsEmpty('research-queue')])
  checks.push(['operators: anonymous find returns nothing', await anonFindIsEmpty('operators')])
  checks.push(['agent-logs: anonymous find returns nothing', await anonFindIsEmpty('agent-logs')])

  // Control: an existing published review must still be visible anonymously —
  // proves the denial above is real access control, not e.g. an empty DB.
  const anonPublished = await payload.find({
    collection: 'traditional-casino-reviews',
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-casino' } },
  })
  checks.push(['control: published review IS visible anonymously', anonPublished.docs.length === 1])

  // Draft-exclusion: create a temporary draft review, confirm it does NOT
  // appear in an anonymous query even though a matching published one does.
  const draft = await payload.create({
    collection: 'traditional-casino-reviews',
    context: { disableRevalidate: true },
    data: {
      compliance: { licenseAuthority: 'KSA', licenseNumber: 'DRAFT-TEST-0000' },
      markets: ['nl'],
      name: 'Verify Draft Exposure Co',
      summary: 'Temporary draft for public-API exposure verification — safe to delete.',
      verdict: {
        narrative: 'n/a',
        whatsBad: [{ point: 'n/a' }],
        whatsGood: [{ point: 'n/a' }],
      },
    },
    draft: true,
  })

  const anonDraftQuery = await payload.find({
    collection: 'traditional-casino-reviews',
    overrideAccess: false,
    where: { id: { equals: draft.id } },
  })
  checks.push(['unapproved draft review is NOT visible anonymously', anonDraftQuery.docs.length === 0])

  let anonDraftByIdRejected = false
  try {
    await payload.findByID({ id: draft.id, collection: 'traditional-casino-reviews', overrideAccess: false })
  } catch {
    anonDraftByIdRejected = true
  }
  checks.push(['unapproved draft review by-ID lookup is rejected anonymously', anonDraftByIdRejected])

  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  await payload.delete({ collection: 'traditional-casino-reviews', context: { disableRevalidate: true }, id: draft.id })
  payload.logger.info('Cleaned up verification draft review.')

  if (failed.length > 0) {
    payload.logger.error(`Public API exposure verification FAILED (${failed.length} check(s) failed).`)
    process.exit(1)
  }
  payload.logger.info('Public API exposure verification PASSED.')
  process.exit(0)
}

await run()
