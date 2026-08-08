#!/usr/bin/env -S tsx
/**
 * CI-safe migration reconciler for Vercel builds (run in `prebuild`).
 *
 * Why: the production database was bootstrapped by a dev-mode schema push.
 * That (a) leaves `payload_migrations` holding a `dev` row with `batch = -1`
 * instead of real migration tracking, which makes `payload migrate` prompt
 * interactively ("It looks like you've run Payload in dev mode…") and hang
 * forever on a non-TTY CI machine, and (b) means the actual schema in the DB
 * can be AHEAD of, BEHIND of, or partial relative to the migration chain — a
 * migration that was never run (e.g. the gamification schema) silently does
 * not exist in prod while still being marked as applied.
 *
 * Strategy — apply-or-baseline reconciliation. Every migration file is
 * attempted in order inside a transaction:
 *   - the migration runs cleanly          -> keep it (schema now present)
 *   - it fails with an "already exists"   -> its schema is already present;
 *     SQLSTATE (table/type/column/index/    roll back and mark it baselined
 *     constraint/unique)
 *   - it fails for any other reason       -> roll back, log loudly, exit 1
 *
 * This converges ANY database state onto the migration chain and is
 * idempotent: on a healthy DB every attempt fails fast on its first duplicate
 * statement and rolls back (a few ms each). The stale `dev` marker is deleted
 * so `payload migrate` never prompts. All migrations in this repo are pure
 * `db.execute(sql\`...\`)` with literal SQL (audited), so a plain pg client
 * with a small drizzle-SQL serializer is sufficient — no Payload instance.
 */
import { readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = resolve(here, '../src/migrations')

/** SQLSTATEs meaning "this object already exists" → baseline instead of fail. */
const ALREADY_EXISTS_CODES = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object (types, domains, constraints)
  '42723', // duplicate_function
  '42P04', // duplicate_database
  '23505', // unique_violation (idempotent data backfills)
])

/**
 * For DROP-type migrations, "object does not exist" (42P01 / 42703) means the
 * drop already happened — the migration is effectively applied, so baseline.
 * (All migrations here have a `down()` full of DROPs, so we scan only the
 * `up()` body to decide.)
 */
const DROP_ALREADY_APPLIED_CODES = new Set(['42P01', '42703'])

function isDropTypeUp(source: string): boolean {
  const upStart = source.indexOf('function up(')
  const body = source.slice(
    upStart === -1 ? 0 : upStart,
    source.indexOf('export async function down'),
  )
  return /\bDROP\b/i.test(body)
}

/**
 * Serialize a drizzle `sql` template object (it has no toSQL(); it stores
 * `queryChunks`). String chunks carry `value: string[]`; parameter chunks are
 * array-like with the value at `[0]`; `sql.raw()`/nested templates recurse.
 */
function serializeSql(stmt: any): { sql: string; params: any[] } {
  const params: any[] = []
  const sql = chunksToString(stmt?.queryChunks, params)
  return { sql, params }
}

function chunksToString(chunks: any[] | undefined, params: any[]): string {
  if (!Array.isArray(chunks)) return ''
  let out = ''
  for (const c of chunks) {
    if (Array.isArray(c.value) && c.value.every((v: any) => typeof v === 'string')) {
      out += c.value.join('')
    } else if (Array.isArray(c.queryChunks) && c.queryChunks.length) {
      out += chunksToString(c.queryChunks, params) // sql.raw() / nested template
    } else {
      params.push(c.value !== undefined ? c.value : c[0])
      out += `$${params.length}`
    }
  }
  return out
}

async function connect(url: string): Promise<pg.Client> {
  const base = { connectionString: url }
  try {
    const c = new pg.Client(base)
    await c.connect()
    return c
  } catch (err: any) {
    if (String(err.code || '').startsWith('28')) throw err // auth — don't retry
    const c = new pg.Client({ ...base, ssl: { rejectUnauthorized: false } })
    await c.connect()
    return c
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log('[ci-migrate] DATABASE_URL not set — skipping reconcile (payload migrate handles it)')
    return
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
  if (!files.length) {
    console.log('[ci-migrate] no migration files — nothing to do')
    return
  }

  const client = await connect(process.env.DATABASE_URL)
  try {
    let tracked = new Set<string>()
    let devMarker = false
    try {
      const r = await client.query('SELECT name, batch FROM payload_migrations')
      tracked = new Set(r.rows.map((x: any) => x.name))
      devMarker = r.rows.some((x: any) => Number(x.batch) === -1)
    } catch (err: any) {
      if (String(err.code) === '42P01') {
        console.log('[ci-migrate] payload_migrations missing (fresh DB) — nothing to reconcile')
        return
      }
      throw err
    }

    const dbShim = {
      execute: async (stmt: any) => {
        const { sql, params } = serializeSql(stmt)
        return client.query(sql, params.length ? params : undefined)
      },
    }

    let applied = 0
    let baselined = 0
    for (const name of files) {
      const source = readFileSync(resolve(MIGRATIONS_DIR, `${name}.ts`), 'utf8')
      const dropTypeUp = isDropTypeUp(source)
      const tolerated = dropTypeUp
        ? new Set([...ALREADY_EXISTS_CODES, ...DROP_ALREADY_APPLIED_CODES])
        : ALREADY_EXISTS_CODES
      const mod = await import(`../src/migrations/${name}.ts`)
      if (typeof mod.up !== 'function') {
        console.error(`[ci-migrate] migration ${name} exports no up() — aborting`)
        process.exit(1)
      }
      let outcome: 'applied' | 'baselined' = 'applied'
      try {
        await client.query('BEGIN')
        await mod.up({ db: dbShim, payload: undefined, req: undefined })
        await client.query('COMMIT')
        applied++
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {})
        if (tolerated.has(String(err.code))) {
          outcome = 'baselined'
          baselined++
        } else {
          console.error(`[ci-migrate] ${name} FAILED (${err.code || '?'}): ${err.message}`)
          process.exit(1)
        }
      }
      if (!tracked.has(name)) {
        await client.query('INSERT INTO payload_migrations (name, batch) VALUES ($1, $2)', [name, 1])
        tracked.add(name)
      }
      console.log(outcome === 'applied' ? `[ci-migrate] APPLIED   ${name}` : `[ci-migrate] baselined ${name} (already present)`)
    }

    if (devMarker) {
      await client.query("DELETE FROM payload_migrations WHERE batch = -1")
      console.log('[ci-migrate] removed dev-mode marker — payload migrate will run non-interactively')
    }
    console.log(`[ci-migrate] reconcile done — ${applied} applied, ${baselined} already-present (${files.length} total)`)
  } finally {
    await client.end().catch(() => {})
  }
}

main()
