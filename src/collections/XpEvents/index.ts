import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * vex-ledger: the append-only ledger. Hard law #1 — never UPDATE amount.
 * XP is minted here (create) and only here; amounts are derived from
 * validator outcomes, never supplied by clients. No update/delete access
 * exists at all, and REST create is denied — the API routes are the sole
 * writer (service role).
 */
export const XpEvents: CollectionConfig<'xp-events'> = {
  slug: 'xp-events',
  access: {
    create: () => false,
    delete: () => false,
    // The audit trail must be readable by admins (containment release gate).
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ['playerKey', 'amount', 'reason', 'createdAt'],
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
      name: 'amount',
      type: 'number',
      admin: { description: 'XP minted. NEVER updated after insert.' },
      min: 0,
      required: true,
    },
    {
      name: 'reason',
      type: 'select',
      options: [
        { label: 'Mission completed', value: 'mission_completed' },
        { label: 'Badge granted', value: 'badge_granted' },
      ],
      defaultValue: 'mission_completed',
      required: true,
    },
    {
      name: 'quest',
      type: 'relationship',
      relationTo: 'quests',
    },
    {
      name: 'evidenceId',
      type: 'text',
      admin: { description: 'Idempotency key — (playerKey, evidenceId) must be unique.' },
    },
  ],
  indexes: [
    { fields: ['playerKey', 'evidenceId'], unique: true },
  ],
  timestamps: true,
}
