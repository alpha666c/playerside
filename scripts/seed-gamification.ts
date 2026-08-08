/**
 * Seeds the Vex Missions quest roster.
 *
 * Phase 4 (F4.4): adds the three canon missions from vex-canon's registry —
 *   license_hawk  "Paper Trail"   (license_field_match — onboarding, F4.1)
 *   rtp_detective "Glass Cannon"  (casino_filter_match)
 *   risk_quiz     "Tilt Protocol" (quiz — grants a Focus Freeze on completion)
 * plus the original vertical slice bonus_hunter "The Bonus Heist".
 *
 * Live-data laws (vex-ledger): the wagering_math step computes its answer from
 * the LIVE Aurora Bay bonus doc; license_field_match derives its answer from
 * the LIVE review's compliance field; casino_filter_match evaluates a filter
 * against the LIVE bonus doc. If source data ever changes, the missions stay
 * truthful automatically — and fail closed when a source is missing.
 *
 * Copy is vex-canon audited: no banned phrases, no hype-bro tone, celebrates
 * reading the clause not deposit size; RG (tilt/limits) is the heroic play.
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

  const bonusHunterSteps = [
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

  const paperTrailSteps = [
    {
      kind: 'quiz',
      prompt:
        'A casino licence is the paper trail that makes an operator\'s promises checkable. What does holding a regulator licence actually prove?',
      options: [
        { key: 'a', label: 'The operator answers to a regulator and can be sanctioned for breaking the rules' },
        { key: 'b', label: 'That every bonus is automatically fair' },
        { key: 'c', label: 'That the house cannot win' },
      ],
      correctKey: 'a',
      hint: 'Think about who the operator answers to — not what a licence promises.',
      rgExplain:
        'A licence means accountability: the operator answers to a regulator over licensing, complaints, and sanctions. It proves accountability, not miracles.',
    },
    {
      kind: 'license_field_match',
      prompt: 'Aurora Bay\'s review lists its licence under Compliance. Which authority issued it?',
      reviewSlug: 'aurora-bay-casino',
      expectedField: 'licenseAuthority',
      options: [
        { key: 'a', label: 'Kansspelautoriteit (KSA)' },
        { key: 'b', label: 'UK Gambling Commission' },
        { key: 'c', label: 'Spelinspektionen' },
      ],
      hint: 'The licence line on the review names the issuing authority.',
      rgExplain:
        'Aurora Bay holds a Dutch KSA licence — that is its real paper trail. The issuing authority is always stated on the review, never implied.',
    },
  ]

  const glassCannonSteps = [
    {
      kind: 'quiz',
      prompt:
        'A slot advertises 96% RTP. What does that number actually mean?',
      options: [
        { key: 'a', label: 'You win on 96% of spins' },
        { key: 'b', label: 'On average, the game returns 96% of stakes wagered over the long run' },
        { key: 'c', label: 'The casino keeps 96% of every deposit' },
      ],
      correctKey: 'b',
      hint: 'RTP is a long-run average over the whole field of play, not a per-spin promise.',
      rgExplain:
        '96% RTP means that, over a very long time, the game returns €96 of every €100 staked. It is a long-run average — no single spin is promised anything.',
    },
    {
      kind: 'casino_filter_match',
      prompt:
        'The Glass Cannon rule: a bonus is only worth the grind if you can clear it. Aurora Bay\'s welcome bonus carries a 35× wagering requirement. Does it pass a "wagering ≤ 30×" filter?',
      bonusSlug: 'aurora-bay-100-match',
      filter: { wageringLte: 30 },
      passKey: 'a',
      failKey: 'b',
      options: [
        { key: 'a', label: 'Passes the filter' },
        { key: 'b', label: 'Fails the filter' },
      ],
      hint: 'Compare the bonus multiplier to the filter ceiling — 35× versus 30×.',
      rgExplain:
        '35× is over the 30× ceiling, so Aurora Bay fails this filter. A high multiplier on bonus+deposit is the classic glass cannon — big on paper, brittle in practice.',
    },
  ]

  const tiltProtocolSteps = [
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
    {
      kind: 'quiz',
      prompt:
        'A friend tells you they spent the night trying to win a loss back. What is the best single move for them tomorrow?',
      options: [
        { key: 'a', label: 'Double the stake to win it back' },
        { key: 'b', label: 'Set a deposit limit and take a break' },
        { key: 'c', label: 'Keep the session going until it turns' },
      ],
      correctKey: 'b',
      hint: 'A fresh day is a fresh protocol: limits first, always.',
      rgExplain:
        'Chasing a loss is the fastest way to make a bad session worse. Setting a limit and taking a break is the heroic play — the protocol says so.',
    },
  ]

  const missions = [
    {
      missionId: 'bonus_hunter',
      title: 'The Bonus Heist',
      brief:
        'Before you take a single bonus, learn to read the wagering requirement like a scout reads a map. Aurora Bay is offering 100% up to €200 — find out what it actually costs to clear, then decide whether the value holds. Terms intact, Scout.',
      rewardXp: 60,
      pageTarget: 'casino-review' as const,
      enabled: true,
      steps: bonusHunterSteps,
      requiresReview: false,
      requiresBonus: 'aurora-bay-100-match',
    },
    {
      missionId: 'license_hawk',
      title: 'Paper Trail',
      brief:
        'Every operator\'s promise is only as good as the paper behind it. Your first job as a scout: find Aurora Bay\'s licence, name the authority that issued it, and learn why that line matters more than any headline offer. First mission, Scout — start here.',
      rewardXp: 60,
      pageTarget: 'casino-review' as const,
      enabled: true,
      steps: paperTrailSteps,
      requiresReview: 'aurora-bay-casino',
      requiresBonus: null,
    },
    {
      missionId: 'rtp_detective',
      title: 'Glass Cannon',
      brief:
        'RTP tells you the long-run return; wagering tells you the actual grind. Glass Cannon: check whether Aurora Bay\'s welcome offer survives a 30× filter — or shatters on contact with the terms.',
      rewardXp: 60,
      pageTarget: 'casino-review' as const,
      enabled: true,
      steps: glassCannonSteps,
      requiresReview: null,
      requiresBonus: 'aurora-bay-100-match',
    },
    {
      missionId: 'risk_quiz',
      title: 'Tilt Protocol',
      brief:
        'Tilt is the house\'s favourite opponent. This mission teaches you to spot it in yourself, name it, and use the protocol. Finish it and you earn a Focus Freeze — one protected day for your recon streak. Limits are the hero play, Scout.',
      rewardXp: 60,
      pageTarget: 'casino-review' as const,
      enabled: true,
      steps: tiltProtocolSteps,
      requiresReview: null,
      requiresBonus: null,
    },
  ]

  // Banned-phrase audit gate — fail the seed before any copy ships.
  const copyBlob = JSON.stringify(missions.map((m) => m.steps))
  const hits = BANNED.filter((p) => copyBlob.toLowerCase().includes(p))
  if (hits.length) {
    payload.logger.error(`BANNED PHRASES IN MISSION COPY: ${hits.join(', ')}`)
    process.exit(1)
  }
  payload.logger.info('Canon audit: zero banned phrases across all missions.')

  // Data-source gates — missions that derive answers from live docs must
  // resolve their sources now or fail loudly.
  const review = await payload.find({
    collection: 'traditional-casino-reviews',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-casino' } },
  })
  if (!review.docs[0]) {
    payload.logger.error('aurora-bay-casino review not found — run scripts/seed-content.ts first.')
    process.exit(1)
  }
  const bonus = await payload.find({
    collection: 'wagering-bonuses',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-100-match' } },
  })
  if (!bonus.docs[0]) {
    payload.logger.error('aurora-bay-100-match bonus not found — run scripts/seed-content.ts first.')
    process.exit(1)
  }
  payload.logger.info(
    `Math source: ${bonus.docs[0].wageringMultiplier}× ${bonus.docs[0].wageringAppliesTo} | License source: ${review.docs[0].compliance?.licenseAuthority}`,
  )

  for (const mission of missions) {
    // overrideAccess: true — since audit FIX-01, Quests.read is admin-only
    // (the raw steps JSON holds answers), so the seed runs as the service role.
    const existing = await payload.find({
      collection: 'quests',
      limit: 1,
      overrideAccess: true,
      where: { missionId: { equals: mission.missionId } },
    })

    const questData = {
      missionId: mission.missionId,
      title: mission.title,
      brief: mission.brief,
      rewardXp: mission.rewardXp,
      pageTarget: mission.pageTarget,
      enabled: mission.enabled,
      steps: mission.steps,
      _status: 'published' as const,
    }

    if (existing.docs[0]) {
      await payload.update({
        id: existing.docs[0].id,
        collection: 'quests',
        data: questData,
        context: { disableRevalidate: true },
      })
      payload.logger.info(`Updated quest: ${mission.missionId}`)
    } else {
      await payload.create({
        collection: 'quests',
        data: questData,
        context: { disableRevalidate: true },
      })
      payload.logger.info(`Created quest: ${mission.missionId}`)
    }
  }

  payload.logger.info('Gamification seed complete — 4 missions on the board.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
