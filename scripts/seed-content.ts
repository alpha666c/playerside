/**
 * Seeds Phase A content: three illustrative Traditional Casino reviews
 * (matching the homepage's existing sample operators — Aurora Bay,
 * Northlight, Ferrous), two illustrative bonus pages linked to Aurora Bay,
 * and updates the homepage's bottom CTA + header/footer nav to point at the
 * real pages this unlocks. Every seeded review/bonus is flagged
 * `isIllustrativeSample: true` and published so the full compliance +
 * design machinery is visible on the live site (no real operator data, no
 * real commission data — nothing here or anywhere in this codebase touches
 * §3.2-restricted information).
 *
 * Category scores match grading-rubric.md v2 [LOCKED 2026-07-21] — 8
 * categories, Community sentiment removed from scoring and carried as
 * `communitySentimentNote` (qualitative, display-only) instead.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-content.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const navItems = [
  { link: { type: 'custom' as const, label: 'How we grade', url: '/#method' } },
  { link: { type: 'custom' as const, label: 'The wall', url: '/#wall' } },
  { link: { type: 'custom' as const, label: 'Casino reviews', url: '/casinos' } },
  { link: { type: 'custom' as const, label: 'Crypto reviews', url: '/crypto-casinos' } },
  { link: { type: 'custom' as const, label: 'Bonuses', url: '/bonuses' } },
]

const auroraBay = {
  name: 'Aurora Bay Casino',
  slug: 'aurora-bay-casino',
  markets: ['nl'],
  compliance: { licenseNumber: 'SAMPLE-KSA-0000001', licenseAuthority: 'KSA' as const },
  summary:
    'The strongest all-round Traditional Casino operator we cover, built on genuinely fast payouts and a clean license record — with live casino variety as the one category that keeps it out of the 9s across the board.',
  scores: {
    withdrawals: {
      score: 9.6,
      evidence: 'Test-account withdrawal completed in 6h 11m against a stated 24h window, 07 Jul 2026.',
      narrative:
        'Consistently the fastest payout of any operator we’ve tested here, and it wasn’t a one-off — three separate test withdrawals all cleared in under seven hours. No hidden cap we could find.',
    },
    promotions: {
      score: 9.0,
      evidence: 'Bonus T&Cs page cross-checked line-by-line against the account dashboard, 05 Jul 2026.',
      narrative:
        'Terms are stated in full on the T&Cs page itself, not buried in a linked PDF — exactly the bar this category exists to enforce. Loses a point only because the wagering-contribution table for live casino games is easy to miss on mobile.',
    },
    support: {
      score: 8.8,
      evidence: 'Live chat: first response in 41 seconds across 3 test contacts, 06 Jul 2026.',
      narrative:
        'Live chat is genuinely fast and the agents actually knew the product. Email support lagged — one test ticket took 14 hours for a first reply, which is the gap between "excellent" and "very good" here.',
    },
    licensing: {
      score: 9.8,
      evidence: 'KSA public register lookup, license current, zero sanctions on record, 07 Jul 2026.',
      narrative:
        'Clean record on the Dutch regulator’s own register, no history of enforcement action. About as close to a non-issue as this category gets.',
    },
    kyc: {
      score: 9.2,
      evidence: 'Test-account KYC approved in 18 minutes with one document upload, 06 Jul 2026.',
      narrative:
        'Asked for exactly what it needed upfront and nothing more — a single ID document cleared verification. No surprise second request after a deposit, which is the pattern that trips up other operators.',
    },
    gameVariety: {
      score: 8.7,
      evidence: 'Lobby audit: 2,400+ titles across 19 providers, RTP published on 71% of slots, 05 Jul 2026.',
      narrative:
        'Wide provider spread and most slots publish their RTP directly in-game, which most operators still don’t bother with. A genuine strength, just not quite the deepest catalogue we’ve seen.',
    },
    liveCasino: {
      score: 7.9,
      evidence: 'Direct observation: 6 live tables, 2 dealer languages, one 40-minute outage logged 04 Jul 2026.',
      narrative:
        'This is the honest weak spot. Six tables is thin next to competitors running twenty-plus, and we caught a live blackjack table down for 40 minutes during a test session with no visible status notice.',
    },
    deposits: {
      score: 9.3,
      evidence: 'Test deposit via iDEAL settled instantly, no fee charged, 06 Jul 2026.',
      narrative:
        'Instant, free, and the method Dutch players actually use by default. Nothing to fault here.',
    },
  },
  communitySentimentNote:
    'Trustpilot (412 reviews, 4.4/5) and two independent forums, sampled 07 Jul 2026, fake-review-discounted: sentiment is strong and consistent across sources, with complaints clustering almost entirely around live-casino uptime — which matches what we independently observed, not a red flag on its own. Context only — not counted toward the score.',
  verdict: {
    whatsGood: [
      { point: 'Fastest verified withdrawals of any operator in this index' },
      { point: 'Clean KSA license record with no sanctions history' },
      { point: 'Bonus terms are actually readable, not buried in a PDF' },
    ],
    whatsBad: [
      { point: 'Live casino lobby is thin (6 tables) next to category leaders' },
      { point: 'We logged a 40-minute live-table outage during testing with no status notice' },
      { point: 'Email support response time lags well behind live chat' },
    ],
    narrative:
      'If withdrawal speed and licensing cleanliness are what you’re optimizing for, this is the strongest operator we cover in the Netherlands. The live casino product is the one place it’s a step behind operators that treat live dealer tables as a first-class product rather than an add-on.',
  },
}

const northlight = {
  name: 'Northlight Casino',
  slug: 'northlight-casino',
  markets: ['uk'],
  compliance: { licenseNumber: 'SAMPLE-UKGC-0000002', licenseAuthority: 'UKGC' as const },
  summary:
    'The most transparent bonus terms and the smoothest KYC process we tested this round — undercut by support response times that fall well short of what the rest of the product promises.',
  scores: {
    withdrawals: {
      score: 8.5,
      evidence: 'Test withdrawal completed in 11h 40m against a stated 24-48h window, 08 Jul 2026.',
      narrative:
        'Comfortably inside its own stated window, though not the fastest we’ve tested. A £2,000 weekly cap is clearly disclosed rather than discovered after the fact, which matters more than the raw speed.',
    },
    promotions: {
      score: 9.6,
      evidence: 'Bonus T&Cs cross-checked against live account, 12 Jul 2026.',
      narrative:
        'The best bonus-transparency page in this index: exact multiplier, exact per-game contribution table, exact expiry, all on one page with no follow-up support ticket required to understand any of it.',
    },
    support: {
      score: 7.6,
      evidence: 'Live chat first response averaged 4m 50s across 3 contacts; one email ticket took 19 hours, 09 Jul 2026.',
      narrative:
        'This is the honest weak point. Chat response is acceptable but not fast, and email support was slow enough on one test that it would frustrate a player with a time-sensitive withdrawal question.',
    },
    licensing: {
      score: 9.2,
      evidence: 'UKGC public register lookup, license current, no active enforcement notices, 08 Jul 2026.',
      narrative:
        'Clean current standing with the regulator. No findings worth flagging.',
    },
    kyc: {
      score: 9.3,
      evidence: 'Test-account KYC approved in 22 minutes, documents specified upfront in the signup flow, 08 Jul 2026.',
      narrative:
        'Tells you exactly what’s required before you start, which is rarer than it should be. Verification cleared well inside our test window with no surprise re-requests.',
    },
    gameVariety: {
      score: 7.8,
      evidence: 'Lobby audit: 1,650 titles across 14 providers, 08 Jul 2026.',
      narrative:
        'A perfectly respectable catalogue, but noticeably smaller than the market leaders we’ve tested, with a couple of major slot providers absent entirely.',
    },
    liveCasino: {
      score: 8.4,
      evidence: 'Direct observation: 11 live tables, 3 dealer languages, no outages across a 3-session window, 09 Jul 2026.',
      narrative:
        'Solid table count and multilingual dealers, with stable uptime across everything we watched. A genuine strength.',
    },
    deposits: {
      score: 8.6,
      evidence: 'Test deposit via debit card settled instantly, no fee, 08 Jul 2026.',
      narrative:
        'Fast and fee-free for the standard UK deposit method. Nothing unusual to report either way.',
    },
  },
  communitySentimentNote:
    'Trustpilot (298 reviews, 4.2/5), sampled 09 Jul 2026, fake-review-discounted: generally positive, with recurring complaints specifically about support wait times — again, consistent with what we found directly rather than a surprise. Context only — not counted toward the score.',
  verdict: {
    whatsGood: [
      { point: 'The clearest bonus terms page we’ve tested — nothing left implicit' },
      { point: 'KYC tells you the requirements upfront and clears fast' },
      { point: 'Stable, multilingual live casino with no observed downtime' },
    ],
    whatsBad: [
      { point: 'Email support took 19 hours to answer a test ticket' },
      { point: 'Game catalogue is smaller than the category leaders' },
      { point: 'Withdrawal cap of £2,000/week will matter to higher-stakes players' },
    ],
    narrative:
      'If you actually read bonus terms before opting in, this is the operator that rewards that habit the most. Just don’t expect a fast answer if something goes wrong outside live chat hours.',
  },
}

const ferrous = {
  name: 'Ferrous Casino',
  slug: 'ferrous-casino',
  markets: ['se'],
  compliance: { licenseNumber: 'SAMPLE-SPELINSP-0000003', licenseAuthority: 'Spelinspektionen' as const },
  summary:
    'A licensed, functional operator with a genuinely strong game catalogue — dragged down by the slowest support and the least transparent bonus terms of any operator we’ve reviewed so far.',
  scores: {
    withdrawals: {
      score: 6.8,
      evidence: 'Test withdrawal took 3 days 4 hours against a stated "1-3 business days" window, 09 Jul 2026.',
      narrative:
        'Technically inside its own stated range if you count generously, but it ran over on our test and the operator offered no proactive update — we had to check the status ourselves.',
    },
    promotions: {
      score: 6.5,
      evidence: 'Bonus T&Cs page audited 08 Jul 2026 — per-game contribution rates not listed, required a support ticket to confirm.',
      narrative:
        'This is the category this operator needs to fix most. The headline multiplier is stated, but which games count toward it — and at what rate — isn’t published anywhere on the site. We had to ask support directly, and got two different answers from two different agents.',
    },
    support: {
      score: 6.2,
      evidence: 'Support response time logged across 3 contacts: 6h 40m average, one contact unanswered after 24h, 09 Jul 2026.',
      narrative:
        'The weakest support performance we’ve logged in this category. One of our three test contacts went unanswered for over 24 hours, and the two that did respond gave inconsistent information on the same question.',
    },
    licensing: {
      score: 8.5,
      evidence: 'Spelinspektionen public register lookup, license current, no active sanctions, 09 Jul 2026.',
      narrative:
        'Regulatory standing itself is clean — this operator’s problems are operational, not legal.',
    },
    kyc: {
      score: 7.9,
      evidence: 'Test-account KYC approved in 3h 20m, two rounds of document requests, 08 Jul 2026.',
      narrative:
        'Got there in the end, but needed a second document request after the first submission — a step most competitors in this index avoided by specifying requirements upfront.',
    },
    gameVariety: {
      score: 8.6,
      evidence: 'Lobby audit: 2,900+ titles across 22 providers, 08 Jul 2026.',
      narrative:
        'The largest, most diverse catalogue of the three operators we’ve reviewed so far. This is a genuine, unambiguous strength worth crediting even though the rest of the product lags.',
    },
    liveCasino: {
      score: 7.5,
      evidence: 'Direct observation: 8 live tables, 2 dealer languages, no outages across a 2-session window, 09 Jul 2026.',
      narrative:
        'A reasonably solid, unremarkable live offering. Nothing wrong with it, nothing that stands out either.',
    },
    deposits: {
      score: 8.0,
      evidence: 'Test deposit via Swish settled instantly, no fee, 08 Jul 2026.',
      narrative:
        'Standard and reliable for the Swedish market’s default payment method.',
    },
  },
  communitySentimentNote:
    'Trustpilot (156 reviews, 3.6/5), sampled 09 Jul 2026, fake-review-discounted: meaningfully lower than the other two operators we cover, with recurring, specific complaints about slow withdrawals and inconsistent support answers — matching our own test results closely enough that we don’t discount it as noise. Context only — not counted toward the score.',
  verdict: {
    whatsGood: [
      { point: 'The largest, most varied game catalogue we’ve reviewed in this category' },
      { point: 'Clean, current Spelinspektionen license standing' },
      { point: 'Instant, fee-free Swish deposits' },
    ],
    whatsBad: [
      { point: 'Bonus wagering contribution rates aren’t published — support gave us conflicting answers' },
      { point: 'One of three test support contacts went unanswered for over 24 hours' },
      { point: 'Withdrawal ran past its own stated window with no proactive status update' },
    ],
    narrative:
      'The game library alone would put this operator ahead of the other two we cover. Everything downstream of actually needing help — support, bonus clarity, withdrawal communication — is where it falls behind, and that gap is large enough to matter for anyone who isn’t purely optimizing for catalogue size.',
  },
}

const operators = [auroraBay, northlight, ferrous]

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  const createdIds: Record<string, number> = {}

  for (const op of operators) {
    const existing = await payload.find({
      collection: 'traditional-casino-reviews',
      limit: 1,
      overrideAccess: false,
      where: { slug: { equals: op.slug } },
    })

    const data = {
      name: op.name,
      slug: op.slug,
      markets: op.markets as ('nl' | 'se' | 'de' | 'uk')[],
      compliance: op.compliance,
      summary: op.summary,
      scores: op.scores,
      communitySentimentNote: op.communitySentimentNote,
      verdict: op.verdict,
      isIllustrativeSample: true,
      _status: 'published' as const,
    }

    if (existing.docs[0]) {
      const doc = await payload.update({
        id: existing.docs[0].id,
        collection: 'traditional-casino-reviews',
        data,
        context: { disableRevalidate: true },
      })
      createdIds[op.slug] = doc.id
      payload.logger.info(`Updated review: ${op.name}`)
    } else {
      const doc = await payload.create({
        collection: 'traditional-casino-reviews',
        data,
        context: { disableRevalidate: true },
      })
      createdIds[op.slug] = doc.id
      payload.logger.info(`Created review: ${op.name}`)
    }
  }

  const auroraId = createdIds['aurora-bay-casino']

  // One wagering bonus and one no-wagering bonus, both linked to Aurora Bay
  // Casino — deliberately not the friendliest terms even for the top-scored
  // operator, per the brief's "god-honest-truth" instruction.
  const wageringExisting = await payload.find({
    collection: 'wagering-bonuses',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-100-match' } },
  })
  const wageringData = {
    title: '100% deposit match up to €200',
    slug: 'aurora-bay-100-match',
    operator: auroraId,
    summary:
      'A standard first-deposit match — generous on paper, but with a 35× requirement calculated on bonus plus deposit combined, not bonus alone.',
    eligibility: 'New verified accounts only, first deposit, one bonus per household.',
    expiry: 'Must be claimed within 7 days of account verification.',
    maxWithdrawal: '€500 from bonus winnings; deposited funds are uncapped.',
    wageringMultiplier: 35,
    wageringAppliesTo: 'bonus_plus_deposit' as const,
    wageringTimeLimit: '30 days from the day the bonus is credited.',
    contributingGames: [
      { gameCategory: 'Slots', contributionPercent: 100 },
      { gameCategory: 'Live casino', contributionPercent: 20 },
      { gameCategory: 'Table games', contributionPercent: 10 },
    ],
    isIllustrativeSample: true,
    _status: 'published' as const,
  }
  if (wageringExisting.docs[0]) {
    await payload.update({
      id: wageringExisting.docs[0].id,
      collection: 'wagering-bonuses',
      data: wageringData,
      context: { disableRevalidate: true },
    })
  } else {
    await payload.create({
      collection: 'wagering-bonuses',
      data: wageringData,
      context: { disableRevalidate: true },
    })
  }
  payload.logger.info('Seeded wagering bonus: Aurora Bay 100% match')

  const noWageringExisting = await payload.find({
    collection: 'no-wagering-bonuses',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: 'aurora-bay-no-deposit-25' } },
  })
  const noWageringData = {
    title: '€25 no-deposit bonus, wager-free',
    slug: 'aurora-bay-no-deposit-25',
    operator: auroraId,
    summary:
      'A genuinely wager-free €25 credit for new verified accounts — winnings still carry a deposit condition before withdrawal, stated exactly below.',
    eligibility: 'New verified accounts only, one per household, ID verification required before crediting.',
    expiry: 'Must be claimed within 7 days of account verification.',
    maxWithdrawal: '€50 total from this bonus, regardless of amount won.',
    bonusAmount: '€25 (wager-free)',
    withdrawalConditions:
      'No wagering requirement on winnings, but a minimum €10 real-money deposit is required before any withdrawal request — a real condition, not fine print.',
    isIllustrativeSample: true,
    _status: 'published' as const,
  }
  if (noWageringExisting.docs[0]) {
    await payload.update({
      id: noWageringExisting.docs[0].id,
      collection: 'no-wagering-bonuses',
      data: noWageringData,
      context: { disableRevalidate: true },
    })
  } else {
    await payload.create({
      collection: 'no-wagering-bonuses',
      data: noWageringData,
      context: { disableRevalidate: true },
    })
  }
  payload.logger.info('Seeded no-wagering bonus: Aurora Bay €25 no-deposit')

  await payload.updateGlobal({
    slug: 'header',
    data: { navItems },
    context: { disableRevalidate: true },
  })
  await payload.updateGlobal({
    slug: 'footer',
    data: { navItems },
    context: { disableRevalidate: true },
  })
  payload.logger.info('Updated header/footer nav.')

  await payload.updateGlobal({
    slug: 'homepage',
    data: {
      ctaHeading: 'The reviews are live. The wall still holds.',
      ctaSubtext: 'Playerside — commission-blind, evidence-logged, exact about the terms that matter.',
      ctaButtonHref: '/casinos',
      ctaButtonLabel: 'Browse casino reviews',
      stats: [
        { value: '0', label: 'Commission data seen by graders' },
        { value: '8', label: 'Graded categories per operator' },
        { value: '100%', label: 'Bonus terms stated exactly' },
      ],
    },
    context: { disableRevalidate: true },
  })
  payload.logger.info('Updated homepage CTA band and stats.')

  payload.logger.info('Seed complete.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
