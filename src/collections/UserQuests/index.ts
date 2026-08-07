import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * vex-ledger: per-player mission state. `evidenceId` is the client-generated
 * idempotency key — submit is idempotent on (playerKey, evidenceId). REST
 * writes are denied; the gamification API routes are the only writer.
 */
export const UserQuests: CollectionConfig<'user-quests'> = {
  slug: 'user-quests',
  access: {
    create: () => false,
    delete: () => false,
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ['playerKey', 'quest', 'status', 'stepIndex', 'updatedAt'],
    useAsTitle: 'playerKey',
  },
  fields: [
    {
      name: 'playerKey',
      type: 'text',
      admin: { description: 'Anonymous player identity.' },
      required: true,
    },
    {
      name: 'quest',
      type: 'relationship',
      relationTo: 'quests',
      admin: { description: 'The mission definition.' },
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Offered', value: 'offered' },
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
      ],
      defaultValue: 'active',
      required: true,
    },
    {
      name: 'stepIndex',
      type: 'number',
      admin: { description: 'Next unanswered step (0-based).' },
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'lastEvidenceId',
      type: 'text',
      admin: { description: 'Last processed idempotency key (dedup guard).' },
    },
    {
      name: 'completedAt',
      type: 'date',
    },
  ],
  indexes: [
    { fields: ['playerKey', 'quest'], unique: true },
  ],
  timestamps: true,
}
