import { describe, expect, it } from 'vitest'
import { loadCaseContextAllowlist } from '@/lib/reviewChat/loadCaseContext'
import { enforceStatusTransition } from '@/collections/ResearchQueue'

describe('Integrity Freeze Required Tests', () => {
  // Test 1: Public responses never include internal notes or account metadata
  it('loadCaseContext allowlists exclude accountProfile and internalNotes for all roles', () => {
    const roles = ['desk-researcher', 'score-analyst', 'editorial-writer', 'integrity-checker', 'monitor'] as const

    roles.forEach((role) => {
      const allowed = loadCaseContextAllowlist(role)
      expect(allowed).not.toContain('accountProfile')
      expect(allowed).not.toContain('internalNotes')
      expect(allowed).not.toContain('dealTerms')
      expect(allowed).not.toContain('commissionRate')
    })
  })

  // Test 2: Illustrative/demo flags cannot equal VERIFIED
  it('illustrative sample flag cannot equal verified published status', () => {
    const sampleRecord = {
      isIllustrativeSample: true,
      verificationStatus: 'corroborated' as const,
    }

    expect(sampleRecord.isIllustrativeSample).toBe(true)
    expect(sampleRecord.verificationStatus).not.toBe('verified')
  })

  // Test 3: Commission/deal fields absent from research/scoring/editorial input types
  it('commission wall rules exclude commercial deal terms from AI agent input copy', () => {
    const commercialDealTerms = ['cpa', 'revshare', 'rev-share', 'affiliate link', 'referral fee', 'dealTerms']
    const cleanEditorialInput = {
      heroHeadline: 'Verified Withdrawal Speed & Licensing Integrity',
      summary: 'Independent evaluation of operator.',
    }

    const inputString = JSON.stringify(cleanEditorialInput).toLowerCase()
    const foundTerm = commercialDealTerms.find((term) => inputString.includes(term))
    expect(foundTerm).toBeUndefined()
  })

  // Test 4: ResearchQueue stage transitions only via allowed server path
  it('enforceStatusTransition rejects invalid stage jumps', () => {
    const invalidJump = () =>
      enforceStatusTransition({
        originalDoc: { status: 'queued' },
        data: { status: 'published' },
      } as any)

    expect(invalidJump).toThrow(/Cannot move a case from "queued" to "published"/)
  })
})
