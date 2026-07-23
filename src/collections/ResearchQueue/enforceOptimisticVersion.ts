import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

/**
 * Optimistic-concurrency gate for `research-queue`
 * (docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md
 * §3.1 — Design 1). Runs first in the beforeChange chain, before
 * enforceStatusTransition.
 *
 * Opt-in, not mandatory: a caller that omits `req.context.expectedVersion`
 * gets today's unchanged behavior (no conflict check) — this preserves
 * the current, working, single-writer admin-panel edit flow, which has
 * no way to populate a custom context value without dedicated admin UI
 * work (out of scope for this backend-only phase; DECISION-LOG.md
 * already notes single-writer, single-session use "is not at risk"). A
 * caller that DOES supply `expectedVersion` (any future concurrency-
 * aware writer) gets a real, atomic guarantee.
 *
 * Deliberate deviation #1 from the spec's stated mechanism: the spec
 * assumed this check could run inside the same Postgres transaction
 * Payload's own updateByID/update operation already opened for this
 * request. Tracing Payload's actual public API surface during
 * implementation found no documented, stable way to obtain that
 * transaction-scoped connection from a hook — `payload.db.drizzle` and
 * `payload.db.pool` are the adapter's shared, non-transactional handles
 * (Payload's own docs describe `payload.db.drizzle` as "the full power
 * of Drizzle... for use if you need it" — the global instance, not a
 * per-request one). This hook runs its check-and-bump as its own,
 * self-contained atomic statement via `payload.db.pool`. Accepted
 * trade-off: if this statement succeeds but a LATER, unrelated hook or
 * validation in the same request fails and the outer transaction rolls
 * back, the version number will have incremented with no corresponding
 * content change (a harmless "gap", not data loss) — the only visible
 * effect is an immediate retry with the same stale expectedVersion
 * needing one extra refetch, which the caller needed anyway.
 *
 * Deliberate deviation #2, discovered empirically while writing the
 * abuse-script's staggered-retry case (not anticipated by the spec):
 * `data` is NOT a sparse partial payload by the time a collection-level
 * `beforeChange` hook runs. Payload's FIELDS-level `beforeValidate` step
 * runs first, unconditionally, and already merges the caller's partial
 * `data` onto `originalDoc` — so every field in the schema is already
 * present in `data`, including ones the caller never touched, populated
 * from `originalDoc` (captured before this hook, and therefore stale
 * under contention). A naive "only backfill keys missing from `data`"
 * approach is a no-op, because no key is ever missing. There is no
 * documented collection-level hook that runs before this fields-level
 * merge, so this hook cannot distinguish "the caller's real intent" from
 * "Payload's own stale backfill" by inspecting `data` alone.
 *
 * The fix: require the caller to also declare `req.context.changedFields`
 * — the exact top-level keys it actually intends to change (this hook
 * throws if `expectedVersion` is present without it). For every OTHER
 * field, this hook unconditionally overwrites `data` with a freshly
 * re-read value (see the dataloader-caching note below); for the
 * declared `changedFields`, `data`'s value is trusted as-is, since
 * Payload's own merge never overwrites a field the caller explicitly
 * supplied.
 */
export const enforceOptimisticVersion: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (operation !== 'update') return data

  const expectedVersion = req.context?.expectedVersion
  if (expectedVersion === undefined || expectedVersion === null) return data

  if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion)) {
    throw new APIError('expectedVersion must be an integer.', 400)
  }

  const changedFields = req.context?.changedFields
  if (!Array.isArray(changedFields) || changedFields.length === 0 || !changedFields.every((f) => typeof f === 'string')) {
    throw new APIError('req.context.changedFields (a non-empty string array of the top-level fields you intend to change) is required alongside expectedVersion.', 400)
  }

  const id = originalDoc?.id
  if (!id) return data

  const pool = (req.payload.db as unknown as { pool: { query: (sql: string, params: unknown[]) => Promise<{ rowCount: number; rows: Array<{ version: number }> }> } }).pool

  const result = await pool.query('UPDATE research_queue SET version = version + 1 WHERE id = $1 AND version = $2 RETURNING version', [
    id,
    expectedVersion,
  ])

  if (result.rowCount === 0) {
    throw new APIError(
      'This case file was changed by someone else since you loaded it. Reload the latest version and reapply your change.',
      409,
    )
  }

  // Rebase every field the caller did NOT declare as changed onto a
  // genuinely fresh read. Deliberately NOT passing `req` to findByID:
  // Payload's Local API reuses `req.payloadDataLoader` when a `req` is
  // forwarded (createLocalReq.js: `req.payloadDataLoader =
  // req?.payloadDataLoader || getDataLoader(req)`), which would return
  // the document already cached for this request by updateByID.js's own
  // initial read — not a new query. Omitting `req` gets a brand-new
  // local request with its own empty dataloader, forcing a real query
  // against current committed state.
  const freshDoc = (await req.payload.findByID({ id, collection: 'research-queue', depth: 0 })) as unknown as Record<string, unknown> | null
  const typedData = data as Record<string, unknown>
  const changedFieldSet = new Set(changedFields)
  if (freshDoc) {
    for (const [key, value] of Object.entries(freshDoc)) {
      if (!changedFieldSet.has(key)) {
        typedData[key] = value
      }
    }
  }
  typedData.version = result.rows[0]?.version

  return data
}
