/**
 * Seeds the Vex Missions "The Bonus Heist" quest — the vertical-slice mission.
 *
 * The wagering_math step computes its correct answer from the LIVE Aurora Bay
 * bonus document at submit time (35× on bonus+deposit): deposit €200 → €200
 * bonus → 35 × €400 = €14,000 required turnover. If the bonus doc ever
 * changes, the mission stays truthful automatically.
 *
 * Copy is vex-canon audited: no banned phrases, no hype-bro tone, celebrates
 * reading the clause not deposit size.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-gamification.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const BANNED = [
  'guaranteed win', 'risk-free', 'easy money', 'chase losses',
  'double down to recover', 'trust me deposit', 'get-rich', 'sure thing',
]

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  const steps = [
    {
      kind: 'quiz',
      prompt:
        'The Aurora Bay welcome bonus is a 100% match up to €200. What wagering multiplier is attached to it?',
      options: [
        { key: 'a', label: '20×' },
        { key: 'b', label: '35×' },
        { key: 'c', label: '50×' },
      ],
      correctKey: 'b',
      hint: 'The multiplier is stated in the bonus terms on the review page.',
      rgExplain:
        'The review lists a 35× wagering requirement — the exact multiplier is always in the terms, never a surprise.',
    },
    {
      kind: 'wagering_math',
      prompt:
        'You deposit €200 and receive the €200 bonus. The 35× requirement applies to bonus + deposit combined. What total turnover must you reach before any withdrawal?',
      bonusSlug: 'aurora-bay-100-match',
      depositAmount: 200,
      options: [
        { key: 'a', label: '€7,000' },
        { key: 'b', label: '€14,000' },
        { key: 'c', label: '€21,000' },
      ],
      hint: '35 × (deposit + bonus) — the combined stake is €400.',
      rgExplain:
        '35 × €400 = €14,000. A high multiplier on bonus+deposit is a steep grind — that is the trap this mission teaches you to read.',
    },
    {
      kind: 'quiz',
      prompt:
        'You are down €150 and the bonus is still active. What does the Tilt Protocol recommend?',
      options: [
        { key: 'a', label: 'Increase your stake to recover faster' },
        { key: 'b', label: 'Keep playing until the bonus clears' },
        { key: 'c', label: 'Stop, set a limit, and step away' },
      ],
      correctKey: 'c',
      hint: 'The protocol treats limits and stop rules as the smart play.',
      rgExplain:
        'Tilt is the most expensive bet on the table. Setting a limit and stepping away is the winning move — no stake increase is ever the recovery play.',
    },
  ]

  // Banned-phrase audit gate — fail the seed before any copy ships.
  const copyBlob = JSON.stringify(steps)
  const hits = BANNED.filter((p) => copyBlob.toLowerCase().includes(p))
  if (hits.length) {
    payload.logger.error(`BANNED PHRASES IN MISSION COPY: ${hits.join(', ')}`)
    process.exit(1)
  }
  payload.logger.info('Canon audit: zero banned phrases.')

  // The math step must resolve against the live bonus doc — fail fast if it can't.
  const bonus = await payload.find({
    collection: 'wagering-bonuses',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-100-match' } },
  })
  if (!bonus.docs[0]) {
    payload.logger.error('Aurora Bay bonus not found — run scripts/seed-content.ts first.')
    process.exit(1)
  }
  payload.logger.info(
    `Math source: ${bonus.docs[0].wageringMultiplier}× ${bonus.docs[0].wageringAppliesTo}`,
  )

  const existing = await payload.find({
    collection: 'quests',
    limit: 1,
    overrideAccess: false,
    where: { missionId: { equals: 'bonus_hunter' } },
  })

  const questData = {
    missionId: 'bonus_hunter',
    title: 'The Bonus Heist',
    brief:
      'Before you take a single bonus, learn to read the wagering requirement like a scout reads a map. Aurora Bay is offering 100% up to €200 — find out what it actually costs to clear, then decide whether the value holds. Terms intact, Scout.',
    rewardXp: 60,
    pageTarget: 'casino-review' as const,
    enabled: true,
    steps,
    _status: 'published' as const,
  }

  if (existing.docs[0]) {
    await payload.update({
      id: existing.docs[0].id,
      collection: 'quests',
      data: questData,
      context: { disableRevalidate: true },
    })
    payload.logger.info('Updated quest: bonus_hunter')
  } else {
    await payload.create({
      collection: 'quests',
      data: questData,
      context: { disableRevalidate: true },
    })
    payload.logger.info('Created quest: bonus_hunter')
  }

  payload.logger.info('Gamification seed complete.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
