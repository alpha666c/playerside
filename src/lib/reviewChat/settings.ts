import type { Payload, PayloadRequest } from 'payload'

/**
 * Phase G — server-only read path into the `system-settings` global
 * (src/SystemSettings/config.ts). Env vars take precedence over DB values
 * (see llm.ts getLlmConfig); this module just reads the DB side with a short
 * TTL cache so per-call reads don't hit the database every time (QA S3).
 *
 * Never import this into a client component. The global is admin-only read,
 * and this module is only ever called from server contexts (routes, agents).
 */
export interface SystemSettingsDoc {
  llmProvider?: string | null
  llmModel?: string | null
  llmDeepSeekApiKey?: string | null
  llmBaseUrl?: string | null
  llmMaxTokens?: number | null
  llmSpendCapPerDay?: number | null
  exaApiKey?: string | null
}

export type SystemSecretKey = 'llmDeepSeekApiKey' | 'exaApiKey'

const CACHE_TTL_MS = 15_000

let cache: { at: number; doc: SystemSettingsDoc | null } | null = null

export const getSystemSettings = async (
  payload: Payload,
  req: PayloadRequest,
): Promise<SystemSettingsDoc> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.doc ?? {}
  try {
    const doc = (await payload.findGlobal({
      slug: 'system-settings',
      req,
      depth: 0,
    })) as unknown as SystemSettingsDoc
    cache = { at: Date.now(), doc: doc ?? {} }
    return doc ?? {}
  } catch (err) {
    // The global may not exist yet on a fresh checkout pre-migration — treat
    // as empty settings (env vars + defaults still apply). Never throw here,
    // but never silently either (QA S3): a real DB outage must not look like
    // "no settings saved".
    payload.logger.error({
      err,
      message: 'system-settings read failed — falling back to env vars/defaults',
    })
    cache = { at: Date.now(), doc: null }
    return {}
  }
}

export const getSystemSecret = async (
  payload: Payload,
  req: PayloadRequest,
  key: SystemSecretKey,
): Promise<string | null> => {
  const doc = await getSystemSettings(payload, req)
  const value = doc[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/** Test/dev helper — drop the TTL cache (e.g. between tests or after a settings save). */
export const resetSystemSettingsCache = (): void => {
  cache = null
}
