import { describe, expect, it, beforeAll } from 'vitest'
import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { loadCaseContextAllowlist, loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { enforceStatusTransition } from '@/collections/ResearchQueue'
import { enforceOptimisticVersion } from '@/collections/ResearchQueue/enforceOptimisticVersion'

describe('Internal Readiness Verification Suite', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config: configPromise })
  })

  // =========================================================================
  // 1. Production Migration State & Schema Audit
  // =========================================================================
  describe('1. Migration State & Database Schema', () => {
    it('verifies ResearchQueue migrations and required schema fields exist', async () => {
      const rqCollection = payload.config.collections.find((c) => c.slug === 'research-queue')
      expect(rqCollection).toBeDefined()

      const requiredFields = [
        'caseNumber',
        'operatorName',
        'casinoType',
        'status',
        'version',
        'internalNotes',
        'accountProfile',
        'deskResearchOutput',
        'handsOnResults',
        'editorialDraft',
        'integritySignOff',
      ]

      const fieldNames = rqCollection!.fields.map((f: any) => f.name)
      requiredFields.forEach((rf) => {
        expect(fieldNames).toContain(rf)
      })
    })

    it('verifies AgentLogs audit collection immutability', () => {
      const logsCollection = payload.config.collections.find((c) => c.slug === 'agent-logs')
      expect(logsCollection).toBeDefined()
      expect(logsCollection?.access?.update).toBeDefined()
      expect(logsCollection?.access?.delete).toBeDefined()
    })
  })

  // =========================================================================
  // 2. API Abuse & Access Control Tests
  // =========================================================================
  describe('2. API Abuse & Access Control', () => {
    it('denies anonymous REST read access to research-queue cases (throws Forbidden)', async () => {
      await expect(
        payload.find({
          collection: 'research-queue',
          overrideAccess: false,
          user: undefined,
        })
      ).rejects.toThrow(/You are not allowed to perform this action/)
    })

    it('prevents client from skipping stage order (queued -> published)', () => {
      const invalidJump = () =>
        enforceStatusTransition({
          originalDoc: { status: 'queued' },
          data: { status: 'published' },
        } as any)

      expect(invalidJump).toThrow(/Cannot move a case from "queued" to "published"/)
    })

    it('rejects stale version update via optimistic concurrency hook', async () => {
      await expect(
        enforceOptimisticVersion({
          operation: 'update',
          originalDoc: { id: 999, version: 3 },
          data: { status: 'desk-research' },
          req: { payload, context: { expectedVersion: 2, changedFields: ['status'] } } as any,
        } as any)
      ).rejects.toThrow(/changed by someone else since you loaded it/)
    })

    it('denies update and delete operations on AgentLogs collection', async () => {
      const logsCollection = payload.config.collections.find((c) => c.slug === 'agent-logs')
      const updateAccess = typeof logsCollection?.access?.update === 'function' 
        ? logsCollection?.access?.update({ req: { user: undefined } } as any)
        : logsCollection?.access?.update
      const deleteAccess = typeof logsCollection?.access?.delete === 'function'
        ? logsCollection?.access?.delete({ req: { user: undefined } } as any)
        : logsCollection?.access?.delete

      expect(Boolean(updateAccess)).toBe(false)
      expect(Boolean(deleteAccess)).toBe(false)
    })
  })

  // =========================================================================
  // 3. Draft-Only AI Guard Verification
  // =========================================================================
  describe('3. Draft-Only AI Guard Verification', () => {
    it('derives server allow-list and excludes protected fields for all roles', () => {
      const roles = ['desk-researcher', 'score-analyst', 'editorial-writer', 'integrity-checker', 'monitor'] as const

      roles.forEach((role) => {
        const allowed = loadCaseContextAllowlist(role)
        expect(allowed).not.toContain('accountProfile')
        expect(allowed).not.toContain('internalNotes')
        expect(allowed).not.toContain('dealTerms')
        expect(allowed).not.toContain('commissionRate')
      })
    })

    it('loads case context excluding credentials, internal notes, and deal terms', () => {
      const deskAllowed = loadCaseContextAllowlist('desk-researcher')
      expect(deskAllowed).toContain('caseNumber')
      expect(deskAllowed).not.toContain('accountProfile')
      expect(deskAllowed).not.toContain('internalNotes')

      const editorialAllowed = loadCaseContextAllowlist('editorial-writer')
      expect(editorialAllowed).toContain('computedScores')
      expect(editorialAllowed).not.toContain('accountProfile')
      expect(editorialAllowed).not.toContain('internalNotes')
    })
  })

  // =========================================================================
  // 4. Dry-Run Case Execution & Blocked Transition Proof
  // =========================================================================
  describe('4. Dry-Run Case Execution & Blocked Transition', () => {
    it('creates sample case in QUEUED, advances to DESK-RESEARCH, and proves stage jumping & incomplete EDITORIAL transition are blocked', async () => {
      const testCaseNumber = '#PS-2026-S99'

      // Step A: Clean up any pre-existing test doc with this number
      const existing = await payload.find({
        collection: 'research-queue',
        where: { caseNumber: { equals: testCaseNumber } },
      })
      for (const doc of existing.docs) {
        await payload.delete({ collection: 'research-queue', id: doc.id })
      }

      // Step B: Create dry-run case in QUEUED
      const sampleCase = await payload.create({
        collection: 'research-queue',
        data: {
          caseNumber: testCaseNumber,
          operatorName: 'Aurora Bay Casino [Sample]',
          casinoType: 'traditional',
          status: 'queued',
          version: 1,
        },
      })

      expect(sampleCase.status).toBe('queued')
      expect(sampleCase.caseNumber).toBe(testCaseNumber)

      // Step C: Advance to DESK-RESEARCH with deskResearchOutput populated
      const updatedCase = await payload.update({
        collection: 'research-queue',
        id: sampleCase.id,
        data: {
          status: 'desk-research',
          deskResearchOutput: {
            corporateEntity: 'Aurora Bay Gaming N.V.',
            licenceNumber: 'OGL/2026/114/0082 [Sample]',
            licenceStatus: 'verified_active',
            targetMarkets: ['NL', 'SE'],
          },
        },
        context: {
          expectedVersion: 1,
          changedFields: ['status', 'deskResearchOutput'],
        },
      })

      expect(updatedCase.status).toBe('desk-research')
      expect(updatedCase.version).toBe(2)

      // Step D1: Attempt direct stage skip from DESK-RESEARCH to EDITORIAL -> BLOCKED
      const directSkipAttempt = () =>
        enforceStatusTransition({
          originalDoc: updatedCase,
          data: { status: 'editorial' },
        } as any)

      expect(directSkipAttempt).toThrow(/Cannot move a case from "desk-research" to "editorial"/)

      // Step D2: Advance to HANDS-ON-TESTING, then attempt EDITORIAL transition without handsOnResults -> BLOCKED
      const handsOnCase = await payload.update({
        collection: 'research-queue',
        id: sampleCase.id,
        data: {
          status: 'hands-on-testing',
        },
        context: {
          expectedVersion: 2,
          changedFields: ['status'],
        },
      })

      expect(handsOnCase.status).toBe('hands-on-testing')

      const blockedEditorialAttempt = () =>
        enforceStatusTransition({
          originalDoc: handsOnCase,
          data: { status: 'editorial' },
        } as any)

      expect(blockedEditorialAttempt).toThrow(/Cannot enter editorial: handsOnResults is missing/)

      // Step E: Verify audit log was recorded for stage transitions
      const logs = await payload.find({
        collection: 'agent-logs',
        where: {
          and: [
            { pageId: { equals: String(sampleCase.id) } },
            { event: { equals: 'status_transition' } },
          ],
        },
      })

      expect(logs.docs.length).toBeGreaterThanOrEqual(1)

      // Clean up dry-run test case
      await payload.delete({ collection: 'research-queue', id: sampleCase.id })
    })
  })
})
