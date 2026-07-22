import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'

import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { del, get, put } from '@vercel/blob'

import { getServerSideURL } from '@/utilities/getURL'

/**
 * Custom cloud-storage adapter for the private `playerside-evidence` Vercel
 * Blob store, written directly against `@vercel/blob` rather than
 * `@payloadcms/storage-vercel-blob`'s own adapter.
 *
 * Why not the vendor adapter: its shipped `staticHandler` re-fetches the
 * blob with a plain unauthenticated `fetch()` (no bearer token) — correct
 * for its default `access: 'public'` store, but not for a private one,
 * which requires a token on every read
 * (https://vercel.com/docs/storage/vercel-blob/private-storage). `get()`
 * from `@vercel/blob` is Vercel's own documented token-aware way to read a
 * private blob server-side ("Deliver private blobs via authenticated
 * route", same docs page).
 *
 * Every file in the `media` collection — public and internal alike — lands
 * in this same private store and is served exclusively through Payload's
 * own access-controlled `/api/media/file/:filename` route: Payload's core
 * `checkFileAccess` runs the collection's `access.read` (readUnlessInternal
 * in Media.ts) and throws Forbidden *before* this adapter's staticHandler
 * ever runs (see `payload/dist/uploads/checkFileAccess.js` +
 * `endpoints/getFile.js`). No raw `*.blob.vercel-storage.com` URL is ever
 * handed to a client — generateURL below always points back at that
 * Payload route, and the token never leaves the server.
 */
const BLOB_ACCESS = 'private' as const

export const vercelBlobPrivateAdapter = (token: string): Adapter => () => ({
  name: 'vercel-blob-private',

  generateURL: ({ filename }) => `${getServerSideURL()}/api/media/file/${encodeURIComponent(filename)}`,

  handleDelete: async ({ filename }) => {
    const { fileKey } = getFileKey({ filename })
    try {
      await del(fileKey, { token })
    } catch {
      // Already gone — e.g. a reupload of a file that itself never finished
      // uploading. Deleting the DB doc must not be blocked on this.
    }
  },

  handleUpload: async ({ file }) => {
    const { fileKey } = getFileKey({ filename: file.filename })
    await put(fileKey, file.buffer, {
      access: BLOB_ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.mimeType,
      token,
    })
  },

  staticHandler: async (req, { params }) => {
    const { fileKey } = getFileKey({ filename: params.filename })
    try {
      const result = await get(fileKey, { access: BLOB_ACCESS, token })
      if (!result) {
        return new Response(null, { status: 404 })
      }
      const headers = new Headers()
      headers.set('Content-Type', result.blob.contentType ?? 'application/octet-stream')
      headers.set('Cache-Control', result.blob.cacheControl || 'private, max-age=0, must-revalidate')
      return new Response(result.stream, { headers, status: result.statusCode })
    } catch (err) {
      req.payload.logger.error({ err, msg: 'vercel-blob-private staticHandler error' })
      return new Response(null, { status: 404 })
    }
  },
})
