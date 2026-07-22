# Handoff — Independent Audit: Private Evidence Storage Closure

Date: 2026-07-22
Stage completed: Independent, read-mostly audit of `e3fa638`/`c1388e7`/`cf64f7d` (private evidence storage) — one focused dependency-removal commit made, no other code changed
Next stage: See "Recommended next narrow phase" below; none of the open owner-decision items in `docs/review-system/DECISION-LOG.md` were touched
Next agent role: n/a — this is an audit/governance handoff, not a case-pipeline handoff

---

## HEAD and Scope

`origin/main` was already at `cf64f7d74e3785d3bb982decf80933a222008533` at audit start — no fetch/rebase was needed (working tree clean apart from the pre-existing untracked `.claude/`).

## File-by-File Diff Summary (audited, not modified except where noted)

| File | e3fa638 | c1388e7 | cf64f7d | Audit finding |
|---|---|---|---|---|
| `package.json` | +3 deps (`@payloadcms/plugin-cloud-storage`, `@payloadcms/storage-vercel-blob`, `@vercel/blob`) | — | — | `@payloadcms/storage-vercel-blob` is **never imported anywhere** (`grep` across `src/`, `tests/`, `scripts/` finds it only inside a code *comment* in `vercelBlobPrivateAdapter.ts` explaining why it's not used). **Removed this session** (see below). The other two are genuinely imported and used. |
| `pnpm-lock.yaml` | +201 lines | — | — | Lockfile entries for the three new deps; the unused one's entries removed this session (−23 lines) via `pnpm remove`, not manual editing. |
| `.env.example` | +7 lines (`BLOB_READ_WRITE_TOKEN` documented) | — | — | Matches what's actually read in `src/plugins/index.ts`. No value, no leak. |
| `src/collections/Media.ts` | Doc-comment rewrite + `staticDir` comment updated | — | — | `access` block (`readUnlessInternal`) is **byte-for-byte unchanged** — confirmed via diff; the fix is entirely storage-layer, not access-control-layer. |
| `src/plugins/index.ts` | +16 lines: `cloudStoragePlugin()` wired in, gated on `Boolean(process.env.BLOB_READ_WRITE_TOKEN)` | — | — | Confirmed the gate: absent token → `adapter: null` passed to `cloudStoragePlugin`, which (per its own source, `plugin.js`) leaves the collection unmodified — safe no-op fallback to local disk, not a crash. |
| `src/lib/media/vercelBlobPrivateAdapter.ts` | New, 76 lines | +12/−2 (the `useCache:false` + `Cache-Control` fix) | — | Custom adapter confirmed to implement exactly 4 methods (`generateURL`, `handleUpload`, `handleDelete`, `staticHandler`) matching `@payloadcms/plugin-cloud-storage/types`' public `Adapter`/`GeneratedAdapter` interface. No reach into any package's private/internal (`dist/*.js` non-exported) modules — confirmed via `package.json#exports` inspection of both `@payloadcms/storage-vercel-blob` and `@payloadcms/plugin-cloud-storage`. |
| `vitest.setup.ts` | +8 lines (placeholder token via `||=`) | — | — | Confirmed placeholder (`test-placeholder-not-a-real-token`) is inert — it only flips the plugin's `enabled` boolean gate; the actual network calls are mocked in the test file regardless. Not a real credential. |
| `tests/int/media.int.spec.ts` | New, 163 lines, 7 tests | −1/+1 (fixed 2 real `tsc` errors: `generateURL` optional-chain, missing `data` arg) | — | Re-ran clean this session (17/17 across the file group, see below). |
| `docs/review-system/DECISION-LOG.md` | +19 lines | — | — | Content matches what's described; the storage-choice rationale and the "known limitation" (orphan-on-partial-failure) paragraph are present and accurate against the code as audited. |
| `docs/review-handoffs/2026-07-22-private-evidence-storage.md` | — | — | New, 71 lines | Its production-verification table was independently re-derived this session (see "Live check results" below) rather than taken on faith — results match. |

## Confirmed Facts vs. Agent-Reported/Unverified Facts

**Independently re-confirmed this session (not just re-stated from the prior handoff):**
- HEAD SHA and its match to `origin/main`.
- `@payloadcms/storage-vercel-blob` is unused (fresh `grep`, not inherited from the prior session's claim).
- `tsc --noEmit` is clean, both before and after the dependency removal.
- `test:int` passes 17/17, re-run fresh.
- `verify-commission-wall.ts`, `verify-public-api-exposure.ts` pass fresh.
- `verify-abuse-and-concurrency.ts`'s single failure is the same, already-documented `research-queue` concurrency bug (re-confirmed by diagnostic output: only 1 of 5 concurrent field writes landed, same class of failure as previously documented, different specific field this run — consistent with a non-deterministic last-writer-wins race, not a new or different bug).
- Live production re-check: fresh 10-check run against the current live deployment, using a newly created ephemeral account distinct from the prior session's — not a re-report of the prior session's numbers.
- Vercel deployment provenance: fetched directly from the Vercel API this session, including a **previously unreported fact** — `cf64f7d` (the docs-only commit) triggered its own separate deployment (`dpl_4d7MqSrhdFZg8r6X3JbXMvNj7njj`) which is now the live one aliased to `playerside.vercel.app`, superseding `dpl_iFpV59UPVp2rfb4VjwWKp9mBxSuL` (`c1388e7`) that the prior handoff verified against. Functionally identical (docs-only diff between the two), but this is new information the prior handoff did not and could not state.

**New finding this session, not previously reported:**
- `pnpm test:e2e` is **flaky locally** (unrelated to the media/storage change): two full-suite runs produced 5/6 and 4/6 respectively, both times failing in `tests/e2e/admin.e2e.spec.ts` with a Next.js/Turbopack dev-mode runtime error (`chunk.reason.enqueueModel is not a function`) surfacing as a crashed admin-panel render. Isolated re-runs of the same file (`--workers=1`, or the file alone) passed 3/3 and, in a full-suite run with `--workers=1`, 6/6 — strongly indicating the flake is caused by Playwright's default (unset locally) worker count running multiple browser sessions concurrently against one shared `next dev` (Turbopack) server, not a defect in the media-storage code (the failing tests don't touch Media at all). See raw logs referenced below.

## Vercel Deployment Provenance

| Field | Value |
|---|---|
| Deployment ID | `dpl_4d7MqSrhdFZg8r6X3JbXMvNj7njj` |
| State | `READY` |
| Deployment URL | `playerside-pca99cj04-alpha666cs-projects.vercel.app` |
| Aliased to (production) | `playerside.vercel.app`, `playerside-alpha666cs-projects.vercel.app`, `playerside-git-main-alpha666cs-projects.vercel.app` |
| Target | `production` |
| Created | `2026-07-22T16:26:55.935Z` (unix `1784737615935`) |
| Ready | `2026-07-22T16:27:42.977Z` |
| Source Git SHA | `cf64f7d74e3785d3bb982decf80933a222008533` — matches current `origin/main` exactly |
| Build result | Clean (`Build Completed in /vercel/output [32s]`); only pre-existing benign warnings (Node engine auto-upgrade notice, pnpm-without-corepack notice) |

`cf64f7d` **has** separately deployed and is the currently-live production deployment — confirmed directly from the Vercel API, not inferred.

## Dependency Decision and Reason

**Removed:** `@payloadcms/storage-vercel-blob@3.86.0` (`pnpm remove @payloadcms/storage-vercel-blob`).
**Reason:** Confirmed unused — appears nowhere in `src/`, `tests/`, or `scripts/` except inside a code comment in `vercelBlobPrivateAdapter.ts` that explains why the custom adapter was written instead of using this package. It was installed during the original implementation for evaluation purposes and never removed.
**Verified safe:** `pnpm install --frozen-lockfile` succeeds after removal (lockfile/manifest consistent); `tsc --noEmit` clean; `@payloadcms/plugin-cloud-storage` and `@vercel/blob` (the packages actually imported) remain as direct dependencies at their existing pinned versions, untouched. Adapter behavior (`vercelBlobPrivateAdapter.ts`) was **not modified**.

## Test Command Results

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit` (well, `npx tsc --noEmit -p tsconfig.json`, same effect) | **0 errors** | Ran twice: before and after the dependency removal. |
| `pnpm run test:int` | **17/17 pass** (3 files: `rubrics.int.spec.ts` 9, `api.int.spec.ts` 1, `media.int.spec.ts` 7) | Re-run fresh after dependency removal. |
| `pnpm run test:e2e` (`PW_CHROMIUM_CHANNEL=chrome`) | **Flaky: not "all pass."** Run 1: 5/6 (1 failure, `admin.e2e.spec.ts` "can navigate to dashboard"). Run 2: 4/6 (2 failures, same file, different two of the three admin tests). Isolated re-run of `admin.e2e.spec.ts` alone: 3/3 pass. Full suite with `--workers=1`: **6/6 pass.** | Failure signature both times: a Next.js dev-mode Turbopack runtime error (`chunk.reason.enqueueModel is not a function`) crashing the admin page render — a `next dev` version-staleness notice was visible in the same run (16.2.6, 16.2.11 available). Consistent with concurrent-worker load on one shared dev server, not a media-storage defect (the failing tests are login/dashboard-view navigation, unrelated to Media). Not fixed — out of scope for this audit (no product-feature or unrelated-tooling work authorized). |
| `pnpm run build` | **Clean** | All 23 routes generated, no errors in the log. |
| `scripts/verify-commission-wall.ts` | **PASS**, 4/4 checks | |
| `scripts/verify-public-api-exposure.ts` | **PASS**, 6/6 checks | |
| `scripts/verify-abuse-and-concurrency.ts` | **21/22 checks pass.** 1 failure: `concurrency: all 5 concurrent field writes landed (no lost updates)` — the pre-existing, already-documented `research-queue` last-writer-wins bug (`docs/review-system/DECISION-LOG.md`, "ResearchQueue optimistic concurrency required"). All 4 media-protection checks in this script pass. | Explicitly out of scope per this task's non-goals (no research-queue concurrency fix). |
| `pnpm run lint` | Not re-run this session (unchanged, pre-existing `@eslint/eslintrc` circular-JSON crash per prior session and standing project memory) | Out of scope to fix. |

## Live Check Results (against `dpl_4d7MqSrhdFZg8r6X3JbXMvNj7njj`, `playerside.vercel.app`)

Performed via a scratch script (not committed), an ephemeral admin test account created through Payload's Local API and immediately deleted after, and a 67-byte non-sensitive test PNG.

| Check | Result |
|---|---|
| Production login (fresh ephemeral account, distinct from the prior session's) | PASS — 200, token issued |
| Production upload | PASS — 201 |
| Returned `url` is the protected Payload route, not a raw blob domain | PASS |
| Anonymous protected-file read | PASS — denied, 403, generic message (no internal detail) |
| Authenticated permitted retrieval | PASS — 200, exact byte count matched |
| `Cache-Control` header | PASS — exactly `private, no-store` |
| Deletion | PASS — 200 |
| Authenticated post-delete read | PASS — 404 |
| No raw blob URL or token string in any client-visible JSON response | PASS |
| Vercel runtime logs (scoped to this deployment, 30-minute window) cross-checked against the client-observed sequence | Matches exactly: login 200 → upload 201 → anon read 403 (server-side stack trace present in the *function log only*, never in the HTTP response body; no raw blob URL, no token, no `BLOB_READ_WRITE_TOKEN` string found in a full-text log search) → authenticated read 200 with `cache=BYPASS` (confirms no-store is actually preventing edge caching, not just claiming to) → delete 200 → post-delete read 404 |

`get_runtime_errors` for the same window: no runtime errors recorded (the anonymous-403 log line is Payload's own `logger.error` call for an expected auth denial, not a Vercel-classified runtime error/exception).

## Cleanup Confirmation

Post-recheck `list_tables` read: `media` = 0 rows, `users` = 0 rows (both back to pre-check state). The scratch verification script was deleted from the working tree before committing (never staged).

## git status --short, Migrations, Changed Dependencies

```
 M package.json
 M pnpm-lock.yaml
?? .claude/
```

(`.claude/` is the pre-existing untracked worktree noted in `docs/review-handoffs/PS-review-2026-07-22-repo-security-review.md` — unrelated to this audit, not touched.)

**Migrations:** none changed. `src/migrations/` has no pending diff; `payload_migrations` table unchanged at 11 rows throughout.

**Changed dependencies:** `@payloadcms/storage-vercel-blob` removed (direct dependency + lockfile entries). No other dependency added, removed, or version-bumped.

## Recommended Next Narrow Phase (not implemented — recommendation only)

The one known limitation carried over from the original implementation is unaddressed: if `put()` succeeds but a later step in the same `afterChange` hook throws before the Postgres transaction commits, the Blob object can be orphaned (DB row rolled back, storage object left behind — Vercel Blob writes aren't part of the Postgres transaction). A narrow, low-risk follow-up phase would be:
1. Add a scheduled or manually-triggered reconciliation script that lists objects in the `playerside-evidence` store and cross-references them against `media.filename` in Postgres, reporting (not deleting) any object with no matching row.
2. Do **not** auto-delete orphans in the first version — surface them for a human decision, mirroring this project's existing pattern of "flag, don't auto-remediate" (see `DECISION-LOG.md`'s RLS entry for the same posture).
3. Keep it read-only against both systems until a review of real-world orphan frequency justifies write access.

This is a recommendation only; no code for it was written in this session, per the stated non-goals.

## Stop Point

Stopping here: audit complete, the one demonstrably-unused dependency removed and verified, local + production checks re-run and documented (including the newly-discovered e2e flake and the newly-confirmed separate `cf64f7d` deployment), and this handoff committed. No RLS/grants change, no `research-queue` concurrency fix, no role-file merge, no Stake work, no client-upload work, and no orphan-cleanup implementation were made.
