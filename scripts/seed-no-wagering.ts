/**
 * One-off dev seed (Phase 2 F2.2): create a single ILLUSTRATIVE no-wagering
 * bonus tied to the aurora-bay review so the /bonuses/no-wagering hub renders
 * real cards during the review-pipeline backlog. Marked isIllustrativeSample
 * so it renders the "illustrative sample, not a real offer" banner — it is a
 * demonstration case, never a live offer.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-no-wagering.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  const operator = await payload.find({
    collection: 'traditional-casino-reviews',
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: 'aurora-bay-casino' } },
    select: { id: true, name: true },
  })
  const op = operator.docs[0]
  if (!op) {
    payload.logger.error('aurora-bay-casino not found — run the main seed first.')
    process.exit(1)
  }

  const existing = await payload.find({
    collection: 'no-wagering-bonuses',
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: 'aurora-bay-wager-free-welcome' } },
  })
  if (existing.docs.length > 0) {
    payload.logger.info('Sample no-wagering bonus already present — skipping.')
    process.exit(0)
  }

  await payload.create({
    collection: 'no-wagering-bonuses',
    data: {
      title: 'Wager-free welcome offer',
      slug: 'aurora-bay-wager-free-welcome',
      operator: op.id,
      summary:
        'Illustrative sample: a no-deposit offer with no wagering requirement — but the withdrawal conditions are still exact.',
      eligibility: 'New players only, 18+. One per household. NL/SE/DE/UK residents only.',
      expiry: '7 days from activation',
      maxWithdrawal: '€50',
      bonusAmount: '€10 no-deposit',
      withdrawalConditions:
        'No wagering requirement. Withdrawable after identity verification (KYC). Minimum first deposit of €10 is required to unlock the withdrawal method.',
      isIllustrativeSample: true,
      _status: 'published',
    },
    overrideAccess: true,
    // Matches seed-nav.ts — revalidatePath throws outside a Next request
    // context (static generation store missing), so skip the hook revalidation.
    context: { disableRevalidate: true },
  })

  payload.logger.info('Created illustrative no-wagering sample bonus (aurora-bay-wager-free-welcome).')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
