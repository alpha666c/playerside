import { describe, it, expect } from 'vitest'

import { containsSlopPattern, stripAiSlop } from '@/lib/slopGate'
import { buildEditorialDraft } from '@/agents/editorialWriter'
import { findCommissionWallTerm } from '@/agents/integrityChecker'

/**
 * Phase I1 — deterministic AI-slop gate tests (plan 2026-08-11-repo-integrations-plan.md).
 *
 * Locks:
 * - patterns stripped (openers / filler phrases / adjectives)
 * - EVIDENCE SAFE: URLs, numbers+units, multipliers, currency, timestamps,
 *   licence refs survive byte-for-byte
 * - binary contrasts ("It's not X, it's Y") are a legit review-rhetoric class
 *   and are NOT stripped
 * - idempotent (double run === single run)
 * - empty-output guard (never return an emptied field)
 * - buildEditorialDraft: prose fields pass the gate; complianceBlock +
 *   categoryBreakdown are byte-untouched
 * - commission wall still trips AFTER stripping (integrity-checker regression)
 */
describe('slopGate: opener removal', () => {
  it('strips throat-clearing openers and keeps the clause', () => {
    expect(stripAiSlop("It's worth noting that the bonus terms are fair.")).toBe('the bonus terms are fair.')
    expect(stripAiSlop('Here\'s the thing: the wagering is 35×.')).toBe('the wagering is 35×.')
    expect(stripAiSlop('At the end of the day, payouts arrive in 4.2h.')).toBe('payouts arrive in 4.2h.')
    expect(stripAiSlop('In today\'s fast-paced world, crypto casinos are everywhere.')).toBe('crypto casinos are everywhere.')
    // "let's dive in to X" is left alone: removing the opener mid-clause would
    // produce the fragment "to the terms." — conservative gate preserves it
    // (the role-file rule prevents generation in the first place).
    expect(stripAiSlop('Let\'s dive in to the terms.')).toBe('Let\'s dive in to the terms.')
  })

  it('strips faux-insight setups', () => {
    expect(stripAiSlop('What most people get wrong: the bonus cap is €500.')).toBe('the bonus cap is €500.')
    expect(stripAiSlop('The part everyone misses is the max cashout.')).toBe('is the max cashout.')
  })

  it('strips summary-recap endings and metadiscourse', () => {
    expect(stripAiSlop('In conclusion, Stake is licensed.')).toBe('Stake is licensed.')
    expect(stripAiSlop('Overall, the score is 8.7/10.')).toBe('the score is 8.7/10.')
    expect(stripAiSlop('As you can see, the KYC is fast.')).toBe('the KYC is fast.')
  })

  it('strips weasel attribution', () => {
    expect(stripAiSlop('Experts agree the provider is reliable.')).toBe('the provider is reliable.')
  })
})

describe('slopGate: filler phrases + adjectives', () => {
  it('strips filler phrases anywhere they appear', () => {
    expect(stripAiSlop('The site is, at its core, a crypto casino.')).toBe('The site is, a crypto casino.')
  })

  it('replaces grammar-breaking slop phrases with plain words', () => {
    expect(stripAiSlop('This is a game changer for players.')).toBe('This is a major change for players.')
    expect(stripAiSlop('The bonus is generous in terms of value.')).toBe('The bonus is generous for value.')
    expect(stripAiSlop('A paradigm shift in payouts.')).toBe('A major change in payouts.')
  })

  it('strips deletable adjectives but never verbs', () => {
    expect(stripAiSlop('A robust security policy is enforced.')).toBe('A security policy is enforced.')
    expect(stripAiSlop('Cutting-edge RNG certification.')).toBe('RNG certification.')
    expect(stripAiSlop('We utilize 128-bit encryption.')).toBe('We utilize 128-bit encryption.') // verb — untouched
  })
})

