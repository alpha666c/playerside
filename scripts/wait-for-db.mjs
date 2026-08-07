#!/usr/bin/env node
/**
 * wait-for-db.mjs — prebuild guard for builds that need Postgres.
 *
 * `next build` inits Payload, which needs Postgres to collect SSG page data
 * (the /[slug] review page). If the DB is briefly unreachable (Docker Desktop
 * waking up, port-forwarding hiccup, machine resume), the build dies with a
 * cryptic:
 *
 *   Error: cannot connect to Postgres: connect ECONNREFUSED 127.0.0.1:5432
 *
 * This guard polls DATABASE_URL with clear, actionable output and a hard
 * deadline, so the failure mode becomes "start Docker, then rebuild" instead
 * of a raw stack trace buried in build output.
 *
 * Env:
 *   DATABASE_URL             — required (same value Payload reads)
 *   WAIT_FOR_DB_TIMEOUT_MS   — optional, default 45000
 *   WAIT_FOR_DB_INTERVAL_MS  — optional, default 1500
 */
import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    '[wait-for-db] FATAL: DATABASE_URL is not set — Payload cannot init and `next build` will fail. Set DATABASE_URL (e.g. in .env) and retry.',
  )
  process.exit(1)
}

const timeoutMs = Number(process.env.WAIT_FOR_DB_TIMEOUT_MS ?? 45_000)
const intervalMs = Number(process.env.WAIT_FOR_DB_INTERVAL_MS ?? 1_500)
let host = '(unknown)'
try {
  host = new URL(url).host
} catch {
  // non-URL connection strings (e.g. unix sockets) — keep the placeholder
}
const deadline = Date.now() + timeoutMs

async function tryConnect() {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 3_000 })
  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

console.log(`[wait-for-db] waiting for Postgres at ${host} (up to ${Math.round(timeoutMs / 1000)}s)…`)

let attempt = 0
while (Date.now() < deadline) {
  attempt += 1
  if (await tryConnect()) {
    console.log(`[wait-for-db] ok — database reachable (attempt ${attempt})`)
    process.exit(0)
  }
  const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000))
  console.log(`[wait-for-db] attempt ${attempt} failed — retrying (${remaining}s left)`)
  await new Promise((r) => setTimeout(r, intervalMs))
}

console.error(
  `[wait-for-db] FATAL: could not reach Postgres at ${host} after ${Math.round(timeoutMs / 1000)}s.`,
)
console.error('  Likely cause: Docker Postgres is not running (check `docker ps` for playerside-pg).')
console.error('  Fix: `docker start playerside-pg` (or start Docker Desktop), then re-run the build.')
process.exit(1)
