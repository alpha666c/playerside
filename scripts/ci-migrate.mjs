#!/usr/bin/env node
/**
 * CI-safe migration pre-step for Vercel builds.
 *
 * Why this exists: the production database was bootstrapped by a dev-mode
 * schema push, which writes a `dev` row with `batch = -1` into
 * `payload_migrations` and leaves every real migration UNTRACKED. When
 * `payload migrate` runs in the build it sees that marker, prompts
 * interactively ("It looks like you've run Payload in dev mode..."), and hangs
 * forever on a non-TTY CI machine. If you auto-answer "yes", Payload then
 * re-runs the *entire* migration chain (plain `CREATE TABLE`/`CREATE TYPE`)
 * against the already-pushed schema and fails with "already exists" errors.
 *
 * Fix: baseline the pushed schema. Any migration file that already exists in
 * the database (created by the dev push) is recorded in `payload_migrations`
 * so `payload migrate` skips it, and the stale `dev` marker is removed so the
 * interactive prompt never fires. Only genuinely pending migrations (newer
 * than the last push) run.
 *
 * Safe to run on every build — it is idempotent: on a clean/migrated DB it
 * does nothing; on a dev-pushed DB it tracks exactly the migrations whose
 * schema is already present (all but the newest migration file).
 */
import { readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = resolve(here, '../src/migrations')

async function connect(url) {
  const base = { connectionString: url }
  // Try plain first (local Postgres), fall back to TLS for managed hosts.
  try {
    const c = new pg.Client(base)
    await c.connect()
    return c
  } catch (err) {
    if (String(err.code || '').startsWith('28')) throw err // auth failure — don't retry
    const c = new pg.Client({ ...base, ssl: { rejectUnauthorized: false } })
    await c.connect()
    return c
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('[ci-migrate] DATABASE_URL not set — skipping baseline (migrate step runs as-is)')
    return
  }
  // Payload tracks migrations by file name WITHOUT the .ts extension.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
  if (!files.length) {
    console.log('[ci-migrate] no migration files — nothing to do')
    return
  }
  // The newest migration file is the one the dev push does NOT contain yet.
  const newest = files[files.length - 1]

  const client = await connect(process.env.DATABASE_URL)
  try {
    let tracked = []
    try {
      const r = await client.query('SELECT name, batch FROM payload_migrations')
      tracked = r.rows
    } catch (err) {
      if (String(err.code) === '42P01') {
        console.log('[ci-migrate] payload_migrations table missing (fresh DB) — nothing to baseline')
        return
      }
      throw err
    }
    const devPushed = tracked.some((m) => Number(m.batch) === -1)
    if (!devPushed) {
      console.log('[ci-migrate] no dev-mode marker — nothing to baseline')
      return
    }

    const trackedNames = new Set(tracked.map((m) => m.name))
    const toBaseline = files.filter((f) => !trackedNames.has(f) && f !== newest)
    if (toBaseline.length) {
      for (const name of toBaseline) {
        await client.query('INSERT INTO payload_migrations (name, batch) VALUES ($1, $2)', [name, 1])
      }
      console.log(`[ci-migrate] baselined ${toBaseline.length} dev-pushed migration(s): ${toBaseline.join(', ')}`)
    } else {
      console.log('[ci-migrate] all non-pending migrations already tracked — nothing to baseline')
    }

    await client.query("DELETE FROM payload_migrations WHERE batch = -1")
    console.log('[ci-migrate] removed dev-mode marker — payload migrate will run non-interactively')
  } catch (err) {
    console.error('[ci-migrate] FAILED:', err.message)
    process.exit(1)
  } finally {
    await client.end().catch(() => {})
  }
}

main()
