# Handoff — Research-Queue Optimistic Concurrency (Implementation)

Date: 2026-07-23
Stage completed: Implemented, tested, and deployed Design 1 from `docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md` — with two material corrections discovered during implementation, documented below and in `docs/review-system/DECISION-LOG.md`
Next stage: Owner review of the corrections (particularly the new `changedFields` requirement, which every future concurrency-aware caller must know about); RLS/grants and the role-file merge remain the only other preconditions before the still-deferred AI route
Next agent role: n/a — this is an implementation handoff, not a case-pipeline handoff

---

## What Was Done

Implemented the spec's Design 1 (optimistic concurrency via a `version` field). The implementation required two corrections beyond what the spec anticipated, both discovered empirically while getting the abuse script's new test cases to actually pass — not just theorized.

### Schema

Added `research_queue.version` (`numeric`, `NOT NULL DEFAULT 1`) via migration `20260723_002255_add_research_queue_version` — purely additive, applied directly (table was empty in every environment, confirmed before applying). No other column touched.

### Code

- `src/collections/ResearchQueue/enforceOptimisticVersion.ts` (new) — the concurrency gate, wired as the **first** `beforeChange` hook, before `enforceStatusTransition`.
- `src/collections/ResearchQueue/index.ts` — added the `version` field (admin-hidden, `readOnly`, `defaultValue: 1`, deliberately **not** `required: true` — see "Why not required" below) and wired the new hook.

### Correction A — no stable way to share Payload's own transaction

