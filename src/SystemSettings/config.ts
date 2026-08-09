import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { resetSystemSettingsCache } from '../lib/reviewChat/settings'

/**
 * Phase G — the single place Viktor manages runtime LLM settings and API
 * keys (spec §1 / §10, "manage once in the admin, every host reads it").
 *
 * The site runs on multiple hosts (Vercel, the VPS, local dev) that share
 * one database. Env vars cannot cross hosts, so the keys live here instead:
 * paste them once in the admin at /admin/globals/system-settings, and every
 * host's server process reads them from the DB. Precedence (see
 * `src/lib/reviewChat/settings.ts`): an explicit environment variable still
 * wins over the DB value, so CI/bootstrap can override without touching the
 * admin, and local dev can run before anything is saved.
 *
 * Security posture:
 * - Access is admin-only (read + update) — the public site can never read
 *   this global, and no public route serializes it.
 * - Values are DB-at-rest, admin-only in the UI; the audit trail is the
 *   `agent-logs` collection's `case_updated`-style events if ever needed.
 * - Never log the values; the LLM client logs metadata only.
 */
export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  access: {
    read: authenticated,
    update: authenticated,
  },
  admin: {
    description:
      'Runtime settings for the AI Cofounder + pipeline agents. Stored in the shared database, so the same values apply on any host (Vercel, VPS, local). An environment variable with the same purpose overrides these when set. Keys are admin-only and never exposed to the public site — but note (QA S2-2): any authenticated admin account can see them here and via the admin API, so keep the admin user list to people you trust.',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'llmProvider',
          type: 'select',
          defaultValue: 'deepseek',
          options: [{ label: 'DeepSeek (OpenAI-compatible)', value: 'deepseek' }],
          admin: { description: 'LLM provider.' },
        },
        {
          name: 'llmModel',
          type: 'text',
          defaultValue: 'deepseek-v4-flash',
          admin: {
            description:
              'Model id — this is a candidate default; GET /api/cofounder/health verifies the id the endpoint actually serves.',
          },
        },
      ],
    },
    {
      name: 'llmDeepSeekApiKey',
      type: 'text',
      admin: {
        description:
          'DeepSeek API key (https://platform.deepseek.com → API Keys). Saving replaces the old value — that is the rotation mechanism. Admin-only.',
      },
    },
    {
      name: 'llmBaseUrl',
      type: 'text',
      defaultValue: 'https://api.deepseek.com',
      admin: { description: 'Provider base URL (set only if using a different endpoint).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'llmMaxTokens',
          type: 'number',
          defaultValue: 4000,
          admin: { description: 'Max tokens per LLM call.' },
        },
        {
          name: 'llmSpendCapPerDay',
          type: 'number',
          defaultValue: 1000,
          admin: {
            description:
              'Daily LLM call cap across all agents (counted via agent-logs). 0 disables the cap.',
          },
        },
      ],
    },
    {
      name: 'exaApiKey',
      type: 'text',
      admin: {
        description:
          'Exa API key (https://dashboard.exa.ai → API Keys) for the trending-research tool (Phase G G.4).',
      },
    },
  ],
  hooks: {
    afterChange: [
      () => {
        // QA S2-1: rotate immediately — drop the TTL cache so the next LLM
        // call reads the new value. Without this, a long-lived VPS would
        // keep calling with the old key for up to the 15s cache TTL.
        resetSystemSettingsCache()
        return undefined
      },
    ],
  },
}
