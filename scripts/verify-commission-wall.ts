/**
 * Task 6 (tasks/backlog.md, Phase 2): "Verify the commission-blind wall
 * holds — attempt to pass commission data into the grading step and confirm
 * it's structurally rejected." (ORG.md §3.2.)
 *
 * Two checks, not one — a field can be absent from the schema today and
 * still get real-world traffic if the write path is loose enough to store
 * it anyway:
 *
 * 1. Schema check: none of the review/bonus tables have any column whose
 *    name looks like a commission/deal-term field. This is the actual
 *    enforcement mechanism — a field that was never declared in the
 *    collection config has no column to land in, so there is nowhere for
 *    commission data to live even if something tried to write it.
 * 2. Write-path check: create a review with commission-shaped fields
 *    spiked into the input data (as an agent that ignored the rule might
 *    attempt), then confirm those fields are silently absent from both the
 *    returned document and the re-fetched document, and that overallScore
 *    computes identically to a control review scored the same way without
 *    the spiked fields — i.e. injecting commission data has literally zero
 *    effect on the grading output, not just "isn't displayed".
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-commission-wall.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')
const { Client } = await import('pg')

const COMMISSION_PATTERN = /commission|cpa|rev[_-]?share|deal.*rate|payout.*rate|kickback/i

const TABLES = [
  'trad_casino_reviews',
  '_trad_casino_reviews_v',
  'crypto_casino_reviews',
  '_crypto_casino_reviews_v',
  'wagering_bonuses',
  '_wagering_bonuses_v',
  'no_wagering_bonuses',
  '_no_wagering_bonuses_v',
]

const checkSchema = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const offenders: string[] = []
  for (const table of TABLES) {
    const res = await client.query(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
      [table],
    )
    for (const row of res.rows) {
      if (COMMISSION_PATTERN.test(row.column_name)) {
        offenders.push(`${table}.${row.column_name}`)
      }
    }
  }
  await client.end()
  return offenders
}

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const checks: [string, boolean][] = []

  const offenders = await checkSchema()
  checks.push(['no commission-shaped column in any review/bonus table', offenders.length === 0])
  if (offenders.length > 0) {
    payload.logger.error(`Found commission-shaped columns: ${offenders.join(', ')}`)
  }

  const baseReviewData = {
    compliance: { licenseAuthority: 'KSA' as const, licenseNumber: 'SAMPLE-WALL-TEST-0001' },
    isIllustrativeSample: true,
    markets: ['nl' as const],
    name: 'Commission Wall Test Casino',
    scores: {
      deposits: { evidence: 'test', narrative: 'test', score: 8 },
      gameVariety: { evidence: 'test', narrative: 'test', score: 8 },
      kyc: { evidence: 'test', narrative: 'test', score: 8 },
      licensing: { evidence: 'test', narrative: 'test', score: 8 },
      liveCasino: { evidence: 'test', narrative: 'test', score: 8 },
      promotions: { evidence: 'test', narrative: 'test', score: 8 },
      support: { evidence: 'test', narrative: 'test', score: 8 },
      withdrawals: { evidence: 'test', narrative: 'test', score: 8 },
      communitySentiment: { evidence: 'test', narrative: 'test', score: 8 },
    },
    slug: 'commission-wall-test-temp',
    summary: 'Temporary document created by verify-commission-wall.ts — safe to delete.',
    verdict: {
      narrative: 'test',
      whatsBad: [{ point: 'test' }],
      whatsGood: [{ point: 'test' }],
    },
  }

  // Control: score with no commission fields anywhere near the input.
  const control = await payload.create({
    collection: 'traditional-casino-reviews',
    context: { disableRevalidate: true },
    data: baseReviewData,
  })

  // Attack: identical scoring input, but with commission/deal-term fields
  // spiked into the payload — as if an agent or integration ignored §3.2
  // and tried to pass deal data through the same write path as a score.
  const spiked = await payload.create({
    collection: 'traditional-casino-reviews',
    context: { disableRevalidate: true },
    data: {
      ...baseReviewData,
      slug: 'commission-wall-test-temp-spiked',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({
        commissionRate: 45,
        cpaDealUsd: 250,
        dealRevSharePercent: 35,
        payoutRateToAffiliate: 0.4,
      } as any),
    },
  })

  const spikedKeys = Object.keys(spiked)
  const leakedKeys = spikedKeys.filter((k) => COMMISSION_PATTERN.test(k))
  checks.push(['spiked commission fields absent from create() response', leakedKeys.length === 0])

  const refetched = await payload.findByID({ id: spiked.id, collection: 'traditional-casino-reviews' })
  const refetchedKeys = Object.keys(refetched)
  const leakedOnRefetch = refetchedKeys.filter((k) => COMMISSION_PATTERN.test(k))
  checks.push(['spiked commission fields absent on re-fetch from DB', leakedOnRefetch.length === 0])

  checks.push([
    'overallScore identical whether or not commission fields were spiked in',
    control.overallScore === spiked.overallScore,
  ])

  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  await payload.delete({
    id: control.id,
    collection: 'traditional-casino-reviews',
    context: { disableRevalidate: true },
  })
  await payload.delete({
    id: spiked.id,
    collection: 'traditional-casino-reviews',
    context: { disableRevalidate: true },
  })
  payload.logger.info('Cleaned up test documents.')

  const failed = checks.filter(([, ok]) => !ok)
  if (failed.length > 0) {
    payload.logger.error('Commission-wall verification FAILED.')
    process.exit(1)
  }
  payload.logger.info('Commission-wall verification PASSED.')
  process.exit(0)
}

await run()
