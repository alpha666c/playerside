import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * vex-ledger: anonymous player profiles keyed by a client-generated
 * playerKey (UUID in localStorage). The site has no public auth (Users are
 * admin-only), so the API routes act as the service role: they validate the
 * key, derive XP from validator outcomes, and write with overrideAccess.
 * Direct REST writes are denied — no client can bump totalXp.
 */
export const GamificationProfiles: CollectionConfig<'gamification-profiles'> = {
  slug: 'gamification-profiles',
  access: {
    create: () => false,
    delete: () => false,
    // Admins can audit profiles; writes stay service-role only (API routes).
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ['playerKey', 'totalXp', 'level', 'updatedAt'],
    useAsTitle: 'playerKey',
  },
  fields: [
    {
      name: 'playerKey',
      type: 'text',
      admin: { description: 'Client-generated anonymous identity (UUID).' },
      required: true,
      unique: true,
    },
    {
      name: 'totalXp',
      type: 'number',
      admin: { description: 'Cached aggregate; source of truth is xp-events (append-only).' },
      defaultValue: 0,
      min: 0,
      required: true,
    },
    {
      name: 'level',
      type: 'number',
      admin: { description: 'Recomputed from totalXp via xp_required(L) = floor(100*L^1.5).' },
      defaultValue: 1,
      min: 1,
      required: true,
    },
    {
      name: 'rankTitle',
      type: 'text',
      admin: { description: 'Canon ladder title for the current level (vex-canon flavor).' },
      defaultValue: 'Street Scout',
    },
    {
      name: 'completedMissions',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
  ],
  timestamps: true,
}