The spec assumed the version check-and-bump could run inside the same Postgres transaction Payload's `updateByID` operation already opened for the request. Tracing Payload's actual public surface (`payload.db.drizzle`, `payload.db.pool`, and the internal-only `getTransaction(adapter, req)` Payload's own core uses) found no documented, stable way to obtain that transaction-scoped connection from a hook. Confirmed via Payload's own docs (`payload.db.drizzle` — "the full power of Drizzle... for use if you need it," describing the shared global instance) and by fetching the docs page directly and asking specifically whether a request-scoped handle is documented (it is not).

The hook runs its check-and-bump as its own, self-contained atomic statement via `payload.db.pool`:

```sql
UPDATE research_queue SET version = version + 1 WHERE id = $1 AND version = $2 RETURNING version
```

**Accepted trade-off:** if this statement succeeds but a *later*, unrelated hook or validation in the same request throws and the outer transaction rolls back, the version number will have incremented with no corresponding content change — a harmless gap in the version sequence, not data loss (the caller's own write still correctly fails and is told so). No such later-failure scenario currently exists in this collection's hook chain (`enforceStatusTransition` throws *before* any content change would matter, and it runs after this hook) — this is a latent characteristic to keep in mind if more `beforeChange` hooks are added later, not an active bug today.

### Correction B — `data` is never actually a sparse partial payload (the significant one)

This is the discovery that took real digging, not something either the spec or the initial implementation anticipated. Building the abuse script's "staggered read-then-write with retry" test case (§4.1/§4.2 of the spec) kept failing in a way that looked like data loss even *after* the version-conflict detection itself was proven airtight (the simpler "5 fully simultaneous writers" case passed cleanly on the first working version of the hook — exactly 1 succeeds, 4 rejected with a clear error, audit trail exact).

Root cause, traced by instrumenting the hook directly: Payload's **fields-level** `beforeValidate` step runs before *any* collection-level hook (confirmed in `utilities/update.js`: `data = await beforeValidate({..., data, doc: originalDoc, ...})` runs first, unconditionally) and merges the caller's partial update onto `originalDoc` right there. By the time a collection `beforeChange` hook runs, `data` already contains a value for *every* schema field — not just the ones the caller intended to change — with the untouched ones sourced from `originalDoc`, which is stale under contention. A hook that tries to infer caller intent from `Object.keys(data)` finds every key present and can't tell "the caller set this" from "Payload backfilled this from a stale read."

**Fix:** the caller must now also pass `req.context.changedFields` — an explicit array of the top-level field names it intends to change — alongside `req.context.expectedVersion`. The hook:
1. Throws a 400 if `expectedVersion` is present without a non-empty `changedFields` array (fail loud, not silently skip the protection).
2. Trusts `data`'s value for any field named in `changedFields` (Payload's own merge never overwrites a field the caller explicitly supplied — only backfills ones it didn't).
3. Unconditionally overwrites every *other* field in `data` with a value from a fresh re-read of the row, taken *after* the version bump succeeds.

A third, related finding: step 3's "fresh" read must not forward the hook's own `req` to `payload.findByID` — Payload's Local API reuses a per-request `DataLoader` (`createLocalReq.js`: `req.payloadDataLoader = req?.payloadDataLoader || getDataLoader(req)`), which would transparently return the document Payload already cached earlier in *this same request* (`updateByID.js`'s own initial read) instead of issuing a new query — silently defeating the refresh. Confirmed by direct instrumentation: with `req` forwarded, the "staggered" test case failed consistently regardless of retry backoff (tried 15ms and 500ms gaps — no difference, which was itself the tell that the bug wasn't timing-related); omitting `req` fixed it immediately and has passed on every subsequent run.

**This is a new, required part of the concurrency-aware update contract, not in the original spec.** Any future caller — the abuse script's updated test cases, and eventually the still-deferred AI route — must supply `changedFields`, not just `expectedVersion`.

### Why `version` is not `required: true` on the field

Marking it `required: true` breaks Payload's generated TypeScript types for every existing `payload.create()` call across `scripts/verify-abuse-and-concurrency.ts`, `verify-case-governance.ts`, and `verify-governance-hardening.ts` (none of which set `version` explicitly, correctly relying on the collection's `defaultValue`). Real `NOT NULL` enforcement lives in the migration's DB constraint; the field-level flag only affects TypeScript's create-input shape and would have forced unrelated churn across three files for no behavioral gain.

## Evidence

### Local test matrix

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `pnpm run test:int` (4 files, 24 tests total, incl. 7 new in `tests/int/research-queue-concurrency.int.spec.ts`) | 24/24 pass |
| `scripts/verify-abuse-and-concurrency.ts` | **All checks pass**, including the corrected/extended §6 (legacy no-op control, fully-simultaneous 5-writer collision, staggered-retry-with-convergence, sequential-single-writer control) — re-run 4 consecutive times with no flake after Correction B landed |
| `scripts/verify-commission-wall.ts` | PASS |
| `scripts/verify-public-api-exposure.ts` | PASS |
| `scripts/verify-case-governance.ts` | PASS |
| `scripts/verify-governance-hardening.ts` | PASS |
| `scripts/verify-logging.ts` | PASS |
| `pnpm run build` | Clean |

### e2e flake — investigated, confirmed pre-existing, not a regression

`pnpm run test:e2e` intermittently failed in `tests/e2e/admin.e2e.spec.ts` (dashboard/list-view/edit-view navigation — none of which touch `research-queue`) with varying Next.js dev-mode runtime error signatures across different runs (`chunk.reason.enqueueModel is not a function`, `Cannot assign to read only property 'i18n'`). Given the failing tests exercise `users`/`pages`, not `research-queue`, a direct **A/B test** was run: `git stash` + moving the new files aside to get a byte-for-byte pre-change baseline, then running the identical e2e suite against it. **The baseline also failed**, on a *different* sub-test each of two runs, with the same class of Next.js/Turbopack dev-mode error. This confirms the flake is pre-existing and environmental (consistent with prior sessions' documented findings about this exact Next.js version's dev-mode instability), not caused by this change. Changes were restored immediately after the A/B comparison; nothing about this investigation altered the shipped code.

### Database

Migration applied directly to the shared Supabase Postgres project (same one used by local dev and the Vercel deployment). Confirmed via `list_tables`/`execute_sql`: `research_queue.version` exists, `numeric`, default `1`. All test-created rows (`research_queue`, `operators`, `users`, `agent_logs`) confirmed back to their pre-test row counts after every test run, including a residue cleanup of `agent_logs` entries from earlier iterations of this session's own test development (the audit trail is intentionally immutable/append-only in normal operation; these were this session's own scratch-test entries, not real audit history, and were removed the same way `verify-abuse-and-concurrency.ts` already cleans up its own test-created entries).

## Conflicts Surfaced

None against `MASTER-BLUEPRINT.md` or the committed role files. `enforceStatusTransition`'s existing stage-gate behavior is unaffected (verified by a dedicated regression test) and runs unmodified, second in the `beforeChange` chain.

## Next Action

The `changedFields` + `expectedVersion` context contract needs to be known by whoever eventually builds the AI chat route (`docs/review-system/DECISION-LOG.md`, "AI route/UI remains deferred") — that route remains unbuilt, and this fix removes one of its three preconditions, not all three. RLS/grants and the role-file merge remain open, untouched by this change.
