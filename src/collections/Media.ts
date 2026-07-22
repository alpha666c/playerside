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
 * (evidence uploads, once that flow exists) is excluded from anonymous
 * reads at the Payload API layer — both direct /api/media/:id lookups and
 * relationship-expanded reads from another collection.
 *
 * Known gap: `upload.staticDir` below serves files from Next.js's public/
 * directory, which Next serves unauthenticated regardless of this access
 * control — this only protects the Payload API (metadata + direct/related
 * fetches through it), not the raw static file URL. A real fix requires
 * moving internal uploads off the public static path entirely; out of
 * scope for this pass (governance/abuse verification only).
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
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
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
