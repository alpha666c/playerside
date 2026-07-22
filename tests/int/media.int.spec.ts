import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Mock the actual Vercel Blob network calls. This isolates the test from a
// real network dependency and lets it run without BLOB_READ_WRITE_TOKEN
// locally/in CI — the thing under test is Payload's own access-control
// gating (checkFileAccess) and our adapter's contract, not the Vercel Blob
// service itself. Real-store round-trips are verified in production
// (docs/review-handoffs/2026-07-22-phase-2a-2-security-review.md).
const blobStore = new Map<string, { contentType: string; data: Buffer }>()

vi.mock('@vercel/blob', () => ({
  del: vi.fn(async (fileKey: string) => {
    blobStore.delete(fileKey)
  }),
  get: vi.fn(async (fileKey: string) => {
    const entry = blobStore.get(fileKey)
    if (!entry) return null
    return {
      blob: { cacheControl: 'private, max-age=0', contentType: entry.contentType },
      statusCode: 200 as const,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(entry.data)
          controller.close()
        },
      }),
    }
  }),
  put: vi.fn(async (fileKey: string, buffer: Buffer, options: { contentType?: string }) => {
    blobStore.set(fileKey, { contentType: options.contentType ?? 'application/octet-stream', data: buffer })
    return { pathname: fileKey, url: `https://fake-store.private.blob.vercel-storage.com/${fileKey}` }
  }),
}))

const { vercelBlobPrivateAdapter } = await import('@/lib/media/vercelBlobPrivateAdapter')

// 1x1 transparent PNG — the same fixture used by scripts/verify-abuse-and-concurrency.ts.
const tinyPngBuffer = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c6300010000050001' +
    '0d0a2db40000000049454e44ae426082',
  'hex',
)

let payload: Payload
let ordinaryUser: Awaited<ReturnType<Payload['create']>>

describe('Media — private evidence storage', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    await payload.delete({ collection: 'users', where: { email: { equals: 'media-test@example.invalid' } } })
    ordinaryUser = await payload.create({
      collection: 'users',
      data: { email: 'media-test@example.invalid', name: 'Media Test User', password: 'media-test-password-not-real-1' },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'media', where: { alt: { like: 'media-test-%' } } })
    await payload.delete({ id: ordinaryUser.id, collection: 'users' })
  })

  it('uploads an internal media doc successfully via the adapter path', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'media-test-internal-upload-success', visibility: 'internal' },
      file: { name: 'evidence.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
    })
    expect(doc.filename).toBeTruthy()
    await payload.delete({ collection: 'media', id: doc.id })
  })

  it('generates a URL through the protected Payload route, never a raw blob domain', () => {
    const adapter = vercelBlobPrivateAdapter('fake-token')({ collection: { slug: 'media' } as never })
    const url = adapter.generateURL?.({ collection: { slug: 'media' } as never, data: {}, filename: 'evidence.png' })
    expect(url).toContain('/api/media/file/evidence.png')
    expect(url).not.toContain('blob.vercel-storage.com')
  })

  it('staticHandler streams bytes back for an authorized (post-access-check) request', async () => {
    const adapter = vercelBlobPrivateAdapter('fake-token')({ collection: { slug: 'media' } as never })
    // Seed the mock store directly, mirroring what handleUpload would do.
    blobStore.set('direct-static-handler-test.png', { contentType: 'image/png', data: tinyPngBuffer })
    const fakeReq = { payload: { logger: { error: vi.fn() } } } as never
    const res = await adapter.staticHandler(fakeReq, {
      params: { collection: 'media', filename: 'direct-static-handler-test.png' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    blobStore.delete('direct-static-handler-test.png')
  })

  it('denies internal media metadata to an anonymous caller (findByID)', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'media-test-internal-anon-denied', visibility: 'internal' },
      file: { name: 'evidence-anon.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
    })

    await expect(
      payload.findByID({ id: doc.id, collection: 'media', overrideAccess: false }).then((d) => {
        if (!d) throw new Error('not found')
      }),
    ).rejects.toThrow()

    const listResult = await payload.find({ collection: 'media', overrideAccess: false, where: { id: { equals: doc.id } } })
    expect(listResult.docs).toHaveLength(0)

    await payload.delete({ collection: 'media', id: doc.id })
  })

  it('allows internal media retrieval to an authenticated caller — matches the existing documented policy (any authenticated Payload user, no separate admin role exists on Users today)', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'media-test-internal-auth-allowed', visibility: 'internal' },
      file: { name: 'evidence-auth.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
    })

    const found = await payload.findByID({ id: doc.id, collection: 'media', overrideAccess: false, user: ordinaryUser })
    expect(found).toBeTruthy()
    expect(found.url).toContain('/api/media/file/')

    await payload.delete({ collection: 'media', id: doc.id })
  })

  it('control: public media remains readable anonymously (proves the denial above is real access control, not an outage)', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'media-test-public-control', visibility: 'public' },
      file: { name: 'public-control.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
    })

    const found = await payload.findByID({ id: doc.id, collection: 'media', overrideAccess: false })
    expect(found).toBeTruthy()

    await payload.delete({ collection: 'media', id: doc.id })
  })

  it('leaves no persisted Media record when the upload adapter fails', async () => {
    const { put } = await import('@vercel/blob')
    const putMock = vi.mocked(put)
    putMock.mockRejectedValueOnce(new Error('simulated Vercel Blob failure'))

    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'media-test-failed-upload-should-not-persist', visibility: 'internal' },
        file: { name: 'evidence-fail.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
      }),
    ).rejects.toThrow()

    const afterFailure = await payload.find({
      collection: 'media',
      overrideAccess: true,
      where: { alt: { equals: 'media-test-failed-upload-should-not-persist' } },
    })
    expect(afterFailure.docs).toHaveLength(0)
  })
})
