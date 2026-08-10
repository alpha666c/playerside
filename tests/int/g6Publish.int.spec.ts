import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  latestIntegrityRun,
  mapCaseToReviewDoc,
  mapJurisdiction,
  publishCase,
  slugifyOperator,
} from '@/lib/cofounder/publish'

/**
 * Phase G (G.6b) — approve-to-publish (spec §12). Pure helpers are tested
 * directly; `publishCase` runs against a stubbed payload so the guard
 * ordering (§12.1: re-read → verdict freshness → draft → link → flip) can be
 * asserted without a DB.
 */

describe('mapJurisdiction (§12.1 step 3 market mapping)', () => {
  it('maps each supported market from common jurisdiction strings', () => {
    expect(mapJurisdiction('Netherlands (KSA)')).toEqual({ market: 'nl', authority: 'KSA' })
    expect(mapJurisdiction('Sweden — Spelinspektionen')).toEqual({ market: 'se', authority: 'Spelinspektionen' })
    expect(mapJurisdiction('Germany GGL')).toEqual({ market: 'de', authority: 'GGL' })
    expect(mapJurisdiction('United Kingdom (UKGC)')).toEqual({ market: 'uk', authority: 'UKGC' })
  })

  it('returns null for an unmappable jurisdiction — publish must never guess a market', () => {
    expect(mapJurisdiction('Mars Licensing Authority')).toBeNull()
    expect(mapJurisdiction(null)).toBeNull()
    expect(mapJurisdiction('')).toBeNull()
  })
})

describe('slugifyOperator (S1-3 deterministic slug)', () => {
  it('produces a stable slug across re-publishes', () => {
    expect(slugifyOperator('Stake.com')).toBe('stake-com')
    expect(slugifyOperator('Aurora Bay Casino')).toBe('aurora-bay-casino')
    expect(slugifyOperator(undefined)).toBe('operator')
    expect(slugifyOperator('   ')).toBe('operator')
  })
})

describe('latestIntegrityRun (verdict freshness source)', () => {
  const run = (over: Record<string, unknown>) => ({ agentRole: 'integrity-checker', ...over })

  it('picks the latest completed integrity-checker run and reads its verdict + verdictForVersion', () => {
    const aiRuns = [
      run({ runId: 'old', completedAt: '2026-08-09T10:00:00Z', output: { integrityResult: { verdict: 'BLOCKED' } } }),
      run({ runId: 'new', completedAt: '2026-08-09T11:00:00Z', output: { integrityResult: { verdict: 'PASS', verdictForVersion: 4 } } }),
    ]
    expect(latestIntegrityRun(aiRuns)).toEqual({ verdict: 'PASS', verdictForVersion: 4, runId: 'new' })
  })

  it('returns null when there is no completed integrity-checker run', () => {
    expect(latestIntegrityRun(null)).toBeNull()
    expect(latestIntegrityRun([])).toBeNull()
    expect(latestIntegrityRun([run({ runId: 'x', completedAt: null })])).toBeNull()
  })
})

