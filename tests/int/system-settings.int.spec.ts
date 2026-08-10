import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Phase H1 — SystemSettings key-field regression test.
 *
 * Guards the exact bug class that burned the repo before (2026-08-09:
 * "Something went wrong on save" — the llmProvider enum footgun). The two
 * new nullable text fields (`elevenLabsApiKey`, `geminiApiKey`) must survive
 * a save/read round-trip against the REAL Postgres global table (migration
 * 20260810_add_system_settings_keys). If a future migration drops or
 * renames the columns, or an admin UI change breaks the field registration,
 * this test fails at write/read time — not in production on first save.
 */
let payload: Payload
let reqUser: { id: number; email: string }
const TEST_EMAIL = 'settings-fields-test@example.invalid'

type SettingsLike = {
  elevenLabsApiKey?: string | null
  geminiApiKey?: string | null
  [k: string]: unknown
}

beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })

  const stale = await payload.find({
    collection: 'users',
    limit: 5,
    where: { email: { equals: TEST_EMAIL } },
  })
  for (const u of stale.docs) await payload.delete({ id: u.id, collection: 'users' }).catch(() => {})

  const created = await payload.create({
    collection: 'users',
    data: { email: TEST_EMAIL, password: 'test-password-1', name: 'Settings Fields Test' },
  })
  reqUser = { id: created.id, email: created.email }
})

afterAll(async () => {
  await payload.delete({ id: reqUser.id, collection: 'users' }).catch(() => {})
})

const makeReq = () => ({ user: { id: reqUser.id, email: reqUser.email } }) as never

describe('system-settings key fields (Phase H1)', () => {
  it('round-trips elevenLabsApiKey + geminiApiKey without "Something went wrong"', async () => {
    const before = (await payload.findGlobal({
      slug: 'system-settings',
      req: makeReq(),
      depth: 0,
    })) as unknown as SettingsLike

    // Save test values (the admin UI writes through the same local API path).
    await payload.updateGlobal({
      slug: 'system-settings',
      req: makeReq(),
      data: { elevenLabsApiKey: 'sk-eleven-test-h1', geminiApiKey: 'AIza-test-h1' },
    })

    const after = (await payload.findGlobal({
      slug: 'system-settings',
      req: makeReq(),
      depth: 0,
    })) as unknown as SettingsLike
    expect(after.elevenLabsApiKey).toBe('sk-eleven-test-h1')
    expect(after.geminiApiKey).toBe('AIza-test-h1')

    // Restore the original values so no other suite sees fake keys, and
    // verify clearing (null) also round-trips.
    await payload.updateGlobal({
      slug: 'system-settings',
      req: makeReq(),
      data: {
        elevenLabsApiKey: before.elevenLabsApiKey ?? null,
        geminiApiKey: before.geminiApiKey ?? null,
      },
    })
    const restored = (await payload.findGlobal({
      slug: 'system-settings',
      req: makeReq(),
      depth: 0,
    })) as unknown as SettingsLike
    expect(restored.elevenLabsApiKey ?? null).toBe(before.elevenLabsApiKey ?? null)
    expect(restored.geminiApiKey ?? null).toBe(before.geminiApiKey ?? null)
  })
})
