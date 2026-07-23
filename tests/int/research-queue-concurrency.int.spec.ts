import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let operatorId: number

describe('ResearchQueue — optimistic concurrency (docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md)', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    await payload.delete({ collection: 'operators', where: { slug: { equals: 'concurrency-test-op' } } })
    const operator = await payload.create({ collection: 'operators', data: { name: 'Concurrency Test Op', slug: 'concurrency-test-op' } })
    operatorId = operator.id
  })

  afterAll(async () => {
    const testCases = await payload.find({ collection: 'research-queue', limit: 50, where: { caseNumber: { like: '#PS-2026-S9%' } } })
    for (const testCase of testCases.docs) {
      const logs = await payload.find({ collection: 'agent-logs', limit: 100, where: { pageId: { equals: String(testCase.id) } } })
      for (const log of logs.docs) await payload.delete({ id: log.id, collection: 'agent-logs' })
    }
    await payload.delete({ collection: 'research-queue', where: { caseNumber: { like: '#PS-2026-S9%' } } })
    await payload.delete({ collection: 'operators', id: operatorId })
  })

  const createCase = (caseNumber: string) =>
    payload.create({
      collection: 'research-queue',
      data: { caseNumber, casinoType: 'crypto', operatorName: 'Concurrency Test Co', parentCompany: operatorId, status: 'queued' },
    })

  it('starts every new case at version 1', async () => {
    const doc = await createCase('#PS-2026-S90')
    expect((doc as unknown as { version: number }).version).toBe(1)
  })

  it('legacy caller (no expectedVersion) is unaffected — same behavior as before this change', async () => {
    const doc = await createCase('#PS-2026-S91')
    const updated = await payload.update({ id: doc.id, collection: 'research-queue', data: { operatorName: 'Legacy Update' } })
    expect(updated.operatorName).toBe('Legacy Update')
  })

  it('a correctly-versioned update succeeds and increments version', async () => {
    const doc = await createCase('#PS-2026-S92')
    const v1 = (doc as unknown as { version: number }).version
    const updated = await payload.update({
      id: doc.id,
      collection: 'research-queue',
      context: { changedFields: ['operatorName'], expectedVersion: v1 },
      data: { operatorName: 'Versioned Update' },
    })
    expect(updated.operatorName).toBe('Versioned Update')
    expect((updated as unknown as { version: number }).version).toBe(v1 + 1)
  })

  it('two updates against the same stale version: exactly one succeeds, the other is rejected with a clear conflict error', async () => {
    const doc = await createCase('#PS-2026-S93')
    const v1 = (doc as unknown as { version: number }).version

    const results = await Promise.allSettled([
      payload.update({
        id: doc.id,
        collection: 'research-queue',
        context: { changedFields: ['operatorName'], expectedVersion: v1 },
        data: { operatorName: 'Writer A' },
      }),
      payload.update({
        id: doc.id,
        collection: 'research-queue',
        context: { changedFields: ['operatorUrl'], expectedVersion: v1 },
        data: { operatorUrl: 'https://writer-b.example.invalid' },
      }),
    ])

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(succeeded).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(String((rejected[0] as PromiseRejectedResult).reason?.message)).toContain('changed by someone else')

    const final = await payload.findByID({ id: doc.id, collection: 'research-queue' })
    // Exactly one of the two intended changes landed — not both, not neither, not a partial merge of both.
    const operatorNameChanged = final.operatorName === 'Writer A'
    const operatorUrlChanged = final.operatorUrl === 'https://writer-b.example.invalid'
    expect(operatorNameChanged !== operatorUrlChanged).toBe(true)
  })

  it('a version-conflict rejection leaves the document completely unchanged (no partial write)', async () => {
    const doc = await createCase('#PS-2026-S94')
    const v1 = (doc as unknown as { version: number }).version
    const staleVersion = v1 - 1 >= 0 ? v1 : v1 // v1 is already the "current" version; use a definitely-wrong one
    const wrongVersion = v1 + 999

    await expect(
      payload.update({
        id: doc.id,
        collection: 'research-queue',
        context: { changedFields: ['operatorName'], expectedVersion: wrongVersion },
        data: { operatorName: 'Should Never Land' },
      }),
    ).rejects.toThrow('changed by someone else')

    const afterRejection = await payload.findByID({ id: doc.id, collection: 'research-queue' })
    expect(afterRejection.operatorName).toBe('Concurrency Test Co')
    expect((afterRejection as unknown as { version: number }).version).toBe(v1)
    void staleVersion
  })

  it('rejects an update that supplies expectedVersion without changedFields (both are required together)', async () => {
    const doc = await createCase('#PS-2026-S95')
    const v1 = (doc as unknown as { version: number }).version
    await expect(
      payload.update({
        id: doc.id,
        collection: 'research-queue',
        context: { expectedVersion: v1 },
        data: { operatorName: 'Missing changedFields' },
      }),
    ).rejects.toThrow('changedFields')
  })

  it('does not disturb the existing stage-transition gate (enforceStatusTransition still runs and still rejects invalid transitions)', async () => {
    const doc = await createCase('#PS-2026-S96')
    const v1 = (doc as unknown as { version: number }).version
    // "No skipping" (MASTER-BLUEPRINT.md §3) — queued cannot jump straight to editorial.
    await expect(
      payload.update({
        id: doc.id,
        collection: 'research-queue',
        context: { changedFields: ['status'], expectedVersion: v1 },
        data: { status: 'editorial' },
      }),
    ).rejects.toThrow('No skipping')
  })
})
