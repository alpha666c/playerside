/**
 * Seed illustrative Claims vs Reality data (blueprint §6) onto the three
 * published seed reviews. Values are clearly sample data — they exist so the
 * table renders every verdict state (met / partial / missed). Idempotent:
 * each run overwrites the same illustrative numbers by slug.
 *
 * `context.disableRevalidate` avoids the Next 16 invariant where
 * revalidatePath throws outside a request (same as seed-nav / seed-no-wagering).
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const payload = await getPayload({ config: configPromise })

type ClaimsSet = {
  withdrawal: { claimedHours: number; measuredHours: number }
  support: { claimedMinutes: number; measuredMinutes: number }
  kyc: { claimedDays: number; measuredDays: number }
  bonus: { claimedWager: number; measuredWager: number }
}

const CLAIMS_BY_SLUG: Record<string, ClaimsSet> = {
  'aurora-bay-casino': {
    withdrawal: { claimedHours: 24, measuredHours: 18 }, // met
    support: { claimedMinutes: 15, measuredMinutes: 22 }, // missed (1.47×)
    kyc: { claimedDays: 2, measuredDays: 1 }, // met
    bonus: { claimedWager: 35, measuredWager: 35 }, // met
  },
  'northlight-casino': {
    withdrawal: { claimedHours: 48, measuredHours: 52 }, // partial (1.08×)
    support: { claimedMinutes: 5, measuredMinutes: 9 }, // missed (1.8×)
    kyc: { claimedDays: 3, measuredDays: 3 }, // met
    bonus: { claimedWager: 40, measuredWager: 40 }, // met
  },
  'ferrous-casino': {
    withdrawal: { claimedHours: 24, measuredHours: 41 }, // missed
    support: { claimedMinutes: 10, measuredMinutes: 26 }, // missed
    kyc: { claimedDays: 2, measuredDays: 5 }, // missed
    bonus: { claimedWager: 30, measuredWager: 42 }, // missed
  },
}

const run = async () => {
  for (const [slug, claims] of Object.entries(CLAIMS_BY_SLUG)) {
    const existing = await payload.find({
      collection: 'traditional-casino-reviews',
      depth: 0,
      overrideAccess: true,
      where: { slug: { equals: slug } },
    })
    const doc = existing.docs[0]
    if (!doc) {
      payload.logger.warn(`No review with slug "${slug}" — skipped`)
      continue
    }
    await payload.update({
      id: doc.id,
      collection: 'traditional-casino-reviews',
      context: { disableRevalidate: true },
      data: { claimsVsReality: claims },
      overrideAccess: true,
    })
    payload.logger.info(`Claims seeded: ${slug}`)
  }
  payload.logger.info('Claims seed complete.')
}

await run()
process.exit(0)
