# Spec — Research-Queue Concurrency: Diagnosis and Safe-Write Design

Date: 2026-07-23
Stage completed: Diagnosis (re-run + source-level trace) and design spec only — no code, migrations, or Supabase/RLS changes
Next stage: Owner review of this spec (in particular §2.4's correction to the previously-recorded "zero-migration fix" hypothesis); if approved, a separate, later implementation phase (see "Definition of Ready" below)
Next agent role: n/a — this is a design/governance handoff, not a case-pipeline handoff

This document follows the Handoff File Standard in `docs/review-system/MASTER-BLUEPRINT.md` §11, adapted for a design spec rather than a case-stage handoff (no `#PS-YYYY-NNN` case number applies).

---

## 1. Precondition Confirmation

HEAD on `origin/main`, confirmed via `gh api repos/alpha666c/playerside/commits/main`: **`c84681cdd05607a2db58e51c062615c090f9eca1`**, top commit `docs: read-only orphan-evidence reconciliation spec`. Local `git log -1` matches exactly; working tree clean apart from the pre-existing untracked `.claude/`.

Re-read before writing this spec: `docs/review-system/MASTER-BLUEPRINT.md` §3 (Review Pipeline — Stage Flow), §9.2 (`ResearchQueue` field spec), and §11 (Handoff File Standard); `docs/review-system/DECISION-LOG.md`'s "ResearchQueue optimistic concurrency required before multi-writer workflows" and "AI route/UI remains deferred" entries; `scripts/verify-abuse-and-concurrency.ts` in full; `src/collections/ResearchQueue/index.ts` in full; and, going beyond the precondition's explicit list because the diagnosis required it, Payload core's `updateByID.js`, `update.js` (bulk/where-based operation), `utilities/update.js`, and the `@payloadcms/drizzle` adapter's `updateOne.js`/`upsertRow` — all read fresh this session, not recalled from memory.

---

## 2. Concurrency Failure Diagnosis

### 2.1 Re-run of `scripts/verify-abuse-and-concurrency.ts`

Ran twice this session. Both runs isolate to **exactly one failing check**, every other check passing:

```
FAIL — concurrency: all 5 concurrent field writes landed (no lost updates)
PASS — concurrency: exactly 5 case_updated audit events (exactly-once, no duplicates/drops)
```

Diagnostic output (the script logs which of the 5 fields actually landed):

- Run 1: `[["licenseNumber",false],["licenseJurisdiction",false],["assignedReviewer",true],["operatorUrl",false],["operatorName",false]]`
- Run 2: `[["licenseNumber",false],["licenseJurisdiction",true],["assignedReviewer",false],["operatorUrl",false],["operatorName",false]]`

**Exact scenario:** the script creates one `research-queue` document, then fires 5 concurrent `payload.update()` calls via `Promise.all`, each targeting the **same document ID** but each writing to a **different single field** (`licenseNumber`, `licenseJurisdiction`, `assignedReviewer`, `operatorUrl`, `operatorName` — no field overlap between the 5 writers). **Actors:** all 5 are the same Local-API caller (the verification script itself, using default/privileged access) — the failure is not access-control-related, it is a pure data-race between concurrent writers, however many/whichever actors they are. **Fields lost:** in both runs, exactly 4 of the 5 intended field changes are silently discarded; exactly 1 survives, and which one survives is non-deterministic (different field wins each run) — consistent with "whichever request's write happens to commit last, wins entirely," not any deterministic ordering, precedence, or merge logic.

**The audit trail is not part of the bug — it correctly logs all 5 attempts** (`case_updated` × 5, confirmed both runs), which at first glance looks contradictory ("if 5 changes were logged, why does only 1 field show the change?"). §2.3 explains exactly why this is not a contradiction.

### 2.2 Source-level trace: why this happens

Traced through the actual installed Payload/drizzle source (not assumed from documentation), specifically because a prior session's hypothesis about the fix (see §2.4) turned out to need correction once actually traced.

1. **`payload.update()` for a single ID → `updateByID.js`.** Each call opens its **own** database transaction (`initTransaction(args.req)`), independent of the other 4 concurrent calls. It then reads the current row via `getLatestCollectionVersion(...)` — a **plain `SELECT`, no `FOR UPDATE`, no row lock**. This happens once, near-simultaneously, across all 5 concurrent calls, so most or all of them read essentially the same "before" state.
2. **`utilities/update.js`'s `updateDocument()`.** The incoming partial `data` (e.g. just `{ licenseNumber: 'CONCURRENT-LIC-01' }`) is merged, via Payload's field-hooks pipeline (`beforeChange`), onto that stale full-document read (`originalDoc`). Critically, **the output of this merge is the entire document, not a diff** — every field the collection defines, not just the one the caller touched.
3. **The write is a full-row overwrite, not a partial column update.** `dataToUpdate = { ...result }` (the whole merged document) is passed to `req.payload.db.updateOne({ id, data: dataToUpdate, ... })`. Tracing into `@payloadcms/drizzle`'s `updateOne.js` → `upsertRow`: the actual SQL is `drizzle.update(table).set(row).where(eq(table.id, id))` — an **unconditional `UPDATE ... WHERE id = $1`**, no version/timestamp guard, no re-check of anything about the row's current state at write time.
4. **Collection hooks add no protection.** `research-queue`'s own `beforeChange` hook (`enforceStatusTransition`) validates `data.status` transitions using the same stale `originalDoc` Payload already read — it adds business-rule validation, not concurrency control. Nothing in `research-queue`'s hook chain performs a locking read, a version check, or a conditional write.

**Net effect:** each of the 5 concurrent writers independently computes "the whole document, with my one field changed, based on a stale snapshot" and unconditionally overwrites the row with that snapshot. Whichever writer's transaction *commits last* wins completely — its snapshot (reflecting only its own change layered on the stale base) becomes the final row, silently discarding every other writer's change, because none of those other fields were present in the *last* writer's in-memory snapshot. This is why exactly one field survives, and why it's non-deterministic which one.

### 2.3 Why the audit log shows 5 events despite 1 field surviving (not a separate bug)

`auditCaseFileChanges` (an `afterChange` hook) runs **inside each writer's own transaction**, comparing that same transaction's `previousDoc` (its own stale read) against `doc` (its own merged result) — it correctly detects and logs its own single-field diff, and that `logEvent()` write commits as part of that same transaction, before any *later* transaction's write ever touches the row. Each of the 5 audit events is therefore a true, accurate record of "this transaction believed it made this one change" — the discrepancy with final state is fully explained by §2.2's mechanism (a later transaction's full-row overwrite erasing an earlier transaction's already-committed change), not by any flaw in the audit-logging hook itself.

### 2.4 Root cause, plain language

**Non-locking read-modify-write with a full-document overwrite, and no compare-and-swap guard at the write.** Every `payload.update()` call reads the entire current document without locking it, merges its own change into a private in-memory copy of the *whole* document, and writes that whole copy back unconditionally. It is not a partial-merge bug and not a crash — it is a full-row overwrite race, and the last writer to commit always wins outright.

**Correction to a previously-recorded hypothesis:** `docs/review-system/DECISION-LOG.md`'s "ResearchQueue optimistic concurrency required before multi-writer workflows" entry (2026-07-22) proposed "a zero-migration fix... a `where`-based compare-and-swap using the existing `updatedAt` field... the `where`-based 'many' update variant supports it and returns 0 matched docs on a stale write." **This session traced Payload's actual bulk/`where`-based `update` operation (`collections/operations/update.js`) and found this does not hold.** That operation's `where` filter (e.g. `id = X AND updatedAt = expected`) is applied only at an initial `payload.db.find()` **read** step; the documents matched by that read are then each passed into the *same* `updateDocument()`/`db.updateOne()` path traced in §2.2, which performs its own unconditional `UPDATE ... WHERE id = $1` with **no re-check of `updatedAt`** at the write itself. There is a real time-of-check-to-time-of-use gap between the `where`-filtered read and the unconditional-by-id write (hook execution, including async audit logging, happens in between). **Using Payload's built-in `where`-based update as a CAS mechanism would narrow the race window slightly but would not close it — it is not safe to implement as originally described, and §3 proposes a corrected design instead.** This correction is itself a concrete, source-grounded deliverable of this diagnosis, not a restatement of the prior entry.

---

## 3. Specification for a Safe Write Model

Two candidate designs, per the task's requested menu (optimistic concurrency with a version field; server-side locking). A third menu option — "constrained update primitives that avoid read-modify-write" — is addressed as *not independently viable* given §2.4's finding: Payload's own update pipeline always performs a full-document read-modify-write internally (§2.2 step 2–3), for every operation, regardless of caller intent; there is no Payload-native way to issue a narrower "set exactly these columns, conditionally" primitive without either bypassing Payload's document pipeline entirely (a much larger change, discarding hooks/validation/access-control for this collection) or wrapping it with an external atomic guard, which is exactly what Design 1 below does.

### 3.1 Design 1 (Preferred) — Optimistic concurrency via an explicit `version` field, enforced by an atomic conditional statement in a `beforeChange` hook

**Why a new field, not `updatedAt`:** §2.4's correction shows `updatedAt` cannot serve as a safe CAS token through Payload's *built-in* update operations. A dedicated integer version column, whose atomicity is enforced by a manually-issued SQL statement (not Payload's own update path), sidesteps that gap entirely — the atomicity comes from a single Postgres statement, not from Payload's multi-step operation.

**Schema (plan only, no migration in this task):**
- Add `version: number` to `ResearchQueue` — `required: true`, `defaultValue: 1`, admin-hidden or read-only in the UI (it's a concurrency token, not editorial data).
- No change to any other field. No change to `Operator`, `Media`, or any other collection.

**Update API shape:**
- Every caller that intends to write to a `research-queue` document must have first read its current `version` (any normal `payload.find`/`findByID` call already returns it once the field exists — no new read API needed).
- The write call includes the expected version, e.g. `payload.update({ id, collection: 'research-queue', data: { ...changes }, context: { expectedVersion: <version the caller read> } })` (or an equivalent `data.expectedVersion` transient field stripped before persistence — exact plumbing is an implementation-phase decision, not fixed here).
- A new `beforeChange` hook, running **before** `enforceStatusTransition` in the hook order, performs a single, manually-issued, atomic statement against the transaction's own connection (Payload exposes this via `req.payload.db.drizzle`/`req.payload.db.pool`, confirmed present on the installed `@payloadcms/db-postgres` adapter's type definitions — this is not a new dependency, just direct use of an already-exposed handle) equivalent to:
  ```sql
  UPDATE research_queue SET version = version + 1 WHERE id = $1 AND version = $2 RETURNING version
  ```
  If this statement affects 0 rows, the hook throws (see failure behavior below) **before** any of the collection's existing field-level data is touched, and before `enforceStatusTransition` or any other hook runs — the whole `update` operation aborts and its transaction rolls back (matching the already-established, already-tested pattern in this codebase: a thrown hook error aborts the operation and its transaction — see the media-adapter work's "leaves no persisted Media record when the upload adapter fails" test for the same underlying Postgres-transaction-abort behavior applied to a different collection).
  If it succeeds, the rest of the update proceeds completely normally through Payload's existing pipeline (`enforceStatusTransition`, the field merge, the full-row write, `auditCaseFileChanges`) — Payload's subsequent full-snapshot overwrite is safe at that point precisely *because* the version bump just proved, atomically, that nobody else had changed the row since this caller's read.

**Failure behaviour (what a client sees on collision):** an `APIError` with a clear, actionable message — e.g. *"This case file was changed by someone else since you loaded it. Reload the latest version and reapply your change."* — HTTP 409-equivalent semantics (Payload's `APIError` lets a status code be specified; 409 Conflict is the natural choice, distinct from the 400s `enforceStatusTransition` already throws for stage-skipping). **No automatic merge or retry is attempted by the server** — the caller (desk researcher UI, score analyst tooling, editorial writer flow, or a future AI chat route) is responsible for re-fetching and re-applying its intended change, exactly the behavior a human editing a stale browser tab would expect, and the behavior any future automated writer (e.g. the still-deferred AI route) must be built to handle from day one rather than retrofitted later.

**Why this is preferred over Design 2:** see §3.3.

### 3.2 Design 2 (Alternative) — Server-side serialization via a Postgres advisory lock

**Schema:** none — genuinely zero-migration, since advisory locks need no table or column.

**Update API shape:** unchanged for callers. A `beforeChange` hook acquires `pg_advisory_xact_lock(hashtext('research-queue:' || id))` at the very start of the hook chain. This call **blocks** (does not fail) if another concurrent update to the *same* document ID is already mid-transaction, until that transaction commits or rolls back; it releases automatically at transaction end (that's what makes it "xact" — scoped to the transaction, no manual unlock needed, no risk of a held lock surviving a crashed process). Once acquired, the hook must **re-read the row directly** (not trust Payload's already-stale `originalDoc` read in §2.2 step 1, which happened before the lock was acquired) for any hook-level decision that depends on current state.

**Failure behaviour:** normally none — the second concurrent writer simply waits its turn, transparently, and both writers' changes land in sequence (the second writer's Payload-computed full-snapshot, if its hook correctly re-reads and re-merges against the now-current row, reflects the first writer's already-committed change). A failure only surfaces if a caller-supplied or Postgres-configured lock-wait timeout is exceeded — a rare "stuck transaction" case, not a routine concurrent-edit case.

### 3.3 Why Design 1 is the recommended default, with Design 2 noted as an alternative

Both designs solve §2's race. Design 1 is recommended because tracing this collection's **existing** hooks surfaced a concrete reason Design 2 is riskier here specifically:

- `research-queue`'s existing `afterChange` hook `syncOperatorKnownBrands` **already writes to a second collection** (`operators`) from within a `research-queue` update — a real, currently-shipping cross-collection write pattern (confirmed by reading `src/collections/ResearchQueue/index.ts`, unchanged since it was built). Introducing per-document advisory locks (Design 2) into a collection whose hooks already reach into another collection's writes creates a **lock-ordering risk**: a future change that also needed to lock an `operators` row (there is none today, but nothing prevents one being added later) could deadlock against `research-queue`'s lock if the two ever acquire in opposite orders. Design 1 introduces **no blocking locks at all** — it's a single atomic statement that either succeeds or fails immediately, with zero cross-collection lock-ordering surface.
- Design 2 also requires **auditing every existing hook that reasons about `originalDoc`** (starting with `enforceStatusTransition`) for staleness, since the lock only protects the *write*, not any hook logic that ran against Payload's pre-lock stale read — meaning Design 2's actual blast radius is "the lock, plus a correctness re-review of every existing hook," not just "add a lock." Design 1's blast radius is a single new hook that runs first and either passes or aborts the whole operation before any existing hook logic executes at all — existing hooks need no re-audit.
- Design 1's failure mode (an explicit, clearly-worded rejection) is more legible for the human-in-the-loop workflow this pipeline is built around (§4 of `MASTER-BLUEPRINT.md` — every stage after QUEUED is either a human action or a read-only agent whose output a human applies) than Design 2's silent-block-then-succeed mode, which could leave a desk researcher or Viktor unsure whether their edit actually happened or is still queued behind someone else's.

Design 2 remains documented as a legitimate alternative in case a future implementation phase weighs the trade-offs differently (e.g. if automatic-retry UX becomes more valuable than explicit-conflict UX once real usage patterns are known).

---

## 4. Testing and Audit Requirements

### 4.1 Test matrix for a future implementation to satisfy

| Layer | Test | Proves |
|---|---|---|
| Unit/integration (`tests/int/`) | Two sequential updates with the *correct* current version each succeed and the version increments each time. | Normal single-writer operation is unaffected. |
| Unit/integration | Two updates issued with the *same* stale version (simulating two readers who loaded the doc at the same moment) — exactly one succeeds, the other receives the explicit conflict error. | The core guarantee: a stale write is rejected, not silently merged or silently dropped. |
| Unit/integration | The existing `enforceStatusTransition` stage-gate behavior (§3 of `MASTER-BLUEPRINT.md`, "no skipping") still rejects invalid transitions **after** the version hook runs — i.e. the new hook doesn't accidentally short-circuit or reorder existing validation. | No regression to already-tested governance behavior. |
| Unit/integration | A version-check failure aborts the *entire* transaction — no partial write, no orphaned audit-log entry for a rejected write. | Matches the already-established "hook throw aborts the whole operation" pattern (media-adapter precedent) applied correctly to this collection. |
| Abuse script (`scripts/verify-abuse-and-concurrency.ts`) | The existing 5-concurrent-field-writers case (§2.1) — **re-purposed, not deleted**: instead of asserting "all 5 land" (which is the wrong invariant for a system with real concurrency control), assert "exactly 1 succeeds (the one that happens to win the version race) and the other 4 each receive the explicit conflict error, and the surviving write's field is fully intact (not partially merged)." | Confirms the fix changes *what happens* to a genuine collision — reject-with-clear-signal — rather than "no collision is possible" (which isn't actually achievable or desirable when 5 truly-concurrent writers target the *same* version). |
| Abuse script — new case | 5 concurrent writers each first `findByID` (to get a fresh version), then update — simulating "5 people opened the case file at slightly different times, not literally simultaneously." At least the first-to-write of any group sharing a version succeeds; later writers whose version is now stale get the conflict error and, upon refetch-and-retry, succeed. | Confirms the realistic multi-user workflow (read, then write, possibly staggered) works as intended, not just the artificial fully-simultaneous case. |
| Abuse script — control | A single writer performing 5 *sequential* (not concurrent) updates to 5 different fields all succeed and all land. | Confirms the fix doesn't break the common, currently-working single-writer case (explicitly the case DECISION-LOG.md already noted was safe). |

### 4.2 Integration with `scripts/verify-abuse-and-concurrency.ts` specifically

The script's existing §6 ("Concurrent CaseFile writes — transaction safety") block is the natural home for the updated assertions — no new script file is needed for this concern (unlike the orphan-reconciliation spec, which proposed a genuinely new script for a genuinely new capability). Concretely, a future implementation should:
1. Change the existing "all 5 concurrent field writes landed" assertion to the corrected invariant in the table above (exactly 1 wins, 4 get explicit conflict errors).
2. Add the "stagger read-then-write" case as a new, additional assertion in the same §6 block.
3. Keep the existing "exactly 5 `case_updated` audit events" assertion **only for the sequential-write control case** (§4.1's last row) — under true concurrency with the fix in place, only the *successful* write(s) should produce a `case_updated` event; a rejected write throws before `auditCaseFileChanges` (an `afterChange` hook) ever runs, so the correct future assertion for the concurrent case is "exactly 1 `case_updated` event, matching the 1 successful writer" — this is a deliberate, documented change to the audit-count invariant, not an oversight.

Expected pass condition once implemented: the script's overall exit code is 0 (all checks pass), replacing today's known, documented single failure.

---

## 5. Governance and Scope Control

### 5.1 Links to `MASTER-BLUEPRINT.md`

- §3 (Review Pipeline — Stage Flow) — the stage-transition validation this spec's Design 1 must not disturb (§4.1's regression test).
- §9.2 (`ResearchQueue` field spec) — the schema this spec proposes adding exactly one field to (`version`); no other field in that spec changes.
- §11 (Handoff File Standard) — the structural template this document (and its predecessor specs) follow.

### 5.2 Links to `DECISION-LOG.md`

- **"ResearchQueue optimistic concurrency required before multi-writer workflows"** (2026-07-22) — this spec is the direct, detailed follow-up to that entry, and **corrects** its stated "zero-migration fix" hypothesis per §2.4 above. A future DECISION-LOG entry, once this spec is reviewed, should record whichever design is chosen and note that the original entry's proposed mechanism was superseded, not simply "implemented as originally described."
- **"AI route/UI remains deferred"** (2026-07-22) — that entry names this exact concurrency gap as one of three preconditions before the AI chat route can be built (the AI route being "the first planned workflow that would introduce a second writer against a CaseFile concurrently with a human editing the same document"). This spec does not build that route or change its deferred status; it only specifies what "before" would look like.
- **"Private evidence storage: implemented"** and **"Direct Supabase/PostgREST exposure requires an explicit RLS/grants decision"** — both explicitly out of scope for this spec (see §5.3); neither is touched, referenced as a dependency, or affected by anything proposed here.
- **"Role-file version decision"** — unrelated; not touched.

### 5.3 Explicit non-goals (restated for this document's own record)

- No changes to RLS/grants, Supabase policies, or any Supabase configuration.
- No code changes, migrations, or Supabase policy edits performed in this task — this is a spec only.
- No changes to `media`, orphan reconciliation, or the private Blob adapter (`docs/review-handoffs/2026-07-23-orphan-evidence-reconciliation-spec.md` and `docs/review-handoffs/2026-07-22-private-evidence-storage.md` cover that surface; this document doesn't touch it).
- No Stake work — `research_queue` remains at 0 real-case rows; nothing in this diagnosis or spec required or produced any operator data.
- No role-file merge work.

---

## 6. Confirmed Facts vs. Assumptions (audit-style summary)

### Confirmed this session (read directly from source, re-run, or fetched from GitHub's API — not inherited on faith)

- HEAD SHA and top commit message, via `gh api repos/alpha666c/playerside/commits/main`.
- The single failing check in `scripts/verify-abuse-and-concurrency.ts`, re-run twice, with diagnostic output showing a different single surviving field each run (non-deterministic last-writer-wins, not a deterministic bug).
- The exact code path from `payload.update()` through `updateByID.js` → `utilities/update.js` → `@payloadcms/drizzle`'s `updateOne.js`/`upsertRow` → the literal `drizzle.update(table).set(row).where(eq(table.id, id))` SQL construction — all read directly from the installed packages this session, not recalled from a prior summary.
- **The correction to the "where-based CAS on `updatedAt`" hypothesis**: traced `collections/operations/update.js` (the bulk/`where`-based operation) directly and confirmed its `where` filter is applied only at an initial `payload.db.find()` read, with the actual per-document write still going through the same unconditional-by-id `updateOne` path — meaning the previously-recorded "zero-migration fix" would not have worked as described. This is a new, source-grounded finding from this session, not a restatement.
- `payload.db.drizzle` and `payload.db.pool` are exposed on the installed `@payloadcms/db-postgres` adapter's type definitions — confirming Design 1's manual-atomic-statement approach has a real, already-available API surface to use, not a hypothetical one.
- `research-queue`'s existing `afterChange` hook `syncOperatorKnownBrands` already performs a cross-collection write (to `operators`) from within a `research-queue` update — read directly from the current, unchanged collection file, and used as concrete grounding for preferring Design 1 over Design 2.
- `research-queue` and `operators` remain at 0 real-case rows (no Stake or other real operator data exists to be put at risk by this diagnosis work).

### Assumptions made in this spec (flagged explicitly)

- **Exact plumbing for how a caller communicates its "expected version"** (a `context` field vs. a transient `data` field stripped before persistence) is left as an implementation-phase decision — both are technically workable given what's exposed in Payload's hook `args`, and choosing between them doesn't change this spec's guarantees.
- **The precise Postgres error/response shape a real caller (future UI, future AI route) should build retry logic around** is not specified beyond "a clear `APIError` with 409-like semantics" — the actual client-side retry/refetch UX is out of scope for a backend concurrency spec and would reasonably be its own, later, separate design conversation once a real caller (beyond the abuse script) exists.
- **No real-world concurrent-writer frequency data exists** (this collection has no real cases yet — `research_queue` is at 0 rows) — this spec's designs are sized for "must not lose data when it happens," not calibrated against an observed collision rate, similar in spirit to the orphan-reconciliation spec's equivalent caveat about unknown real-world frequency.
- **That `pg_advisory_xact_lock`'s hash-collision rate (`hashtext` on a string key) is negligible for this collection's realistic document-ID cardinality** is asserted for Design 2 based on general knowledge of the function, not benchmarked in this session — a reasonable assumption for a described-but-not-recommended alternative, flagged rather than silently relied upon.

### Recommended "Definition of Ready" for a future, separate implementation phase

Before any session begins implementing Design 1 (or a revised Design 2, if that's chosen instead):
1. This spec has been reviewed and Design 1 (or an explicit alternative) approved by Viktor, with the correction in §2.4 specifically acknowledged (the original DECISION-LOG.md hypothesis needs to be superseded, not implemented as originally written).
2. The exact "expected version" plumbing (§6's first assumption) is decided, not left to the implementing session's judgment.
3. The exact `APIError` status code and message wording for a version-conflict rejection is confirmed, so it's consistent across every future caller (desk research, score analyst, editorial, and eventually the AI route) rather than invented ad hoc per caller.
4. Confirmation that this phase's scope is the version field + hook + updated abuse-script assertions **only** — explicitly not the AI chat route itself, which remains gated on this fix landing but is a separate, larger, and still-deferred piece of work per `DECISION-LOG.md`'s "AI route/UI remains deferred" entry.
5. A migration plan for the new `version` field (default value backfill for the collection's existing rows, however few) is drafted as part of that implementation session's own work, not assumed here — this spec deliberately proposes the field without writing its migration.

## Stop Point

Stopping here: diagnosis re-run and traced to source, spec written and to be committed in one docs-only commit. No code, migrations, RLS/grants changes, or edits to media/orphan-reconciliation/Blob-adapter surfaces were made. No Stake work performed.
