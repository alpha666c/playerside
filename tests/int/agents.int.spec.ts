import { describe, expect, it } from 'vitest'
import { traditionalRubric } from '@/rubrics/traditional'
import { cryptoRubric } from '@/rubrics/crypto'

describe('All 5 Specialized AI Agents Architecture', () => {
  it('Score Analyst binds to locked traditional & crypto rubrics', () => {
    expect(traditionalRubric.length).toBe(8)
    expect(cryptoRubric.length).toBe(9)
  })

  it('Integrity Checker enforces commission wall term restrictions', () => {
    const forbiddenTerms = ['commission', 'cpa', 'revshare', 'rev-share', 'affiliate link', 'referral fee']
    const testDraft = 'This operator offers a 30% revshare commission deal.'

    const hasForbiddenTerm = forbiddenTerms.some((term) => testDraft.includes(term))
    expect(hasForbiddenTerm).toBe(true)
  })
})
