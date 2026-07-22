# Spec — Read-Only Orphan-Evidence Reconciliation (Private Vercel Blob Store)

Date: 2026-07-23
Stage completed: Design spec only — no code, migrations, cron jobs, or reconciliation runs
Next stage: Owner review of this spec; if approved, a separate, later implementation phase (see "Definition of Ready" below)
Next agent role: n/a — this is a design/governance handoff, not a case-pipeline handoff

This document follows the Handoff File Standard in `docs/review-system/MASTER-BLUEPRINT.md` §11, adapted for a design spec rather than a pipeline-stage handoff (no case number applies — this is infrastructure, not a `#PS-YYYY-NNN` case).

---

## 1. Problem Statement and Risk Model

### 1.1 Why this exists

`docs/review-system/DECISION-LOG.md` ("Private evidence storage: implemented (Vercel Blob, private access)", 2026-07-22) documents a known, accepted limitation of the current design:

> If `put()` succeeds but a later step in the same `afterChange` hook throws before the surrounding Postgres transaction commits, the Blob object can be orphaned (no corresponding DB row) — Vercel Blob writes aren't part of the Postgres transaction and can't be automatically rolled back.

That entry explicitly deferred any fix ("Not attempting saga/compensation logic here — out of scope"). This spec is the deferred follow-up: not a fix, but a **read-only way to find out whether the theoretical gap has produced any real orphans**, so a future decision (retain, delete, or accept) can be made from evidence instead of guesswork.

### 1.2 Where the risk actually lives (grounded in the current implementation)

Confirmed by reading `src/lib/media/vercelBlobPrivateAdapter.ts` and `src/collections/Media.ts` (unchanged since commit `e3fa638`, per `git log`):

