import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * Parent/holding company for one or more reviewed casino brands
 * (MASTER-BLUEPRINT.md §8.1, §9.1). Internal-only — groups brands for
 * cross-brand comparison and independent regulatory tracking, and (Phase 5,
 * UX-FEATURES.md Feature 5) powers the Operator Network Map once at least
 * one real review is live. Never surfaced directly as its own public page
 * before that phase.
 */
export const Operator: CollectionConfig<'operators'> = {
  slug: 'operators',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'jurisdiction', 'regulatoryWatchFlag', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'jurisdiction', type: 'text' },
    { name: 'incorporationCountry', type: 'text' },
    {
      name: 'knownBrands',
      type: 'relationship',
      admin: {
        description:
          'Every case (brand) known to belong to this operator — kept in sync automatically when a case sets this operator as its parentCompany (§8.1).',
        readOnly: true,
      },
      hasMany: true,
      relationTo: 'research-queue',
    },
    {
      name: 'internalNotes',
      type: 'richText',
      admin: {
        description:
          'Scandals, legal actions, press coverage — internal only, never auto-published (§8.2).',
      },
    },
    {
      name: 'regulatoryWatchFlag',
      type: 'checkbox',
      admin: { description: 'Flags this operator for active regulatory monitoring (Monitor agent, MONITOR.md).' },
      defaultValue: false,
    },
  ],
  timestamps: true,
}
