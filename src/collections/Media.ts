import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import type { Access } from 'payload'

import { authenticated } from '../access/authenticated'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Public by default (marketing/blog images need to stay fast and
 * unauthenticated), but a doc explicitly marked `visibility: 'internal'`
 * (evidence uploads) is excluded from anonymous reads at the Payload API
 * layer — both direct /api/media/:id lookups and relationship-expanded
 * reads from another collection.
 *
 * File bytes (public and internal alike) live in the private
 * `playerside-evidence` Vercel Blob store (see
 * src/lib/media/vercelBlobPrivateAdapter.ts + DECISION-LOG.md,
 * 2026-07-22), wired in via `cloudStoragePlugin` in src/plugins/index.ts.
 * The one and only way to fetch bytes is Payload's own
 * `/api/media/file/:filename` route, which runs this `read` access
 * function *before* the storage adapter is ever invoked — there is no raw,
 * unauthenticated static path to the files anymore (the previous
 * `staticDir`-into-Next's-`public/`-folder design was the actual bypass;
 * removed, not just relocated).
 */
const readUnlessInternal: Access = ({ req }) => {
  if (req.user) return true
  return { visibility: { not_equals: 'internal' } }
}

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  access: {
    create: authenticated,
    delete: authenticated,
    read: readUnlessInternal,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'visibility',
      type: 'select',
      admin: {
        description:
          'Public media (site images) stays public. Mark evidence uploads "Internal" — anonymous requests cannot read internal media via the Payload API. Does not protect the raw static file URL (see collection doc comment).',
      },
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Internal', value: 'internal' },
      ],
      required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Local-disk fallback only, used when BLOB_READ_WRITE_TOKEN is absent
    // (local dev without `vercel env pull`) — the cloudStoragePlugin in
    // src/plugins/index.ts takes over and sets disableLocalStorage: true
    // whenever the token is present, so this path is never written to in
    // any deployed environment.
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
