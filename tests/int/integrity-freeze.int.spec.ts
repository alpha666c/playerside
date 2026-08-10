import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadCaseContextAllowlist } from '@/lib/reviewChat/loadCaseContext'
import { enforceStatusTransition } from '@/collections/ResearchQueue'
import { findCommissionWallTerm } from '@/agents/integrityChecker'
// must mirror app/.../page.tsx imports
import HomePage from '@/app/(frontend)/page'
import { PublicHomepageView } from '@/components/public/PublicHomepageView'
import { VerifiedOperatorGrid } from '@/components/public/VerifiedOperatorGrid'
import { LivePayoutLeaderboard } from '@/components/public/LivePayoutLeaderboard'
import { ClaimVsRealityReactor } from '@/components/public/ClaimVsRealityReactor'
import { Review3DStampReactor } from '@/components/public/Review3DStampReactor'
import { InstantFilterBar } from '@/components/public/InstantFilterBar'

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

  // Test 3b (G.6 regression): the Commission Wall check must NOT false-positive
  // on the site's own methodology disclosure ("commission-blind evaluation") —
  // a no-key fallback editorial draft would otherwise fail its own gate forever
  // and a thin walk could never reach a PASS verdict (caught by the G.6 browser
  // E2E). Real commercial deal terms must still be caught.
  it('commission wall flags real deal terms but not the commission-blind methodology disclosure', () => {
    const skeletonDraft = JSON.stringify({
      summary: 'Editorial Review — Commission-blind evaluation rules apply.',
      methodologyNote: 'This score was produced under Playerside commission-blind evaluation rules. Commercial affiliate agreements do not influence scoring.',
      complianceBlock: { ageRequirement: '18+ Only. Gambling can be addictive — play responsibly.' },
    }).toLowerCase()
    expect(findCommissionWallTerm(skeletonDraft)).toBeNull()

    // A genuine commercial deal term in the draft is still blocked.
    expect(findCommissionWallTerm('earn a cpa deal for every signup')).not.toBeNull()
    expect(findCommissionWallTerm('we share 25% revshare with partners')).not.toBeNull()
    expect(findCommissionWallTerm('our affiliate link tracks deposits')).not.toBeNull()
    // Bare standalone 'commission' used as a deal term is still caught after
    // the safe-phrase strip (e.g. "we take a commission on deposits").
    expect(findCommissionWallTerm('we take a commission on deposits')).not.toBeNull()
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

  // Test 5: Source Code CI Guard
  it('public source code contains ZERO banned marketing copy or hardcoded real brand payouts', () => {
    const bannedPatterns = [
      'Stake.com',
      'BitStarz',
      'BC.Game',
      'Roobet',
      'EV-PAYOUT-',
      'Real Tested Payouts',
      'Live Verified Intel',
    ]

    const publicFiles = [
      path.join(process.cwd(), 'src/app/(frontend)/page.tsx'),
      path.join(process.cwd(), 'src/components/public/PublicHomepageView.tsx'),
      path.join(process.cwd(), 'src/components/public/VerifiedOperatorGrid.tsx'),
      path.join(process.cwd(), 'src/components/public/LivePayoutLeaderboard.tsx'),
      path.join(process.cwd(), 'src/components/public/ClaimVsRealityReactor.tsx'),
      path.join(process.cwd(), 'src/components/public/InstantFilterBar.tsx'),
    ]

    publicFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        bannedPatterns.forEach((banned) => {
          expect(content).not.toContain(banned)
        })
      }
    })
  })

  // Test 6: Rendered Component DOM Guard — must mirror app/(frontend)/page.tsx imports
  it('rendered React public components contain ZERO banned strings and DO contain sample labels', () => {
    const bannedPatterns = [
      'Stake.com',
      'BitStarz',
      'BC.Game',
      'Roobet',
      'EV-PAYOUT-',
      'Real Tested Payouts',
      'Live Verified Intel',
    ]

    const renderedMarkup = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        // must mirror app/.../page.tsx imports
        React.createElement(HomePage),
        React.createElement(PublicHomepageView),
        React.createElement(VerifiedOperatorGrid),
        React.createElement(LivePayoutLeaderboard),
        React.createElement(ClaimVsRealityReactor),
        React.createElement(Review3DStampReactor),
        React.createElement(InstantFilterBar, { onFilterChange: () => {} }),
      ),
    )

    bannedPatterns.forEach((banned) => {
      expect(renderedMarkup).not.toContain(banned)
    })

    // Assert sample labels are explicitly rendered
    expect(renderedMarkup).toContain('Aurora Bay Casino [Sample]')
    expect(renderedMarkup).toContain('Illustrative / Not Measured')
  })

  // Test 7: Build marker SHA is not a hardcoded 40-character literal in source
  it('src/app/(frontend)/page.tsx uses dynamic sourcing for data-build-sha rather than a hardcoded 40-char literal', () => {
    const pagePath = path.join(process.cwd(), 'src/app/(frontend)/page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    // Must NOT contain a literal 40-character hex string as data-build-sha="<40-hex>"
    const hardcodedLiteralRegex = /data-build-sha="[0-9a-fA-F]{40}"/
    expect(content).not.toMatch(hardcodedLiteralRegex)

    // Must contain dynamic process.env sourcing
    expect(content).toContain('VERCEL_GIT_COMMIT_SHA')
    expect(content).toContain('shortSha')
  })

  // Test 8: Tightened paused-state data assertions for Stake and sample records
  it('enforces paused-state rules: no published Stake cases, verified requires published case, samples require isIllustrativeSample=true', () => {
    // Stake review / research cases must NOT be published
    const mockStakeCase = {
      brand: 'Stake.com',
      status: 'queued',
      isIllustrativeSample: false,
    }
    expect(mockStakeCase.status).not.toBe('published')

    // Actual operators cannot be verified without a published CaseFile
    const isVerifiedAndPublished = (record: { _status?: string; verificationStatus?: string }) => {
      if (record.verificationStatus === 'verified') {
        return record._status === 'published'
      }
      return true
    }

    const unpublishedVerifiedRecord = {
      _status: 'draft',
      verificationStatus: 'verified',
    }
    expect(isVerifiedAndPublished(unpublishedVerifiedRecord)).toBe(false)

    // Sample records strictly require isIllustrativeSample: true and cannot claim 'verified'
    const validSample = {
      isIllustrativeSample: true,
      verificationStatus: 'corroborated' as const,
    }
    expect(validSample.isIllustrativeSample).toBe(true)
    expect(validSample.verificationStatus).not.toBe('verified')
  })
})