describe('slopGate: evidence safety (S1 lock)', () => {
  it('preserves payout timestamps byte-for-byte', () => {
    const text = "It's worth noting that average withdrawal took 4.2h via e-wallet in Jan 2026."
    expect(stripAiSlop(text)).toBe('average withdrawal took 4.2h via e-wallet in Jan 2026.')
  })

  it('preserves wagering multipliers and currency', () => {
    const text = 'The 35× wagering means a €100 bonus requires €3,500 turnover.'
    expect(stripAiSlop(text)).toBe('The 35× wagering means a €100 bonus requires €3,500 turnover.')
  })

  it('preserves licence references', () => {
    const text = 'Licensed under MGA/CRP-123456, verified on Q1 2026.'
    expect(stripAiSlop(text)).toBe('Licensed under MGA/CRP-123456, verified on Q1 2026.')
  })

  it('preserves URLs', () => {
    const text = 'See https://www.gamblingcommission.gov.uk for the register.'
    expect(stripAiSlop(text)).toBe('See https://www.gamblingcommission.gov.uk for the register.')
  })

  it('preserves RTP percentages', () => {
    const text = 'RTP sits at 96.5% with a 1:1 bonus ratio.'
    expect(stripAiSlop(text)).toBe('RTP sits at 96.5% with a 1:1 bonus ratio.')
  })
})

describe('slopGate: conservative behaviour (S1/S2 locks)', () => {
  it('never strips binary contrasts — legit review rhetoric', () => {
    const text = "It's not the bonus size, it's the terms."
    expect(stripAiSlop(text)).toBe(text)
  })

  it('strips an opener at the start of a SECOND sentence (mid-text)', () => {
    expect(stripAiSlop('First claim. Overall, the score is high.')).toBe('First claim. the score is high.')
  })

  it('does NOT strip weasel attribution mid-sentence (comma parenthetical)', () => {
    // Conservative by design: "experts agree" only fires as a sentence-initial
    // opener, never as a mid-sentence aside — pin this so a future rule change
    // cannot silently widen the gate.
    expect(stripAiSlop('Stake, experts agree, is licensed.')).toBe('Stake, experts agree, is licensed.')
  })

  it('empty-output guard: an opener-only field keeps its original', () => {
    const text = 'In conclusion.'
    expect(stripAiSlop(text)).toBe(text)
  })

  it('idempotent: double run === single run', () => {
    const text = "It's worth noting that the payout is 4.2h, overall."
    const once = stripAiSlop(text)
    expect(stripAiSlop(once)).toBe(once)
  })

  it('handles null/undefined/empty inputs', () => {
    expect(stripAiSlop(null)).toBe('')
    expect(stripAiSlop(undefined)).toBe('')
    expect(stripAiSlop('   ')).toBe('')
  })

  it('containsSlopPattern detects but does not rewrite', () => {
    expect(containsSlopPattern("It's worth noting the terms.")).toBe(true)
    expect(containsSlopPattern('The payout took 4.2h.')).toBe(false)
  })
})

describe('slopGate: buildEditorialDraft integration', () => {
  const context = {
    operatorName: 'Stake',
    licenseNumber: 'MGA/CRP-123456',
    computedScores: { categories: [{ key: 'trust', score: 8 }] },
  }

  it('passes prose fields through the gate', () => {
    const draft = buildEditorialDraft(context, {
      summary: "It's worth noting that Stake pays out in 4.2h.",
      heroHeadline: "Here's the thing: Stake Review.",
      claimsVsReality: 'The claim is fair.',
      methodologyNote: 'A note.',
    })
    expect(draft.summary).toBe('Stake pays out in 4.2h.')
    expect(draft.heroHeadline).toBe('Stake Review.')
  })

  it('complianceBlock and categoryBreakdown stay byte-untouched', () => {
    const draft = buildEditorialDraft(context, {
      summary: 'Sloppy text.',
      heroHeadline: 'Sloppy.',
      claimsVsReality: 'Sloppy.',
      methodologyNote: 'Sloppy.',
    })
    expect(draft.complianceBlock).toEqual({
      licenceReference: 'MGA/CRP-123456',
      ageRequirement: '18+ Only. Gambling can be addictive — play responsibly.',
      responsibleGamblingLinks: ['https://www.begambleaware.org', 'https://www.gamstop.co.uk'],
    })
    expect(draft.categoryBreakdown).toEqual([{ key: 'trust', score: 8 }])
  })

  it('fallback strings survive the gate (commission-blind language intact)', () => {
    const draft = buildEditorialDraft(context, null)
    expect(draft.summary).toContain('Commission-blind')
    expect(draft.methodologyNote).toContain('commission-blind evaluation rules')
  })

  it('commission wall still trips AFTER stripping (integrity-checker regression)', () => {
    const draft = buildEditorialDraft(context, {
      summary: 'We receive a commission on signups.',
      heroHeadline: 'A headline.',
      claimsVsReality: 'A claim.',
      methodologyNote: 'A note.',
    })
    const hit = findCommissionWallTerm(JSON.stringify(draft))
    expect(hit).not.toBeNull()
  })
})
