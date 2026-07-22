# Handoff — Private Evidence Storage (Media)

Date: 2026-07-22
Stage completed: Replaced the non-functional, publicly-exposed evidence-upload design with a private Vercel Blob-backed storage adapter; deployed and verified against live Vercel production
Next stage: Owner decision on the remaining open items in `docs/review-system/DECISION-LOG.md` (RLS/grants, ResearchQueue concurrency, role-file merge) — none touched by this change
Next agent role: n/a — this is an implementation handoff, not a case-pipeline handoff

---

## What Was Done

Media uploads previously returned HTTP 500 in production (Vercel's serverless filesystem has no writable `public/`), and even once fixed, the `visibility:'internal'` field only gated the Payload API layer — the raw static file URL bypassed it entirely because `upload.staticDir` served straight out of Next's `public/` directory, which Next serves unauthenticated regardless of Payload's own access control.

Added `src/lib/media/vercelBlobPrivateAdapter.ts`, a custom Payload cloud-storage adapter targeting the private Vercel Blob store `playerside-evidence` (provisioned and linked to the `playerside` Vercel project by Viktor; `BLOB_READ_WRITE_TOKEN` set for Production + Preview). Written directly against the public `@vercel/blob` SDK and `@payloadcms/plugin-cloud-storage`'s public `Adapter` interface, not `@payloadcms/storage-vercel-blob` — that package's own shipped `staticHandler` re-fetches blobs with a plain unauthenticated `fetch()`, correct only for its default `access:'public'` store, not a private one. Wired in via `cloudStoragePlugin()` in `src/plugins/index.ts`, gated on `BLOB_READ_WRITE_TOKEN` being present (falls back to local-disk storage otherwise, for local dev without `vercel env pull`).

Every file in the `media` collection — public and internal alike — now lives in the one private store. `disableLocalStorage` is set automatically by the plugin. The only way to fetch bytes is Payload's own, pre-existing `/api/media/file/:filename` route: Payload's core `checkFileAccess` runs the collection's `access.read` (`readUnlessInternal`, unchanged) and throws `Forbidden` *before* the adapter's `staticHandler` is ever invoked (traced through `payload/dist/uploads/checkFileAccess.js` and `endpoints/getFile.js`) — no new route was added, and no raw `*.blob.vercel-storage.com` URL is ever handed to a client.

**A real bug was found and fixed during production verification, not just anticipated in review:** the first production test showed a GET on a just-deleted internal file still returning 200 with the old bytes. Root cause: Vercel Blob's `get()` defaults to serving private reads from CDN edge cache (`useCache` defaults to `true`), and the adapter's `staticHandler` was also reflecting the stored object's own `Cache-Control` metadata onto the response. Both are wrong for a route whose authorization is evaluated per request. Fixed with `useCache: false` on the `get()` call and an unconditional `Cache-Control: private, no-store` on the response — confirmed fixed by re-running the same production test (commit `c1388e7`).

## Current State of UNVERIFIED Fields

Not applicable — this is a governance/infrastructure change, not a case-pipeline research task. No `research_queue` or `operators` data was touched (both remain at 0 rows, confirmed before and after).

## Conflicts Surfaced

None against `MASTER-BLUEPRINT.md`, `SOURCE-OF-TRUTH.md`, or the committed role files. The change is purely infrastructural (where file bytes live and how they're served) and does not alter the `Media` collection's field schema, its `access` rules, or any other collection's behavior.

## Evidence References

Two commits on `main`:
- `e3fa638` — `feat(media): replace public-static evidence uploads with private Vercel Blob storage`
- `c1388e7` — `fix(media): disable CDN caching on the private evidence read path`

Deployments (Vercel project `playerside`, team `alpha666cs-projects`):
- `dpl_5vuvpztAb8eef5zp3HLmDA7E6Fzu` — commit `e3fa638`, READY, clean build
- `dpl_iFpV59UPVp2rfb4VjwWKp9mBxSuL` — commit `c1388e7`, READY, clean build, currently live at `playerside.vercel.app`

### Local test matrix (all green)

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `pnpm run test:int` (17 tests across 3 files, incl. 7 new in `tests/int/media.int.spec.ts`) | 17/17 pass |
| `pnpm run test:e2e` (6 tests, `PW_CHROMIUM_CHANNEL=chrome`) | 6/6 pass |
| `pnpm run build` | Clean, all 23 routes generated |
| `scripts/verify-commission-wall.ts` | PASS (all 4 checks) |
| `scripts/verify-public-api-exposure.ts` | PASS (all 6 checks) |
| `scripts/verify-abuse-and-concurrency.ts` | 21/22 checks pass — the 1 failure (`concurrency: all 5 concurrent field writes landed`) is the pre-existing, already-documented `research-queue` last-writer-wins bug (see DECISION-LOG.md), unrelated to this change and explicitly out of scope for it. All 4 media-protection checks in this script pass. |
| `pnpm run lint` | Pre-existing `@eslint/eslintrc` circular-JSON crash, unchanged, unrelated (documented in prior-session memory as a standing issue) |

### Production verification (live `playerside.vercel.app`, after the caching fix)

Performed via a scratch script (not committed) using an ephemeral admin user created through Payload's Local API against the shared Postgres database, then a genuine HTTP login/upload/read/delete cycle against the live deployed REST API — no code from the app itself was bypassed.

| Check | Result |
|---|---|
| Production login (real HTTP, ephemeral test account) | PASS |
| Production upload of a 67-byte non-sensitive test PNG (`prod-verify-2026-07-22.png`, alt-tagged, `visibility:'internal'`) | PASS — HTTP 201 |
| Returned `url` field is the protected Payload route, not a raw blob domain | PASS — `/api/media/file/prod-verify-2026-07-22.png` |
| Anonymous metadata read (`GET /api/media/:id`, no auth) | PASS — denied, HTTP 404 |
| Anonymous raw file read (`GET` the returned url, no auth) | PASS — denied, HTTP 403 |
| Authorized file read (same url, JWT auth) | PASS — HTTP 200, `image/png`, `Cache-Control: private, no-store`, exact byte count (67) matched |
| Production delete (`DELETE /api/media/:id`, JWT auth) | PASS — HTTP 200 |
| Post-delete file read (same url, still authenticated) | PASS — HTTP 404, confirming the underlying Blob object was actually removed, not just the DB row |
| Vercel runtime error logs, 30-minute window covering the verification | No errors found |

Test file and its Media record were deleted as the final verification step; the ephemeral admin user was deleted immediately after. Confirmed via a fresh `list_tables` read: `media` and `users` both back to 0 rows post-verification, matching pre-verification state exactly.

## Next Action

None required from a coding agent — this change is complete and verified. Owner-level decisions remain open per `docs/review-system/DECISION-LOG.md`: the RLS/grants posture, the `research-queue` concurrency fix, and the role-file merge. This change does not resolve any of those and was scoped not to touch them.