describe('mapCaseToReviewDoc (§12.1 step 3)', () => {
  const baseCase = {
    operatorName: 'Aurora Bay Casino',
    casinoType: 'traditional',
    licenseJurisdiction: 'Netherlands (KSA)',
    licenseNumber: 'KSA-12345',
    deskResearchOutput: {
      licensing: { primary: { value: 'KSA-12345' } },
      communitySentiment: { value: 'Mixed community feedback' },
    },
    computedScores: {
      categories: [
        { key: 'withdrawalSpeed', label: 'Withdrawal speed', score: 8.5, evidence: 'ev-1', notes: 'Fast payouts' },
        { key: 'support', label: 'Support', score: 4.0, evidence: 'ev-2', notes: 'Slow chat' },
      ],
    },
    editorialDraft: {
      summary: 'A solid licensed casino.',
      claimsVsReality: 'Claims vs reality summary here.',
    },
    handsOnResults: {
      withdrawalClaimedHours: 24,
      withdrawalActualHours: 6,
      supportClaimedMinutes: 5,
      supportActualMinutes: 45,
    },
  }

  it('maps the case fields to the review doc shape', () => {
    const doc = mapCaseToReviewDoc(baseCase, 'traditional')
    expect(doc.name).toBe('Aurora Bay Casino')
    expect(doc.markets).toEqual(['nl'])
    expect(doc.compliance).toEqual({ licenseNumber: 'KSA-12345', licenseAuthority: 'KSA' })
    expect(doc._status).toBe('draft')
    expect(doc.summary).toBe('A solid licensed casino.')
    expect(doc.communitySentimentNote).toBe('Mixed community feedback')
    // scores group: rubric categories keyed, evidence + narrative carried
    expect((doc.scores as Record<string, unknown>).withdrawalSpeed).toEqual({
      score: 8.5,
      evidence: 'ev-1',
      narrative: 'Fast payouts',
    })
    // claims-vs-reality pairs from hands-on results
    const cvr = doc.claimsVsReality as { withdrawal: Record<string, unknown>; support: Record<string, unknown> }
    expect(cvr.withdrawal.claimedHours).toBe(24)
    expect(cvr.withdrawal.measuredHours).toBe(6)
    expect(cvr.support.claimedMinutes).toBe(5)
    expect(cvr.support.measuredMinutes).toBe(45)
  })

  it('derives verdict pros/cons from the score categories (never invented)', () => {
    const doc = mapCaseToReviewDoc(baseCase, 'traditional')
    const verdict = doc.verdict as {
      whatsGood: Array<{ point: string }>
      whatsBad: Array<{ point: string }>
      narrative?: string
    }
    expect(verdict.whatsGood.some((g) => g.point.includes('Withdrawal speed'))).toBe(true)
    expect(verdict.whatsBad.some((b) => b.point.includes('Support'))).toBe(true)
    expect(verdict.narrative).toBe('Claims vs reality summary here.')
  })

  it('leaves compliance fields undefined when the jurisdiction is unmappable — the flip gate then blocks', () => {
    const doc = mapCaseToReviewDoc({ ...baseCase, licenseJurisdiction: 'Mars' }, 'traditional')
    expect(doc.compliance).toBeUndefined()
  })
})