- **One store, one namespace.** Every `media` collection document — `visibility: 'public'` or `'internal'` alike — is written to the single private Blob store `playerside-evidence`. There is currently no path prefix separating "evidence" objects from other media (`getFileKey({ filename })` is called with no `docPrefix`/`collectionPrefix`); the object's pathname in Blob is just its (Payload-sanitized) filename. **A future phase could introduce a prefix convention; this spec's inputs assume none exists today and treat the whole store as in scope.**
- **Multiple Blob objects per Media document.** `Media.ts`'s `upload.imageSizes` config generates 7 named variants (`thumbnail`, `square`, `small`, `medium`, `large`, `xlarge`, `og`) in addition to the original file. Each size is uploaded through the same `handleUpload` adapter call as a distinct object, and Payload records each variant's filename under `doc.sizes.<name>.filename` on the Media document. **A correct reconciliation must compare against the base filename and every populated `sizes.*.filename`, not just the top-level `filename`** — otherwise legitimate size variants would be misclassified as orphans.
- **Where the write can fail non-atomically.** Payload's cloud-storage plugin runs `handleUpload` from an `afterChange` hook (confirmed by reading `@payloadcms/plugin-cloud-storage`'s `hooks/afterChange.js` during the prior implementation session) — the Media DB row is created first (inside the Postgres transaction), then `put()` is called, then (if `handleUpload` returns metadata) a follow-up `payload.update()` persists it. A throw at the `put()` step itself aborts the whole operation and the transaction rolls back cleanly (empirically confirmed in `tests/int/media.int.spec.ts`'s "leaves no persisted Media record when the upload adapter fails" test — zero DB rows survive). The **narrower, unverified** gap is a throw *after* `put()` succeeds but before the surrounding transaction commits (e.g., the follow-up `payload.update()` throwing, or an unrelated later `afterChange` hook on the same collection throwing) — in that case the Blob object exists but the transaction — including the row that referenced it — rolls back, leaving a Blob object with no corresponding row at all.
- **Delete-side risk is symmetric but different in kind.** `handleDelete` calls `del()`; if `del()` itself throws, the adapter swallows the error (see the `try { await del(...) } catch {}` block, added deliberately so "deleting the DB doc must not be blocked on this") — meaning a DB row can be deleted while its Blob object silently survives. This is a **second, distinct orphan-producing path**, not covered by the DECISION-LOG entry's wording (which only discusses the upload-side case) but real given the current adapter code, and this spec's model includes it.

### 1.3 Orphan taxonomy (explicit definitions)

| Category | Definition | How it can arise |
|---|---|---|
| **Blob-only** | An object exists in the `playerside-evidence` store whose pathname does not match any `media.filename` or `media.sizes.*.filename` value in Postgres. | (a) Upload-side partial failure per §1.2; (b) a Media row was deleted through some path other than Payload's own `delete` operation (e.g. a direct DB delete bypassing the `afterDelete` hook — not expected in normal operation, but the reconciliation should not assume it can't happen); (c) a manual/testing artifact left behind (this exact class of risk was observed and cleaned up manually during the 2026-07-22 production verification and the 2026-07-22/23 audit sessions — see `docs/review-handoffs/2026-07-22-private-evidence-storage.md` and `docs/review-handoffs/2026-07-22-private-evidence-storage-audit.md`, both of which manually confirmed post-test cleanup via direct table reads rather than an automated check). |
| **DB-only** | A `media` row exists in Postgres whose `filename` (or a populated `sizes.*.filename`) has no corresponding object in the Blob store. | (d) Delete-side partial failure per §1.2 (`del()` swallowed an error, then the DB delete proceeded); (e) a row created via local-disk fallback (when `BLOB_READ_WRITE_TOKEN` was absent — see `src/plugins/index.ts`'s `enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN)` gate) whose file was never migrated into the Blob store after the token was later configured; (f) manual/test data inserted directly against Postgres, bypassing Payload entirely. |
| **Mismatch** | Both a DB row and a Blob object exist for the same filename, but a checkable property disagrees — currently: `media.filesize` vs. the Blob object's reported `size`; a future extension could add a content hash/`etag` comparison via `head()` (see §3.3 — deliberately a *lighter-weight, second-pass* check, not part of the default bulk scan). | A reupload that updated the DB row's metadata but the corresponding `handleUpload` call for some reason wrote different bytes than recorded (should not happen in normal operation; this category exists to catch the case, not because it's expected). |

This taxonomy governs `media.filename` and `sizes.*.filename` specifically because those are the only fields the current adapter (`generateURL`, `handleUpload`, `handleDelete`) uses to address objects in the store — confirmed by reading the adapter source, not assumed.

---

## 2. Reconciliation Process Definition

### 2.1 Inputs

| Input | Source | Notes |
|---|---|---|
| Blob store token | `BLOB_READ_WRITE_TOKEN` env var (same one the app already uses — no new credential) | Read-only usage only: `list()` and `head()`. Never `put()`, `del()`, or any write call. |
| Store scope | Implicit — the token is scoped to exactly one store (`playerside-evidence`) per how Vercel Blob tokens work; no separate "store name" parameter is needed or should be added. | |
| Prefix | None, by default (see §1.2 — no prefix convention exists today). The script's `prefix` parameter should exist and default to `undefined`/empty, so it's forward-compatible if a future phase introduces one, but must not be assumed to filter anything today. | |
| Database connection | The existing `DATABASE_URL` (same Postgres/Supabase connection the app already uses) via Payload's Local API (`payload.find({ collection: 'media', ... })`), **not** a raw SQL connection — this keeps the reconciliation subject to the same schema/type guarantees as the application itself and avoids a second, parallel way of reading the table that could drift from Payload's own understanding of it. | |
| Media collection fields read | `id`, `filename`, `filesize`, `mimeType`, `visibility`, `sizes` (all configured size keys' `filename`/`filesize`), `createdAt`, `updatedAt` | `visibility` is read for reporting/triage context only (e.g. "is this orphan candidate an internal-evidence file or a public marketing asset") — it plays no role in the comparison logic itself, since both visibilities share the one store. |

### 2.2 Outputs

A single run produces one report artifact per §2.4 ("where results are stored"), structured as:

```json
{
  "runId": "2026-07-23T14:00:00Z-<random-suffix>",
  "runAt": "2026-07-23T14:00:00Z",
  "actor": "<Payload user email or service identity that triggered the run>",
  "scope": { "prefix": null, "storeName": "playerside-evidence" },
  "counts": { "blobOnly": 0, "dbOnly": 0, "mismatch": 0, "totalBlobObjects": 0, "totalMediaRows": 0 },
  "blobOnly": [
    { "pathname": "string", "size": 0, "uploadedAt": "ISO-8601" }
  ],
  "dbOnly": [
    { "mediaId": "string", "filename": "string", "visibility": "public|internal", "createdAt": "ISO-8601", "isSizeVariant": false, "parentFilename": null }
  ],
  "mismatch": [
    { "mediaId": "string", "filename": "string", "dbFilesize": 0, "blobSize": 0 }
  ]
}
```

Human-readable form: the same data rendered as one CSV per category (`blob-only.csv`, `db-only.csv`, `mismatch.csv`) with the same columns, for an operator who wants to eyeball or spreadsheet-filter results without parsing JSON. Both forms carry the same `runId` so they can be cross-referenced.

**No object bytes, no evidence content, and no raw Blob URLs appear in the report.** Only pathname/filename, size, and timestamp metadata — matching the "no raw URLs, no tokens, no real evidence" hygiene rule already established in this project's other audit work (`docs/review-handoffs/2026-07-22-phase-2a-2-security-review.md`, `docs/review-handoffs/2026-07-22-private-evidence-storage-audit.md`).

### 2.3 Operational Flow

1. **Trigger:** Manual, operator-initiated only in this phase. No cron job, no scheduled Vercel Cron Function, no CI step. (A future phase could propose scheduling — see §6 non-goals and the Definition of Ready in the audit summary below — but this spec does not authorize one.)
2. **Environment:** Run from a local developer machine or a one-off script execution against the **same** `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` the production app uses (read-only calls only) — mirroring exactly how the existing `scripts/verify-*.ts` scripts already operate in this repo (see `scripts/verify-abuse-and-concurrency.ts`, `scripts/verify-public-api-exposure.ts` for the established pattern: `dotenv`-loaded env, Payload Local API, no separate deployment).
3. **Auth:** No new credential. Uses the existing `BLOB_READ_WRITE_TOKEN` (already scoped to this one store, already used read/write by the app itself — a read-only *usage* of an existing token, not a new permission grant) and the existing `DATABASE_URL`. No admin/Payload user login is required since Local API access bypasses HTTP-layer auth entirely (same pattern as `scripts/verify-*.ts`).
4. **Frequency:** On-demand, operator-triggered, until real-world orphan frequency data justifies proposing a schedule (see §6). Recommended cadence for manual runs once implemented: monthly, or immediately after any incident report (a failed upload, an unexpected 404 on a file expected to exist, a support/QA note about a missing evidence attachment).
5. **Execution shape (for a future implementation, not built here):** (a) `list()` the Blob store in pages (`limit`/`cursor`), building a full `Set` of pathnames + sizes; (b) `payload.find({ collection: 'media' })` in pages, building a full set of expected filenames (base + each populated `sizes.*.filename`) + expected sizes; (c) set-diff the two; (d) for size mismatches only (not the full set), an optional second pass may call `head()` per flagged object to fetch `etag` for a stronger integrity signal — this second pass is opt-in/rate-limited, since `head()` is a per-object network call and the bulk pass should stay cheap.
6. **Results storage:** Report files (JSON + CSV) are **not committed to the git repository** by default, and specifically **not placed under `docs/review-handoffs/`** as data files — that directory is documentation, and a report could eventually contain real evidence filenames (operator names, case identifiers) once Stake or any real case begins, which is exactly the class of content this project's existing hygiene rules keep out of committed docs (see the "no real evidence entered the docs" checks already run in prior sessions' handoffs). Instead: report files are written to a local, git-ignored path (e.g. an `.reports/` or the existing scratchpad convention already used for one-off verification scripts in this project) and are operator-retained outside the repository (e.g. a password-manager-adjacent secure note, or wherever Viktor already keeps case-sensitive artifacts per `docs/review-system/CREDENTIAL-LOG.md`'s existing pattern of "reference only, not the secret, stored outside the repo"). **What *is* committed** is a short, sanitized handoff summarizing counts and the decision taken — never the raw filename lists — following the pattern this document itself uses for the "recommended next phase," not the pattern of embedding raw data inline.
7. **Follow-up decision process:** This phase produces a report; it does **not** decide anything. Every discrepancy is triaged manually:
   - **Blob-only:** default disposition is **retain, do not delete**, pending the minimum retention window in §3.2. Deletion (if ever performed) is a manual, individually-reviewed action by Viktor, never scripted or batch.
   - **DB-only:** default disposition is **flag for manual review of whether the Media row should be removed** (since it points at nothing) — but only after confirming it isn't a local-disk-fallback row awaiting migration (§1.3(e)), which is a different, non-urgent case.
   - **Mismatch:** always manual review — a size mismatch on an otherwise-matched filename is unusual enough that it should not have an automatic disposition at all.

### 2.4 Where this fits relative to existing tooling

This is explicitly modeled on, and would live alongside, the existing `scripts/verify-*.ts` family (`verify-commission-wall.ts`, `verify-public-api-exposure.ts`, `verify-abuse-and-concurrency.ts`, `verify-case-governance.ts`, `verify-governance-hardening.ts`, `verify-logging.ts`) — all of which are read-mostly (some create-and-delete throwaway test data, but none mutate real application data) operator-run Local-API scripts with pass/fail console output. A future implementation would be a new file in that same family (naming suggestion only, not committed here: `scripts/verify-evidence-storage-reconciliation.ts`), **read-only in the stricter sense that it makes zero `payload.create`/`update`/`delete` calls and zero Blob `put`/`del` calls** — a step more conservative than its siblings, appropriate given it inspects rather than tests.

---

## 3. Safety and Governance

### 3.1 Report-only guarantee

This phase, and the spec it describes, make **no** writes to Postgres and **no** writes to the Blob store. The only Blob SDK calls in scope are `list()` and (optionally, second-pass) `head()` — both read-only per the `@vercel/blob` SDK's own documented behavior. The only Postgres access in scope is `payload.find()` — a read. **No `payload.create`/`update`/`delete`, no `put()`/`del()`, anywhere in this spec's scope.** This is the single most important constraint of this phase and is restated here deliberately, matching how `docs/review-system/DECISION-LOG.md`'s RLS entry states "Do not auto-apply the remediation SQL" as its own load-bearing safety line — this document's equivalent line is: **do not let a future implementation quietly grow a `--fix`/`--delete-orphans` flag without a separate, explicit decision and a new DECISION-LOG entry.**

### 3.2 Minimum retention window before any future cleanup

No Blob-only orphan may be considered for deletion until **all** of the following hold:
1. It has appeared in **at least two consecutive reconciliation runs, at least 30 days apart** (guards against a false positive from a run racing an in-flight upload, and against a one-off transient state).
2. Its `uploadedAt` timestamp is itself **at least 30 days old** at the time deletion is considered (guards against deleting something mid-flight in a legitimate but slow multi-step upload/edit workflow).
3. A human (Viktor, or whoever holds the same authority at the time) has manually reviewed the specific filename/size/timestamp entry and can state affirmatively that no known case, evidence register entry, or hands-on-test evidence field references it. Given `research_queue.evidenceRegister[].mediaRef` and `research_queue.handsOnResults.*EvidenceRef` are the only fields that relationship-link to `media` (per `docs/review-system/MASTER-BLUEPRINT.md` §9.2), this check is a `research-queue` query for any row referencing the candidate Media ID — except a **Blob-only** orphan by definition has no Media ID in the first place, so this check instead means: confirm the *filename* does not match any evidence artifact a human recalls uploading and expecting to keep, since there is no DB pointer to check against.

No DB-only row may be deleted from Postgres until the same 30-day/two-run bar is met, plus confirmation that it is not a local-disk-fallback row awaiting a one-time migration into Blob (§1.3(e)) — deleting the DB row in that case would destroy the only record that a real, retrievable local file's metadata ever existed.

### 3.3 Escalation path

- **Who decides:** Viktor (project owner), per the same authority pattern used throughout `docs/review-system/DECISION-LOG.md` (every entry in that file records a decision Viktor made or a decision explicitly deferred to him — this is not a new pattern, it's this project's existing one).
- **What evidence must be checked before any cleanup decision:** (a) the reconciliation report itself (counts + specific entries); (b) a `research-queue` query for any reference to the candidate (per §3.2); (c) confirmation of which environment/token the report was generated against (production vs. any future non-production Blob store, to avoid cross-environment confusion); (d) whether the retention window (§3.2) has actually elapsed, not just whether the item "looks old."
- **Recorded outcome:** Any actual cleanup decision — retain, delete, or "insufficient evidence, extend the retention window" — must be logged as a new entry in `docs/review-system/DECISION-LOG.md`, following that file's own stated update rule ("Append new decisions with a date. Do not delete superseded entries"). This spec does not pre-authorize any specific outcome.

### 3.4 Logging/audit requirements

Every reconciliation run must produce a durable, **internal-only** record containing:

| Field | Requirement |
|---|---|
| Timestamp | Run start and end time, ISO-8601. |
| Actor | Who/what triggered the run (an operator's identity — this phase is manual-only, so this is simply "who ran the script," not a service account). |
| Query scope | The exact prefix (if any), and confirmation of which Blob store / which `DATABASE_URL` target was used (to make cross-environment mistakes visible after the fact, not just preventable in the moment). |
| Counts per category | `blobOnly`, `dbOnly`, `mismatch` counts, plus total objects/rows scanned — **counts only** need to be safe to mention in a committed handoff; the itemized lists (§2.2) stay in the internal-only report artifact, not in any committed document. |
| Outcome of any follow-up decision | If a cleanup decision is later made against the retention window in §3.2, that decision (not the raw candidate list) is what gets logged to `DECISION-LOG.md`. |

**Where these logs live:** the itemized report (JSON/CSV, §2.2) stays local/internal per §2.3 item 6 — never committed. The **summary** (counts, run timestamp, decision taken if any) is appropriate for a committed handoff under `docs/review-handoffs/`, dated per that directory's existing `YYYY-MM-DD-<slug>.md` convention, once an actual implementation produces a real run to report on. This document is the spec for that future handoff's shape, not that handoff itself — no real run has occurred, because no implementation exists yet.

---

## 4. Integration Points

### 4.1 Relationship to existing `DECISION-LOG.md` gates

- **Directly resolves the deferred half of** the "Private evidence storage: implemented" entry (2026-07-22) — that entry named the orphan risk and explicitly declined to fix it; this spec is the "how we'd find out if it matters" answer, still without fixing anything.
- **Does not touch, and is scoped to respect,** the three other open gates in the same file: "Direct Supabase/PostgREST exposure requires an explicit RLS/grants decision," "ResearchQueue optimistic concurrency required before multi-writer workflows," and "Role-file version decision." None of those are read, written, or referenced by the reconciliation process described here beyond the incidental fact that it queries `research-queue` read-only in §3.2(3) — the same way `scripts/verify-abuse-and-concurrency.ts` already does, with no schema or access-rule implication.
- **Relates to, but is a separate concern from,** the "AI route/UI remains deferred" entry — that entry lists private evidence storage as one of three preconditions for building the AI chat route. A future multi-writer workflow (the AI route, once built) would be exactly the kind of thing that could increase real orphan risk (more concurrent writers means more chances for the specific `afterChange`-hook-throws-after-`put()` race in §1.2) — so this reconciliation capability is a reasonable thing to have *before* that route ships, not after, even though building the route itself remains out of scope for both this spec and that gate.

### 4.2 Relationship to `MASTER-BLUEPRINT.md`

- §9.2 (`ResearchQueue` spec) is the source of the `evidenceRegister`/`handsOnResults` field names this spec references in §3.2's escalation check — no new fields are proposed, and none of §9.2's spec changes.
- §11 (Handoff File Standard) is the template this document borrows its section structure from, adapted for a spec rather than a case-stage handoff (see the note at the top of this document).
- No other section of the Blueprint is affected — this spec does not touch the review pipeline stages (§3), the rubric (§7), or the AI chat interface (§10, itself still unbuilt per DECISION-LOG.md).

### 4.3 Relationship to `docs/review-handoffs/`

This document itself is filed there, dated `2026-07-23`, following the directory's existing naming convention (compare `2026-07-22-private-evidence-storage.md`, `2026-07-22-private-evidence-storage-audit.md`). **A future implementation phase, if approved, should file its own dated handoff** (e.g. `docs/review-handoffs/<date>-orphan-reconciliation-implementation.md`) documenting what was actually built — this spec is not that handoff and should not be treated as evidence that an implementation exists.

### 4.4 No changes to the Media adapter or routes

Confirmed by construction: this entire spec proposes a **new, separate, read-only script** that calls the same public `@vercel/blob` SDK functions (`list()`, optionally `head()`) the existing adapter already depends on, and the same Payload Local API (`payload.find()`) every existing `scripts/verify-*.ts` already uses. `src/lib/media/vercelBlobPrivateAdapter.ts`, `src/collections/Media.ts`, `src/plugins/index.ts`, and the `/api/media/file/:filename` route are unreferenced by, and unaffected by, anything in this document.

---

## 5. Non-Goals (restated from the task, for this document's own record)

- No changes to RLS/grants, Supabase policies, or the `research-queue` concurrency mechanism.
- No implementation of the reconciliation script itself — no new code, no migrations, no cron jobs, no Vercel Cron Functions.
- No Stake research, no direct-to-Blob/client upload work, no changes to Media access rules.
- No scheduling decision — frequency in §2.3 is a recommendation for manual cadence, not a proposal to automate.

---

## 6. Confirmed Facts vs. Assumptions (audit-style summary)

### Confirmed this session (read directly from source/docs, not inherited on faith)

- HEAD on `origin/main` is `1d81d3e9d45b908a0ff2c70b4adff38e169568c3`, verified via `gh api repos/alpha666c/playerside/commits/main` (GitHub's own API — no dedicated "GitHub MCP" tool exists in this environment, so `gh` CLI/API was used as the closest equivalent, per this project's own stated tooling guidance).
- `src/lib/media/vercelBlobPrivateAdapter.ts` addresses Blob objects purely by filename via `getFileKey({ filename })`, with no prefix — read directly from the current file, unchanged since `e3fa638`.
- `Media.ts`'s `upload.imageSizes` defines exactly 7 named size variants, each producing a distinct Blob object and a distinct `sizes.<name>.filename` DB field — read directly from the current file.
- `@payloadcms/plugin-cloud-storage`'s `afterChange`/`afterDelete` hook shapes (upload happens after the DB row is created; `handleDelete`'s failure is swallowed in this project's adapter) — established during the prior implementation/audit sessions by reading the package's own `dist/hooks/*.js` and this project's adapter code; re-confirmed by this session's reading of the same adapter file (unchanged).
- `tests/int/media.int.spec.ts` contains a passing test proving a `put()`-throw during upload leaves zero persisted Media rows — this is a real, previously-run test result (`docs/review-system/DECISION-LOG.md` §"Test evidence"), not a claim manufactured for this spec.
- `@vercel/blob`'s `list()` supports `prefix`/`cursor`/`limit`/pagination and returns `pathname`/`size`/`uploadedAt` per object; `head()` separately exposes `etag` — read directly from the installed package's type definitions (`@vercel/blob@2.3.1`).
- No orphan-reconciliation script exists in `scripts/` today — confirmed by directory listing.
- `research_queue.evidenceRegister[].mediaRef` and `handsOnResults.*EvidenceRef` are the only relationship fields pointing at `media` — per `MASTER-BLUEPRINT.md` §9.2 and the `ResearchQueue` collection schema read during the prior implementation session.

### Assumptions made in this spec (flagged explicitly, not asserted as fact)

- **No real-world orphan data exists yet to size the problem.** Production `media` table is at 0 rows as of the most recent audit (`docs/review-handoffs/2026-07-22-private-evidence-storage-audit.md`) — this spec's retention windows and cadence recommendations (§2.3, §3.2) are therefore judgment calls based on general operational caution, not calibrated to any observed orphan rate. **This is the single biggest open unknown** and should be revisited once any real usage occurs.
- **Vercel Blob's `list()` API performance/pagination behavior at scale** is assumed adequate based on its documented interface (limit/cursor pagination exists) but was not load-tested against a large object count in this session — reasonable given the store currently holds at most a handful of test objects.
- **Where report artifacts should physically live** (a git-ignored local path, or an equivalent secure-but-outside-the-repo location) is this spec's own recommendation, modeled on `docs/review-system/CREDENTIAL-LOG.md`'s existing "reference only, keep the sensitive thing outside the repo" pattern — it is a proposal for a future implementation to follow, not something already built or tested.
- **That a future prefix convention might be introduced** is stated as a design accommodation (the spec's `prefix` input defaults to none but exists for forward compatibility) — no such convention is planned or decided; this is explicitly not a commitment to add one.

### Recommended "Definition of Ready" for a future, separate implementation phase

Before any session begins implementing the script described in §2:
1. This spec has been reviewed and explicitly approved by Viktor (or superseded by a revised version, per the same override pattern `DECISION-LOG.md` already uses for conflicting layers).
2. A decision on where report artifacts physically live (§2.3 item 6) is confirmed, not left to the implementing session's judgment.
3. The retention-window numbers in §3.2 (30 days / two runs) are either confirmed acceptable or explicitly revised — they are this spec's proposal, not a locked value the way rubric weights are locked.
4. Explicit confirmation that the implementation must remain read-only in this first phase (no `--fix` flag, no deletion capability, even gated) — restated here because it is the single easiest thing for an implementation session to quietly scope-creep past.
5. A dated handoff filename is chosen in advance for that implementation session to fill in (per §4.3), so its documentation lands in the same place this spec anticipates.

## Stop Point

Stopping here: spec written and to be committed in one docs-only commit, no code, migrations, cron jobs, RLS/grants changes, `research-queue` concurrency changes, role-file changes, Stake work, or client-upload work performed. No reconciliation script exists; no run has occurred; no report artifact exists anywhere.