describe('publishCase (§12.1 ordering + guards)', () => {
  const makePayloadStub = () => {
    const update = vi.fn()
    const create = vi.fn()
    const find = vi.fn()
    const findByID = vi.fn()
    return {
      update,
      create,
      find,
      findByID,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    }
  }
  const req = { user: { email: 'v.altrock@example.invalid', id: 1 } } as never

  const integrityPassCase = (version = 5) => ({
    id: 1,
    version,
    status: 'integrity-check',
    casinoType: 'traditional',
    operatorName: 'Aurora Bay Casino',
    licenseJurisdiction: 'Netherlands (KSA)',
    licenseNumber: 'KSA-12345',
    aiRuns: [
      {
        runId: 'run-int',
        agentRole: 'integrity-checker',
        completedAt: '2026-08-09T11:00:00Z',
        output: { integrityResult: { verdict: 'PASS', verdictForVersion: version } },
      },
    ],
  })

  it('blocks publish when the case is not at integrity-check', async () => {
    const p = makePayloadStub()
    p.findByID.mockResolvedValue({ ...integrityPassCase(), status: 'desk-research' })
    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(false)
    expect(res.code).toBe('WRONG_STAGE')
    expect(p.create).not.toHaveBeenCalled()
  })

  it('blocks publish when the loaded version is stale (BLOCKED_CONFLICT)', async () => {
    const p = makePayloadStub()
    p.findByID.mockResolvedValue(integrityPassCase(6))
    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(false)
    expect(res.code).toBe('BLOCKED_CONFLICT')
    expect(p.create).not.toHaveBeenCalled()
  })

  it('blocks publish when the latest integrity verdict is not PASS', async () => {
    const p = makePayloadStub()
    const c = integrityPassCase()
    c.aiRuns[0].output.integrityResult.verdict = 'BLOCKED'
    p.findByID.mockResolvedValue(c)
    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(false)
    expect(res.code).toBe('VERDICT_BLOCKED')
    expect(p.create).not.toHaveBeenCalled()
  })

  it('blocks publish on a stale verdict (version bumped after the PASS) — §12.2', async () => {
    const p = makePayloadStub()
    const c = integrityPassCase(7)
    c.aiRuns[0].output.integrityResult.verdictForVersion = 5 // verdict was for v5
    p.findByID.mockResolvedValue(c)
    const res = await publishCase(p as never, req, 1, 7)
    expect(res.ok).toBe(false)
    expect(res.code).toBe('STALE_VERDICT')
    expect(String(res.message)).toContain('re-check')
    expect(p.create).not.toHaveBeenCalled()
  })

  it('creates the review as a DRAFT, links the case, then flips the doc — nothing live before the final step', async () => {
    const p = makePayloadStub()
    p.findByID.mockResolvedValue(integrityPassCase())
    p.create.mockResolvedValue({ id: 42 })
    // step1 (integrity-check → published) then step2 (published → monitoring)
    p.update
      .mockResolvedValueOnce({ id: 1, version: 6, status: 'published' })
      .mockResolvedValueOnce({ id: 1, version: 7, status: 'monitoring' })
      .mockResolvedValueOnce({ id: 42, _status: 'published' })

    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(true)
    expect(res.publishedReviewId).toBe(42)
    expect(res.docStatus).toBe('published')
    expect(res.caseStatus).toBe('monitoring')

    // create calls: the review doc (traditional-casino-reviews) + audit rows
    // (agent-logs) — the review doc is created as DRAFT first.
    const reviewCreates = p.create.mock.calls.filter((c) => c[0].collection === 'traditional-casino-reviews')
    expect(reviewCreates).toHaveLength(1)
    const createCall = reviewCreates[0][0]
    expect(createCall.data._status).toBe('draft')
    expect(createCall.data.slug).toBe('aurora-bay-casino')

    // case updates: link + sign-off + status, then status → monitoring
    const caseUpdateCalls = p.update.mock.calls.filter((c) => c[0].collection === 'research-queue')
    expect(caseUpdateCalls).toHaveLength(2)
    expect(caseUpdateCalls[0][0].data.status).toBe('published')
    expect(caseUpdateCalls[0][0].data.integritySignOff).toBe(true)
    expect(caseUpdateCalls[1][0].data.status).toBe('monitoring')

    // final flip to published happens LAST
    const flipCall = p.update.mock.calls[2]
    expect(flipCall[0].collection).toBe('traditional-casino-reviews')
    expect(flipCall[0].data._status).toBe('published')
  })

  it('re-publishes idempotently: updates the existing doc when the case is already linked', async () => {
    const p = makePayloadStub()
    const c = integrityPassCase() as Record<string, unknown>
    c.publishedReviewId = 42
    p.findByID.mockResolvedValue(c)
    p.update
      .mockResolvedValueOnce({ id: 1, version: 6, status: 'published' })
      .mockResolvedValueOnce({ id: 1, version: 7, status: 'monitoring' })
      .mockResolvedValueOnce({ id: 42, _status: 'published' })

    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(true)
    expect(res.publishedReviewId).toBe(42)
    // update path used — the review-doc create is never called (only the
    // agent-logs audit rows via logEvent)
    const reviewCreates = p.create.mock.calls.filter((c) => c[0].collection === 'traditional-casino-reviews')
    expect(reviewCreates).toHaveLength(0)
    const updateCall = p.update.mock.calls.find((c) => c[0].collection === 'traditional-casino-reviews')
    expect(updateCall).toBeTruthy()
    expect(updateCall![0].id).toBe(42)
  })

  it('leaves the doc draft (compensation) when the compliance gate blocks the flip — case already linked', async () => {
    const p = makePayloadStub()
    p.findByID.mockResolvedValue(integrityPassCase())
    p.create.mockResolvedValue({ id: 42 })
    p.update
      .mockResolvedValueOnce({ id: 1, version: 6, status: 'published' })
      .mockResolvedValueOnce({ id: 1, version: 7, status: 'monitoring' })
      .mockRejectedValueOnce(Object.assign(new Error('Cannot publish — missing markets (ORG.md §3.3).'), { status: 400 }))

    const res = await publishCase(p as never, req, 1, 5)
    expect(res.ok).toBe(false)
    expect(res.code).toBe('COMPLIANCE_GATE')
    expect(res.docStatus).toBe('draft')
    expect(res.publishedReviewId).toBe(42)
    expect(String(res.message)).toContain('stays linked')
  })
})
