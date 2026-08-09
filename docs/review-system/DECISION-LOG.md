# Decision Log

> **Purpose:** Durable record of standing owner decisions and open gates for the Playerside Review Intelligence System — the things that must not be silently re-litigated or silently implemented by a future session. Per `docs/review-system/SOURCE-OF-TRUTH.md`, this log does not outrank schema, code, or role files; it records *decisions about* those layers, made by Viktor.
> **Update rule:** Append new decisions with a date. Do not delete superseded entries — mark them superseded and say why, so the history of why something changed stays legible.

---

## 2026-07-22 — Stake remains paused

Stake.com (`#PS-2026-001`) does not begin real desk research, hands-on testing, or any other pipeline stage. This has been stated as a standing instruction across multiple sessions and is re-confirmed here: `research_queue` and `operators` are both empty (0 rows, confirmed live) — the planning documents (`docs/review-handoffs/PS-2026-001-queued-2026-07-22.md`, `docs/review-system/CREDENTIAL-LOG.md`) describe intent and pre-research facts to verify, but no actual CaseFile has been created. No case may be created for Stake or any other operator without Viktor's explicit fresh sign-off, evaluated against the "Definition of Ready for Stake" criteria in `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`.

## 2026-07-22 — Private evidence storage required before uploads are enabled

**Superseded by the entry below (same date) — implemented.** Evidence/media uploads previously failed in production (HTTP 500 — Vercel's serverless filesystem has no writable `public/`, and no storage adapter is configured). Before this is fixed, the fix must be a storage adapter that supports **private/signed URLs** (e.g. Vercel Blob's private-access mode), not merely one that makes uploads succeed. The current `Media` collection's `visibility:'internal'` field only gates the Payload API layer — the raw static file URL is unauthenticated regardless of this field, because `upload.staticDir` serves out of Next's public `public/` directory. Enabling uploads with a storage adapter that doesn't also solve the raw-URL exposure would convert a dormant architectural flaw into a live one. See `docs/review-handoffs/2026-07-22-phase-2a-2-security-review.md` finding #2 and #3.

## 2026-07-22 — Private evidence storage: implemented (Vercel Blob, private access)

**Storage choice:** Vercel Blob, private-access store `playerside-evidence` (provisioned and linked to the `playerside` Vercel project by Viktor; `BLOB_READ_WRITE_TOKEN` set for Production + Preview). Chosen over Supabase Storage (S3-compatible) because it's native to the deploy target and has an actively-maintained Payload ecosystem, and Vercel's current docs confirm a real private-access mode with server-side (`get()`) and short-lived signed-URL (`issueSignedToken`/`presignUrl`) retrieval paths — not a stopgap.

**Implementation note:** the officially-shipped `@payloadcms/storage-vercel-blob@3.86.0` adapter was evaluated and *not* used directly — its own `staticHandler` re-fetches the blob with a plain unauthenticated `fetch()` (correct only for its default `access:'public'` store, not a private one). Instead, `src/lib/media/vercelBlobPrivateAdapter.ts` is a small custom adapter written against the public `@vercel/blob` SDK and Payload's public `@payloadcms/plugin-cloud-storage` `Adapter` interface (the same, intentionally pluggable extension point every official storage adapter — S3, Blob, GCS — is built on), using `get()`/`put()`/`del()` with `access:'private'` throughout, matching Vercel's own documented "deliver private blobs via authenticated route" pattern.

**Default visibility:** every file in the `media` collection — public and internal alike — is stored in the one private Blob store. There is no separate public store or raw-URL path. "Public" vs "internal" is decided entirely by the collection's existing `visibility` field and `readUnlessInternal` access function (unchanged), enforced by Payload's own `checkFileAccess` before the adapter ever runs. This makes "private" the storage-layer default unconditionally, with the Payload access-control layer being the sole, single point deciding who may read a given file — one policy, one code path, easier to audit than a public/private storage split would have been.

**Retrieval policy (unchanged from what was already documented, now actually enforced end-to-end):**
- Anonymous: denied for `visibility:'internal'` docs; allowed for `visibility:'public'` docs (`readUnlessInternal`, unchanged).
- Ordinary authenticated user: allowed to read internal media. This matches the existing, deliberate policy (`if (req.user) return true`) — the `Users` collection has no role/tier field, so "any authenticated Payload user" and "admin" are the same population today. Adding role-based restriction would be an access-control policy change beyond this task's storage-boundary scope, not attempted here.
- Authorized retrieval path: Payload's own `/api/media/file/:filename` route (no new route added — Payload's existing built-in file-serving endpoint, now backed by the adapter above instead of local disk).

**Test evidence:** `tests/int/media.int.spec.ts` (7 tests, `@vercel/blob` network calls mocked) — internal upload succeeds; internal metadata denied anonymously (findByID + find both); internal retrieval succeeds for an authenticated caller; public-media control still readable anonymously; a failed upload (`put()` rejected) leaves zero persisted Media rows, proving the Postgres transaction wrapping `afterChange` rolls back cleanly; `generateURL` never returns a raw blob domain. `scripts/verify-abuse-and-concurrency.ts`'s pre-existing media-protection checks (4 checks) continue to pass unmodified against the new backend. Full production verification (real upload/read/delete against the live `playerside-evidence` store, with the test file removed afterward) is recorded in `docs/review-handoffs/2026-07-22-private-evidence-storage.md`.

**Known limitation, not fixed here:** if `put()` succeeds but a later step in the same `afterChange` hook throws before the surrounding Postgres transaction commits, the Blob object can be orphaned (no corresponding DB row) — Vercel Blob writes aren't part of the Postgres transaction and can't be automatically rolled back. This is an inherent characteristic of pairing a transactional DB with a non-transactional external store, shared by every cloud-storage adapter in the Payload ecosystem (S3, GCS, Azure included), not something specific to this adapter. Not attempting saga/compensation logic here — out of scope.

## 2026-07-22 — Direct Supabase/PostgREST exposure requires an explicit RLS/grants decision

Row Level Security is disabled with full default `anon`/`authenticated` CRUD grants across 98 tables, including `research_queue`, `operators`, `agent_logs`, and `media` — confirmed live via Supabase's own advisory tooling (self-labelled `critical`) and via a prior anonymous PostgREST request. This is Supabase's own platform default, not a Playerside-specific misconfiguration, and no Supabase key was found exposed in application code or the built client bundle. Classified **Critical, pending a deliberate decision** (not merely High): the exposure is unconditional and currently harmless only because the affected tables are empty. Real operator data, evidence references, or account-profile metadata must not be written to these tables until Viktor decides either (a) to enable RLS with explicit policies for each table, or (b) to knowingly accept the current posture with a documented reason. Do not auto-apply the remediation SQL — enabling RLS without policies blocks all access, including the application's own.

## 2026-07-22 — ResearchQueue optimistic concurrency required before multi-writer workflows

**Superseded by the entries below — implemented 2026-07-23.** Concurrent writes to different fields on the same `research-queue` document currently lose data silently (last-writer-wins; Payload's `updateByID` reads a non-locking snapshot before hooks run — reproduced 4 times across sessions). A zero-migration fix exists (a `where`-based compare-and-swap on the existing `updatedAt` field) but is not implemented. This fix must land **before** any workflow introduces a second concurrent writer to a CaseFile — most notably the deferred AI chat panel/`/api/review-chat` route, but also any future server action or background job that touches `research-queue`. Single-writer, single-session use (the only mode exercised so far) is not at risk.

**Correction recorded 2026-07-23 (see `docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md` §2.4):** the "zero-migration `updatedAt` CAS" idea above was traced and found unsafe — Payload's `where`-based bulk update only applies its `where` filter at an initial read, not at the eventual per-document write, so it would not have prevented the race as described.

## 2026-07-23 — ResearchQueue optimistic concurrency: implemented (version field + hook)

**Implemented** per `docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md`, Design 1 (optimistic concurrency via a `version` field), with two corrections discovered during implementation that go beyond what the spec anticipated:

**Correction A — no stable transaction handle.** The spec assumed the version check-and-bump could run inside the same Postgres transaction Payload's own `updateByID` already opened. Payload exposes no documented, stable way to obtain that transaction-scoped connection from a hook (`payload.db.drizzle`/`payload.db.pool` are the adapter's shared, non-transactional handles). The implemented hook (`src/collections/ResearchQueue/enforceOptimisticVersion.ts`) runs its check-and-bump as its own self-contained atomic statement via `payload.db.pool`. Accepted trade-off: a version bump can succeed while an unrelated *later* hook in the same request fails and the outer transaction rolls back, leaving a harmless gap in the version sequence (not data loss) — the caller's own change is not silently lost either way, since a rolled-back operation always surfaces its error to the caller.

**Correction B — `data` is never actually a sparse partial payload.** Empirically discovered while building the abuse-script's staggered-retry test case (`scripts/verify-abuse-and-concurrency.ts` §6c): Payload's fields-level `beforeValidate` step runs *before any collection hook*, and unconditionally merges the caller's partial update onto `originalDoc` — so by the time a collection-level `beforeChange` hook runs, every schema field is already present in `data`, including ones the caller never touched (backfilled from `originalDoc`, which is stale under contention). A hook that tries to detect "which fields did the caller actually intend to change" by checking `Object.keys(data)` will find every key present and do nothing useful. **Fix: callers must now pass `req.context.changedFields` — the exact list of top-level fields they intend to change — alongside `req.context.expectedVersion`.** The hook trusts `data`'s value for declared `changedFields` (Payload never overwrites a field the caller explicitly supplied) and unconditionally rebases every *other* field onto a freshly re-read row before Payload's own write proceeds. Missing `changedFields` when `expectedVersion` is present is a hard `APIError` (400), not a silent skip — this is a **new, required part of the concurrency-aware update contract**, not present in the original spec, and any future caller (the still-deferred AI route included) must supply it.

A third, more subtle finding: the "fresh re-read" in Correction B must **not** pass the hook's own `req` to `payload.findByID` — Payload's Local API reuses a per-request `DataLoader` cache (`createLocalReq.js`: `req.payloadDataLoader = req?.payloadDataLoader || getDataLoader(req)`) that would silently return the document already cached earlier in the *same* request (by `updateByID.js`'s own initial read), defeating the refresh. Omitting `req` forces a genuinely new query.

**Verified:** `tests/int/research-queue-concurrency.int.spec.ts` (7 tests) and `scripts/verify-abuse-and-concurrency.ts` §6 (legacy-caller control, fully-simultaneous 5-writer collision, staggered-retry convergence, sequential-single-writer control) — all pass, repeatedly (4+ consecutive full runs with no flake once Correction B landed). Existing stage-transition gate (`enforceStatusTransition`), commission-wall, public-API-exposure, case-governance, and governance-hardening scripts all continue to pass unmodified. Full details, including the A/B-tested confirmation that an unrelated e2e admin-panel flake (Next.js 16.2.6/Turbopack dev-mode) reproduces on the pre-change baseline too and is not a regression, are in `docs/review-handoffs/2026-07-23-research-queue-concurrency-implementation.md`.

**Schema change:** `research_queue.version` (numeric, `NOT NULL DEFAULT 1`) — migration `20260723_002255_add_research_queue_version`, applied. Purely additive; no existing column touched.

**Not done, still deferred:** the AI chat route remains unbuilt per the still-standing "AI route/UI remains deferred" entry below — this fix removes one of its three preconditions, not all three (RLS/grants and the role-file merge remain open).

## 2026-07-22 — AI route/UI remains deferred

The AI chat panel and `/api/review-chat` Next.js API route (MASTER-BLUEPRINT.md §10) remain unbuilt, and this is correct, not an oversight. It stays deferred until all three items above are resolved: private evidence storage, an explicit RLS/grants decision, and the ResearchQueue concurrency fix. The AI route is the first planned workflow that would introduce a second writer against a CaseFile concurrently with a human editing the same document in the Payload admin, and it is also the first planned surface that would read from tables currently exposed with no RLS. Building it before the above three are settled would stack a new risk on top of three open ones.

## 2026-07-22 — Role-file version decision

**Decision: manually merge, not adopt wholesale and not retain committed as-is.** The committed `docs/review-agents/*.md` files (older draft, written before `docs/FOUNDER-CONTEXT.md`, `docs/review-system/TEST-CASES.md`, and `docs/design-system/CATEGORY-IDENTITY.md` existed) remain the current Layer 3 authority per `SOURCE-OF-TRUTH.md` until this merge is actually executed — this decision records the direction, it does not itself change any file.

Reasoning, file by file (full detail in `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md` Part 1):
- **DESK-RESEARCHER, EDITORIAL-WRITER, INTEGRITY-CHECKER, MONITOR:** adopt the `~/Downloads/playerside-phase3-handoff/docs/review-agents/` versions as the base. Concretely: the package's `VERIFIED`/`CORROBORATED`/`UNVERIFIED` 3-tier confidence scheme matches the actual migrated schema (`research_queue.evidence_register.verification_status`), while the committed 2-tier scheme does not — Layer 2 (code/schema) outranks Layer 3 (role files) per `SOURCE-OF-TRUTH.md`, so the committed file is simply stale here, not a matter of preference. The package versions also correctly reference `FOUNDER-CONTEXT.md`, `TEST-CASES.md`, and `CATEGORY-IDENTITY.md`, all of which exist and are directly relevant to those roles; the committed versions reference none of them.
- **SCORE-ANALYST:** manually merge, do not copy the package verbatim. The package contains a factual error against `src/rubrics/crypto.ts` — it describes the Crypto rubric as "Traditional 8 + Provably Fair," but the actual crypto rubric drops `liveCasino` and adds both `provablyFair` and `geoCompliance`. Any merged version must describe categories by reading the rubric files directly, as the committed version already does, rather than copying either draft's prose.
- **Every version's `Authority: Layer 2` self-label (package only) is wrong** and must not carry over in a merge — role files are Layer 3 per `SOURCE-OF-TRUTH.md`'s own precedence table.
- **Not yet resolved by this decision:** Score Analyst's two drafts disagree on whether a case with incomplete hands-on scores should proceed with conservative defaults (committed) or hard-block at Editorial (package). Neither policy is currently enforced in code (`STAGE_ENTRY_GATES` checks hands-on/evidence population, not `computedScores` completeness). This is a genuine open policy question for Viktor, not something this reconciliation resolves.

**Execution status: not yet done.** No `docs/review-agents/*.md` file was edited during this reconciliation — editing role-file content is a follow-up implementation task, deliberately kept out of this documentation-only pass.

## 2026-08-07 — Full-codebase audit: S1 answer-key leak confirmed & fix plan approved

A full-codebase audit (reviewer → QA → fix-planner pipeline) found **2 S1, 4 S2, 9 S3** findings; full plan in `docs/review-handoffs/2026-08-07-full-codebase-audit-and-fix-plan.md`.

**Headline S1 (live-verified):** anonymous `GET /api/quests` — Payload's default REST surface — returns mission `steps` including `correctKey`/`bonusSlug`, bypassing the sanitized `/api/gamification/*` endpoints (`sanitizeQuestForClient`). The `quests` collection's `read: authenticatedOrPublished` makes published docs publicly readable. **Fix approved: `read → authenticated` + regression test (FIX-01).** Same-date CHANGELOG entry carries the audit summary.

**Second S1:** `payload.config.ts` falls back to the public `development-secret-key-change-in-production` when `PAYLOAD_SECRET` is unset. **Fix approved: hard-fail outside `NODE_ENV=development` (FIX-02).**

**S2s:** rate limiting on anonymous gamification endpoints (FIX-03); profile row-creation bounds via playerKey policy (FIX-04 — **open decision for Viktor:** strict UUID vs legacy-accept + per-IP cap, recommendation: per-IP cap); "5 required tests" claim partially unbacked — reconcile tests or skill (FIX-05); `clicks`/`clicks/confirm`/`offers?path=` are spec-only, documented as deferred — the "outbound XP only after verified click_id" containment gate is dormant until that ships (FIX-06).

**S3s:** `@types/three` 0.185 vs `three` 0.182 drift, `three` in devDependencies, dual lockfiles, engines Node 18, `.env.example` sync, e2e CI-ability, zinc/brand token unification, counter-reconciliation note.

**Known-good reconfirmed:** idempotency (unique index + fail-closed), daily cap in transaction, anti-cheat step-gating, deny-write ledger access, sanitization, reduced-motion, migration-driven schema, 74 tests, build green with the prebuild guard.

**Pending:** Viktor's green light to execute the fix plan; execution starts with Tranche 0 (both S1s) as one security commit.

## 2026-08-07 — Fix-plan execution decisions (Tranche 1 + 4)

- **FIX-04 policy (chosen): per-IP profile-creation cap.** `playerKey` validation keeps the current `[a-zA-Z0-9-]{8,64}` format (no breakage of existing keys); abuse is bounded by (a) the new in-memory rate limiter (FIX-03) and (b) a per-IP cap of 25 profile CREATIONS/day (`GAMIFICATION_PROFILES_PER_IP_DAY`), counted only on real creates inside `ensureProfile` so returning players never consume it. Strict-UUID validation rejected: it would orphan existing local-storage keys and test players for marginal gain. Implemented in commit `66b8da2`.
- **FIX-13 (zinc vs brand tokens) resolved as a documented design decision, not a sweep.** The public surfaces (homepage, evidence components, mission UI) deliberately use the zinc noir-ops palette with amber as the shared accent; the semantic brand tokens (`--ink`/`--paper`/`--evidence` in globals.css) drive the content/review surfaces. A mechanical unification would churn 131 token instances across 10+ components (incl. the internal dashboard) for a cosmetic gain, with visual-regression risk on browser-verified-good UI. Decision: keep both systems, note that future redesigns should converge on the semantic tokens. Reopen only as part of a design-led pass.
- **FIX-14 (note only):** `totalXp`/`completedMissions` on `gamification-profiles` are cached aggregates with a single transactional writer (`submitStepFlow`); the append-only `xp-events` ledger is the source of truth. No reconciliation job needed today.

## 2026-08-08 — Phase 2 (IA & SEO) decisions

- **Market archives live at `/markets/[market]`, not `/casinos/[category]` (F2.1 deviation from plan).** The plan proposed `/casinos/[category]` backed by the `Categories` collection, but (a) Next.js forbids two dynamic segments in one path and `/casinos/[slug]` already owns that namespace for review pages, and (b) the honest category axis for licensed reviews is the *market* — a review is licensed in NL/SE/DE/UK (existing `markets` field), so `/markets/nl|se|de|uk` archives are CMS-data-driven with zero schema migration. The `Categories` collection (Payload-template leftover, no review relationship) would duplicate this axis (region ≈ market, casino type ≈ URL namespace) at migration risk. Markets stay out of the top-level nav (≤7 limit); they live under /casinos and on review pages ("Licensed in" chips).
- **Best-of lists are config + live CMS data, never hand-written rankings.** `src/lib/topLists.ts` ships 3 lists (best-licensed-casinos, best-bonus-transparency [sorts on the promotions rubric category], best-wagering-bonuses [sorts on the linked operator score]); the pages fetch reviews/bonuses fresh on request and rank with pure, tie-broken functions. Page copy says "derived from the CMS, never hand-sorted" — a revalidate=600 ISR page, so the freshness claim is accurate (reviewer pass removed the overstated "every request" phrasing).
- **Schema.org JSON-LD carries only real rubric scores.** `ItemList` of `Review` nodes with `ratingValue` = the actual evidence-backed score, author/publisher = Playerside, `itemReviewed` typed Organization for casino lists and Product for bonus lists; `</script>` escaping hardening applied (JSON.stringify does not escape it; reviewer pass).
- **Sitemap ownership moved to the app-router route.** `/sitemap.xml` is now `src/app/sitemap.ts` (all public routes, lastModified from updatedAt); next-sitemap still writes robots.txt + the payload pages/posts XML sitemaps, but its generated `public/sitemap.xml` index would shadow the app route, so the postbuild removes it (`rm -f public/sitemap.xml`). Verified live: 21 URLs served, robots intact.
- **Nav grows to 7 (plan's ≤7 limit).** Header + Footer `navItems` maxRows raised 6 → 7, adding "Best of" -> /best-casinos; `seed-nav.ts` re-run. NOTE (revalidation learning): Next 16 makes BOTH revalidateTag and revalidatePath request-scoped — they throw "static generation store missing" outside a request, so seed scripts must keep `disableRevalidate: true` and bust the running server's cache by clearing `.next/cache` or touching the global in the admin.
- **Homepage demo-directory links fixed (drive-by).** `VerifiedOperatorGrid` pointed "Read Review" at pre-rename slugs (`/casinos/aurora-bay` etc.) that 404'd; now points at the three real published review routes (Ferrous card is traditional/SE — no crypto reviews published yet).
## 2026-08-08 — Phase 4 (gamification: streaks + onboarding) decisions

- **Streaks are fully DERIVED from the existing append-only ledger — no new xp-event reason, no new table, no migration (migrations are pushed off).** The plan proposed a `streak_day` event reason; instead `src/gamification/streaks.ts` derives streak state from the ledger rows that already exist: a streak day = a UTC calendar day with ≥1 completed-mission `xp_events` row (`reason` untouched), and a freeze token = a completed `risk_quiz` (Tilt Protocol) mission via `FREEZE_GRANT_MISSION_IDS`. The walk covers full days from the earliest activity/freeze day through yesterday; idle today never breaks; a freeze (consumed chronologically from `sortedGrantDays`, which preserves same-day token counts — grants are tokens, not days) protects exactly one missed day and is never retroactive. Derivation mirrors how badges already work (ledger → state), keeps one source of truth, and makes streaks replayable/auditable from the same rows.
- **Onboarding is a server-computed first-session mission path, not a new UI gating system.** `meFlow` derives `onboarding` from the player's completion history: unstarted → offers `paper_trail` (Paper Trail, the canon literacy mission, license_field_match); started-but-unfinished → that mission; complete → `done`. The dock shows a single non-blocking onboarding card with an explicit dismiss; no hard gates, no new permission surface.
- **Two new validator kinds shipped (F4.4) that were blocked on live CMS data:** `license_field_match` (answer derived from the LIVE review's `compliance[expectedField]` — the canonical "what does the license actually say" test) and `casino_filter_match` (operator attributes satisfied by the linked review document, e.g. wagering ≤ threshold). Both stay model-opaque: the LLM/Vex can never write XP, only submit evidence through `submit_mission_evidence`, and every validator returns a teaching explanation for wrong answers. `submitStepFlow` dispatches the new kinds; unknown kinds still reject (no silent XP mint).
- **Live-verified end-to-end loop, not just unit-tested:** fresh anonymous scout → onboarding offers Paper Trail → complete Paper Trail (license_field_match) → streak day 1 recorded → Tilt Protocol (quiz) completes → `freezesAvailable: 1` granted by the ledger → streak survives the freeze model. Note: one verification burst hit the write rate-limiter mid-sequence (a scripted evidenceId re-submit landed cleanly on replay with a fresh evidenceId) — that is the FIX-03/04 hardening working, not a product bug.
- **Known S3-grade limitations (accepted, documented in code + tests):** streak days are UTC-calendar (consistent with the ledger's server-time windows; local-midnight edge documented); the pure streak fn treats a freeze-grant day with no activity as a gap the same-day grant can protect (self-protect edge, impossible in practice since grants require a completion); `longest` counts freeze-protected days (documented on the type).
## 2026-08-08 — Phase 3 (search + compare + archive filtering) decisions

- **Site search queries the review/bonus collections directly; the Payload search plugin stays on the template `posts` collection (F3.1).** The template /search page searched the plugin's `search` collection, which only syncs `posts` — it could never find a casino. Rewrote /search to query the four review/bonus collections live (`_status: published` + `like` or-clauses, limit 50 each), merge, and rank by score with deterministic tie-breaks — same "config + live CMS data" ethos as the top-lists, zero sync infrastructure, zero staleness. `/search` is force-dynamic and `robots: noindex` (param page), so it is deliberately NOT in the sitemap.
- **/compare is URL-driven (`?slugs=`, max 4) and honest-by-construction: a mixed Traditional/Crypto selection is never rendered as one table (F3.2).** The rubrics differ (8 vs 9 categories with different weights), so an apples-to-oranges table would violate the methodology. `pickCompareGroup` picks the category that can be compared (Traditional wins the current catalog), the page says why in a banner, and excluded/not-found slugs are called out explicitly. Compare selection is persisted in localStorage (`playerside.compare`) via a shared CustomEvent; the URL remains the shareable source of truth. Also noindex + excluded from sitemap.
- **Archive filters are client-side over the already-fetched docs; the pages stay statically generated (F3.3).** Reading `searchParams` server-side would flip /casinos, /crypto-casinos, and /markets/[market] from ISR-static to dynamic per-request pages (a Phase 2 regression we deliberately avoid). Instead the pages keep fetching all published reviews server-side and hand the docs to `SortableReviewGrid`; the client re-sorts/filters in-memory and mirrors state into the URL (?sort=&min=&market=) via `router.replace` — no refetch, shareable, back/forward-safe. Static HTML renders the default grid (SEO intact) via a page-level Suspense fallback; controls sync from the URL in an effect after mount so the first client render matches the server HTML (no hydration mismatch — reviewer finding applied).
- **Template search-input bug fixed (reviewer S2):** the template `Search` component pushed `/search` on mount, wiping `?q=` the instant a shared search link loaded. Now seeded from the URL query and skips redundant pushes. Compare table `<th>` cells gained `scope="col"/"row"` for screen readers (reviewer S3).
- **Accepted tradeoffs (documented):** filtered archive URLs show the default list + "Showing n of m" until hydration (sub-second; filters are UX, not index targets); search fires 4 lightweight `like` queries per settled keystroke at a 300ms debounce (fine at current catalog size).
## 2026-08-08 — Phase 5 (admin dashboard + pipeline overview) decisions

- **Admin dashboards are read-only client views over authenticated API routes — not server components and never new write surfaces.** Payload v3 supports RSC admin views, but the repo's existing pattern (beforeLogin/beforeDashboard) is client components, and client views + the existing auth'd `/api/dashboard/cases` route avoid any admin-RSC ambiguity. Two new views registered in `admin.components.views`: `/admin/pipeline` (ResearchQueue cases grouped by the 7 blueprint stages, kanban) and `/admin/gamification` (mission roster: quests with step-kind summaries, player profiles, the append-only XP ledger, user-quest state). New `/api/dashboard/gamification` mirrors the cases route: `payload.auth` → 403 without an admin session → `createLocalReq` so collection access controls still apply. The template "welcome + seed pages/posts/projects" BeforeDashboard block — Payload-template boilerplate meaningless for Playerside — is replaced by an ops summary linking both views.
- **The public `/reviews` page reads `research-queue` with `overrideAccess: true` — deliberately and narrowly.** ResearchQueue.read is admin-only (FIX-01); the page renders ONLY aggregate stage counts (`select: { status: true }`) matching the blueprint's public queue teaser. This is the blueprint's "X operators under review" public-facing feature, not a data leak. A GOVERNANCE GUARDRAIL comment on the select warns against widening it (a future `operatorName: true` would silently publish admin-only data); richer public data must go through a dedicated count-only route. Reviewer pass also fixed the page being build-static: `export const revalidate = 600` so "live" counts refresh (reviewer S2 — the strongest Phase 5 finding).
- **The pipeline board is only as honest as the stage contract it reads.** The seed (`scripts/seed-research-queue.ts`) proves it: 7 illustrative cases (#PS-2026-S04..S10) advance through the REAL `enforceStatusTransition` + `STAGE_ENTRY_GATES` — one stage at a time, gate data carried at the exact transition, poly `publishedReviewId` as `{ relationTo, value }`, resumable from any crashed stage (skips steps ≤ current index), idempotent, exits cleanly (Payload keeps the DB pool open otherwise). Blueprint §2 already assigns S01-S03 to the published seed reviews; the queue records for Aurora Bay/Northlight carry S09/S10 — noted in the seed header (the registry predates the queue collection; numbers are not duplicated).
- **`src/lib/pipeline.ts` is the single read-side source of the stage contract** (order, labels, `stageCounts`, `summarizePipeline`). `inReview` counts only known pre-published stages — unknown statuses are never silently counted as "under review" (reviewer pass).

## 2026-08-08 — Claims vs Reality (blueprint §6) decisions

- **Measured values live on the review document; the verdict is always DERIVED, never stored.** Migration `20260808_add_claims_vs_reality` adds a `claimsVsReality` group to BOTH review collections (+ `_v` tables): withdrawal (claimedHours/measuredHours), support (claimedMinutes/measuredMinutes), kyc (claimedDays/measuredDays), bonus (claimedWager/measuredWager). `src/lib/claimsVsReality.ts` derives the verdict from the two numbers — lower-is-better: met at or under the claim, partial within a 25% tolerance band (1.25×), missed beyond, untested if either side is missing OR ≤ 0 (a payout cannot take 0 hours; the symmetric `measured ≤ 0` guard was a reviewer S3 — data typos must degrade to untested, never to a proud green "Met"). The 1.25× band is new editorial policy; recorded here as the rubric.
- **The §6 untested fallback is fixed copy, never fabricated numbers** — "Not yet tested — pending hands-on verification." + a "Pending" chip. No estimating, no placeholders that masquerade as data.
- **Sample reviews get an honest footer (reviewer S2 — the strongest finding).** The three published seed reviews already carry `isIllustrativeSample` (it drives the page banner). The component now takes a `sample` prop fed from that field: seeded pages say "Illustrative sample data — pending real hands-on verification." instead of the "exact timestamps and evidence logged per test" line, which would assert real testing of placeholder numbers. A real onboarded operator flips to the evidence-logged footer automatically — no copy change needed.
- **Fields are admin readOnly (integrity choice, workflow implication logged):** measurements are written by the testing pipeline/seed, not the admin UI — an editor cannot typo a verdict in the panel, but equally cannot correct a bad measurement without a script. Accepted: consistent with the derived-verdict ethos, and the verdict itself can never be hand-set.
- **Crypto reviews render the honest all-Pending state** (no seeded claims): every row shows the §6 fallback + the desk-research footer. This is the correct default for any operator with no logged evidence.
- **Dead exports removed** (`CLAIM_LABELS`, `verdictLabel` — the component labels verdicts inline in `VerdictBadge` and reads `row.label` from `buildClaimsRows`; reviewer S3).

## 2026-08-08 — CaseFile AI chat panel (blueprint §10) decisions

- **The panel is a custom document VIEW, not a sidebar slot — verified against the installed Payload 3.86 types.** The build spec (§3/§6) left the insertion point open ("SidebarTopComponent or similar... confirm against the installed version"). The installed types expose collection-level `admin.components.edit` as SLOTS-ONLY (beforeDocumentControls, SaveButton, etc. — a `chat` key there is a TS error), and document views register under top-level `admin.components.views` with a path-to-regexp pattern: `/collections/research-queue/:id/chat`. That is the supported "tab on the CaseFile" surface, and the client component receives `docID` in its props (plus `initPageResult.docID`, `doc.id`, and the URL as fallbacks). Registration lives in `payload.config.ts`, not the collection (a comment on the collection explains why).
- **The route now honors the panel's loaded version — the concurrency contract is real, and a stale panel gets a 409, not a silent overwrite.** Previously the route re-read the doc's version at request time and passed THAT as `expectedVersion`, which defeated the panel-staleness protection spec §3.3 exists for ("the version the panel most recently loaded"). Now the client's `expectedVersion` is used when present; a fallback to the freshly-read version remains for legacy callers (the `/dashboard` drawer posts `{apply:true}` without a version) and is LOGGED so the weaker path is observable. The route's catch also preserves Payload's error status — the concurrency gate's 409 used to be swallowed into a 500 (found by the e2e script, fixed).
- **Conversation history lives on the case, exactly as the blueprint wanted.** Each aiRun already had `input` + `messages` sub-fields built for this; `recordChatTurn` (runner.ts) appends the user prompt (also `input.message`) + an assistant summary to the run's messages after every exchange, so the thread survives sessions. Full agent output stays in the run's `output` (rendered expandable in the panel). Single-writer assumption documented: the aiRuns read-modify-write is NOT version-gated (the gate protects the APPLY write path, where concurrent human edits actually collide; aiRuns writes are sequential within one request).
- **Role gating is server-derived only; prompts are bounded.** `src/lib/reviewChat/roles.ts` is the single source of truth for status → agent (the route AND the panel read it); the client can't pick a role or inject `changedFields`. Prompts are capped at 4000 chars server+client (spec §3.4). For human/none stages (hands-on-testing, queued) the panel disables Send and says so honestly — no fake "recorded but not run" promise (reviewer finding).
- **The panel stays a read-only draft surface with an explicit human Apply** — no agent publishes autonomously (spec §3.3 preserved): Apply sends `{apply: true, expectedVersion}` and the panel surfaces the 409 conflict copy ("Reload and re-apply") when the case moved. Integrity Checker is applyable=false (verdict only; sign-off is always human).
- **Honesty note:** the five agents remain safe placeholder scaffolds (every claim `unverified`, evidence register = placeholder rows) — wiring a real model call is documented future work, and the panel says so on every page.

## 2026-08-08 — Deploy migrations run in prebuild; dev-pushed prod DB is baselined, never re-migrated

**Incident:** every deploy since the claims commit failed during static generation with `column trad_casino_reviews.claims_vs_reality_* does not exist` (reproduced locally against a pre-claims DB). Root cause: the production database was bootstrapped by a dev-mode schema push, so `payload_migrations` holds a single `dev` row with `batch = -1` and NO real migrations are tracked. The build had no migrate step, so the claims migration never ran; adding a bare `payload migrate` to prebuild made it worse — Payload sees the `-1` marker, prompts "It looks like you've run Payload in dev mode…" interactively, and hangs forever on Vercel's non-TTY build. Auto-answering "yes" would be wrong: Payload would then re-run the entire chain (plain `CREATE TYPE`/`CREATE TABLE`) against the already-pushed schema and fail with "already exists".

**Decision — `scripts/ci-migrate.mjs`, run in `prebuild` before `payload migrate`:** on a DB with a `batch = -1` marker it (a) records every migration file whose schema is already present (all but the newest migration) into `payload_migrations` so Payload skips them — the classic baseline technique — and (b) deletes the stale `dev` marker so the interactive prompt never fires. `payload migrate` then applies only genuinely pending migrations (the claims ADD COLUMNs). Idempotent: clean/migrated DBs and repeat builds are no-ops. The prebuild still pipes `y` to migrate as a belt-and-suspenders against a re-appearing marker (a future dev push against prod). Verified end-to-end against a faithful local simulation (pre-claims schema + wiped tracking + `dev` marker): baseline 12, marker removed, migrate applied only `20260808_add_claims_vs_reality`, claims columns present, second run no-ops. Forward-only migrations remain the rule.

**Open gate:** anyone running a Payload dev server against the PRODUCTION database re-creates the `dev` marker and must expect the next build to baseline-trust the pushed schema. Local `.env` points at the local docker Postgres (127.0.0.1:5432), which is the correct dev target.

## 2026-08-08 — SUPERSEDES the baseline entry above: apply-or-baseline reconcile, not all-but-newest

**Why superseded:** the first ci-migrate version tracked every migration file except the newest as "already applied" on the dev-pushed DB. That was wrong for the gamification schema (`20260806_225622`): prod's dev push predates it, so its tables never existed — yet it got baselined, the deploy went green, and `/api/gamification/missions` then 500'd with `relation "gamification_profiles" does not exist`. The all-but-newest assumption holds only when the push and the migration chain move in lockstep, which they do not.

**Decision — `scripts/ci-migrate.ts` (apply-or-baseline reconcile):** every migration file is attempted in order inside a transaction; a clean run is kept, a failure whose SQLSTATE means "already exists" (42P07/42701/42710/42723/42P04/23505, plus 42P01/42703 for DROP-type migrations whose up() contains DROP — the object being gone IS the applied state) rolls back and is recorded as baselined, and any other failure exits 1 so the build fails loudly. This converges ANY database state (dev-pushed, partially pushed, migrated, healthy) onto the migration chain and is idempotent — healthy builds attempt each migration and fail-fast-rollback on the first duplicate statement (ms each). The stale `dev` marker is deleted so `payload migrate` never prompts. All migrations are pure literal `db.execute` (audited), so a pg client + a small drizzle-chunks serializer is used; no Payload init. Verified against faithful local simulations of all three states: broken-prod (tracked + gamification missing → migration re-applied, tables restored, re-run no-op), dev-pushed fresh (baseline all, marker removed, `payload migrate` no-ops), and healthy (all baselined, 0 changes).

## 2026-08-08 — Phase A: noir-ops HUD language locked (Tactical 2.0 foundation)

**Decision — the site speaks one design language.** `docs/review-system/DESIGN-SYSTEM.md` is now the working system for the Tactical 2.0 pass (Phases B-F consume it). Key decisions: (1) **gold discipline** — gold stays reserved for the Verification Seal; the pre-existing gold-tinted `--line` border token is a kept, opacity-capped exception (texture, not accent), and the ghost pill's `hover:border-gold` was corrected; (2) **type system** — Fraunces display + Instrument Sans body + IBM Plex Mono data, with `.t-*` classes (components layer; utilities override — documented); (3) **motion** — `--ease-out-expo/quart` + `--dur-*` tokens and a global reduced-motion kill-switch (rAF-driven hero/lenis unaffected); (4) **texture** — `.bg-blueprint` grid + one fixed `.noise` grain overlay, mounted once in the frontend layout; (5) **header** — 2px coral hairline + mono uppercase nav with expanding underline (CMSLink forwards className to the anchor, verified); (6) **template-era seam closed** — the Payload blocks (CTA/Content/Media/Archive) restyled or rhythm-normalized; `RenderBlocks` now owns block spacing with `gap-14`. Gates: typecheck + lint + 161/161 tests + build 40/40 + live-verified on local prod.
## 2026-08-08 — Phase B: tactical homepage, white-strip root cause, palette sweep

**The white strip at the top — root cause, deterministically found.** Rendered SSR HTML had no
`data-theme` attribute, and `globals.css` gates page visibility behind `html { opacity: 0 }` until
the theme script runs. With no background on `html`, the browser's default white canvas showed
through: during load (theme-init flash) and above the viewport when scrolling up (overscroll /
rubber-band). Fix is two-part and permanent: (1) `html { background-color: var(--ink);
color-scheme: dark }` — the canvas is dark no matter what; (2) `data-theme="dark"` is now
server-rendered on `<html>` in `layout.tsx`, so SSR output already satisfies the opacity rule and
the no-JS case renders visible + dark. The `beforeInteractive` theme script still upgrades to a
stored preference — both themes carry identical tokens, so nothing flickers.

**Palette discipline decisions:**
- Gold (amber) is gone from every public surface except the Vex Missions identity, where it is the
  sanctioned product accent (rank, XP, badge readouts). The mission-board CTA is now coral like all
  primary actions; only Vex *readouts* stay gold, plus the semantic `warning` token in the bonus
  calculator's trap warning.
- `text-emerald-400`/`text-rose-400` verdicts → brand `success`/`coral` across verdict boxes,
  claims tables, stamp reactor, compare page, and form errors.
- The homepage filter bar was a dead interaction (state set, nothing consumed). It is now wired
  live to the verified-operator directory (search + category filter the corpus, honest empty
  state). Currency/speed/jurisdiction facets are accepted for forward-compat with the real corpus.
- The evidence drawer was bumped to `z-[60]` so the fixed `z-50` film-grain overlay can never sit
  above an interactive modal; drawer gained `role="dialog"` + `aria-modal`.
- The ProtocolScrub `SYNC` readout defaults to `—` (not `000`) so mobile/reduced-motion never
  shows a frozen "0%" that reads as broken; the `hud-frame` was confined to the inner container so
  corner brackets don't expand across the whole pinned section.
- Admin surfaces (`/dashboard/*`) keep their own styling — out of scope for the public in-colour
  pass; flagged for the admin-dashboard phase.
## 2026-08-08 — Phase C: review page as case file

**Framing decision.** The review page is the money page, so it gets the strongest
mission-console treatment: a `CASE FILE` header rule, the verdict box as `field_brief`
(corner-bracket framed, the one hud-frame surface), the score accordion as a tactical
readout (mono CAT indices, evidence scores, gradient bars, weight chips), and
pros/cons as Intel cards. Everything remains DERIVED data — no hand-written lines.

**Gold discipline, made explicit in code.** The overall score keeps gold because it is the
verified mark rendered beside the Verification Seal (the locked brand doc's one exception).
Per-category scores are measured data and now use evidence. A comment in both
VerdictBox and ScoreBreakdown states this so a future pass doesn't "fix" it back.

**Restraint call.** hud-frame corner brackets are confined to the verdict box (the primary
surface) — the accordion and Intel cards keep plain borders with a hover accent, per the
code reviewer's noise concern. The dead `transition-[width]` affordance on the verdict
strength bars was removed (they mount at final width; no false animation).

**DRY.** Intel card markup + inline SVGs were duplicated across the traditional and crypto
review pages; extracted to a shared `IntelCard` component so the twins can't drift.
## 2026-08-09 — Phase E (motion / micro-interactions)

**Goal:** standardize every public-surface transition on the Phase A motion tokens; add radar/scanline
accents only where they earn attention; prove reduced-motion compliance.

- **Tokens are now first-class Tailwind utilities.** `@utility duration-fast/med/slow` and
  `ease-quart/ease-expo` (backed by `--dur-*` / `--ease-out-*`) replaced ~60 hardcoded
  `duration-200/300/500/700` + `ease-[cubic-bezier(0.25,1,0.5,1)]` classes across ~30 files.
  The `ease-[cubic-bezier(0.25,1,0.5,1)]` arbitrary value *was* `--ease-out-quart` — no behavior
  change, just a name.
- **Default timing override:** `--default-transition-duration: var(--dur-fast)` +
  `--default-transition-timing-function: var(--ease-out-quart)` in `@theme inline` means every bare
  `transition-*` resolves to the interaction tokens. This is a **site-wide** behavior change
  (timing function goes from Tailwind's `cubic-bezier(0.4,0,0.2,1)` to quart) — includes the admin
  dashboard's hovers, which were deliberately left out of the class sweep (internal tooling, same
  call as the Phase B palette pass). Accepted; documented here so the next pass doesn't "fix" it.
- **Interaction vs entrance split:** interactions = fast + quart (buttons, links, card lifts);
  entrances = slow + expo (Reveal scroll-triggers, hero HUD). Reduced-motion branch of Reveal keeps
  a fast plain fade — never a hard cut.
- **Reviewer S2 caught a real coupling bug:** Tailwind v4's `duration-*` drives BOTH
  `transition-duration` and `animation-duration` via `--tw-duration` (tw-animate-css reads it). The
  first version of `@utility duration-fast` set only `transition-duration`, so the swept
  `animate-in` toasts (EvidenceDrawer slide, stamp zoom, claim chip) would have fallen back to the
  ~1s default. Fixed by mirroring the built-in utility: set `--tw-duration`, then both properties.
- **Radar restraint:** the `.radar` primitive (rings + 4.5s rotating beam) appears exactly once on
  the homepage (behind `SEC-01 // LIVE_INTEL`), plus a `animate-ping` (motion-reduce-safe) on the
  leaderboard's evidence dot. Everything else stays CSS-hover territory. The ping sits beside
  explicitly "Sample/Illustrative" content — accepted tension because the section's `chip="live"`
  already frames it as the live leaderboard demonstration.
- **Reduced motion:** radar beam disabled via a scoped `prefers-reduced-motion` rule (rings stay,
  static); ping via `motion-reduce:animate-none`; the global kill-switch covers the rest; HeroField
  already gates on `useReducedMotion`. Verified in-browser with reduced-motion emulation — beam
  stops, WebGL field drops, page remains fully readable.
## 2026-08-09 — Phase E round 2 (section reveals + reduced-motion hero story)

**Goal:** finish the "consistent transitions / section reveal animations / reduced-motion hero"
portion of Phase E on top of the token system shipped in `500a8ac`.

- **Section reveals are now real.** The `Reveal` component existed but was used nowhere; the
  homepage wrapped SEC 02 / 04 / 05 + the Missions band in it (slow+expo fade-up). SEC 03 is
  deliberately NOT wrapped: `LivePayoutLeaderboard` pins its panel with ScrollTrigger, and any
  transform (or `translate`) on a pinned ancestor breaks fixed-position pinning — the same reason
  the Protocol scrub stays unwrapped. The pin-safety rule is now documented in the code.
- **`Reveal` hardened before its first real use.** Two fixes:
  1. **Mounted-gate** — hidden classes (opacity-0 / translate) only apply after client mount, so
     SSR HTML and no-JS environments always show content. Previously the component baked
     `opacity-0 translate-y-7` into the SSR markup (invisible text if JS fails).
  2. **In-view sync check at mount** — if the element is already in the viewport when effects run
     (above-the-fold usage), it reveals immediately, so there's never a visible→hidden→visible
     flash. Below-fold sections are unaffected.
- **The `translate` vs `transform` bug (reviewer-caught, S2-worth).** Tailwind v4's `translate-y-*`
  utilities set the modern `translate` property, not `transform`. The Reveal's arbitrary
  `transition-[opacity,transform]` therefore animated only opacity — the slide snapped. Fixed to
  `transition-[opacity,translate]`. The same latent bug existed in `ui/button` and `PillButton`
  (hover `-translate-y-px` / `-translate-y-0.5` lifts wouldn't transition) — their arbitrary lists
  now include `translate`. Side benefit: because `translate` (unlike `transform`) does NOT create a
  containing block for fixed/sticky descendants, the settled `translate-y-0` is not a
  position-pinning trap — this is why wrapping sections in Reveal is safe for future sticky
  children, and why the reviewer's containing-block concern was moot.
- **The reduced-motion hero story.** Previously `prefers-reduced-motion` dropped the WebGL field
  entirely — atmosphere lost. Now `HeroFieldView` falls back to a `StaticEvidenceField`: a
  zero-animation CSS dot-grid texture (tiled radial gradients, amber ledger + rare emerald sealed
  points, no grid lines because the hero section already paints `bg-blueprint`). This is also the
  fallback for no-WebGL and weak devices. Zero JS/GPU cost, `aria-hidden`, SSR baseline is the
  static field (`data-hero-field="static"`), swapped to the WebGL tier on hydration for capable
  devices. Reduced-motion users keep the brand atmosphere — still.
- **Missions band threshold 0.1** (band can be tall; the 0.2 default would delay its reveal).

Gates: typecheck + lint + 161/161 tests + build 40/40 + browser-verified (fade+slide computed
styles, hero field + radar present, zero console errors).

## 2026-08-09 — Phase G: "The Cofounder" — AI operations partner in the admin (plan approved)

**Goal:** a chat-first meta-agent in the Payload admin that guides Viktor through hands-on
reviews against the locked algorithm, builds structured daily plans, researches trending
operators/bonuses across public sources, runs on resumable tickets (#CF-YYMMDD-NN), and
drafts delegations to the roster — model DeepSeek V4 Flash.

- **Scope decision:** the Cofounder sits ABOVE the five per-case pipeline agents (Desk
  Researcher, Score Analyst, Editorial Writer, Integrity Checker, Monitor). It never writes
  case fields — the no-autonomous-write rule stays load-bearing; the Apply + optimistic
  concurrency contract is unchanged. Delegation is honest: the Cofounder proposes structured
  job briefs (QUEUED→APPROVED), humans/orchestrator execute.
- **Real model wiring lands here.** The five agents are placeholders today; Phase G ships a
  shared `src/lib/reviewChat/llm.ts` (OpenAI-compatible fetch, DeepSeek V4 Flash default,
  daily call cap, streaming) and rewires them so delegation means something.
- **Live-lobby scope limit:** v1 has NO visibility into an operator's live game lobby ("the
  most popular slot right now" is out of scope). The Cofounder guides via checklist + public
  sources + Viktor's own observations, and says so rather than fabricating.
- **Governance carried over:** accountProfile/internalNotes never in context (loadCaseContext
  allowlist), trending output = untrusted data (pinned <untrusted_data> wrapper), output
  passes the banned-phrase gate, prompt-injection suite must prove no write tool can be
  triggered, RG/commission-wall framing pinned in the system prompt.
- **QA:** independent red-team pass returned APPROVE_WITH_FIXES (1 S0, 4 S1, 4 S2, 3 S3) —
  all resolved in the spec §11 (model-id verification, wall-clock budget, no-self-verification,
  executor contract, ticket reuse rule, version-conflict test, date-prefixed ticket numbers).
- Plan: `docs/review-handoffs/2026-08-09-ai-cofounder-phase-g-build-spec.md`. Build order
  G.1–G.7. Implementation starts on Viktor's go.


## 2026-08-09 — Phase G round 2: orchestrator control room + approve-to-publish (approved)

**Goal:** extend the Cofounder from a chat panel into a full operations deck — a `/admin/cofounder`
control room (tickets & today's plan / ticket workspace / agents-at-work + delegation queue +
approve & publish) and a human-initiated **approve → publish** flow so approved research,
scoring, and content land on the website automatically.

- **Approve actions are per-work-product:** research → applies deskResearchOutput + evidenceRegister;
  scoring → applies computedScores; content → applies editorialDraft (all via the existing
  applyDraft concurrency contract); **Approve & Publish** → creates the public review doc
  (traditional/crypto by casinoType; bonuses → wagering/no-wagering), links publishedReviewId,
  case → monitoring. The site revalidates itself via the existing afterChange hooks.
- **Human-initiated only:** publish/approve/apply are NOT in the Cofounder's tool surface — the
  model can never publish. "Automatically on the website" = the human's Approve triggers the
  mechanical publish, consistent with the no-autonomous-write rule and ORG.md §3.3.
- **Publish ordering (QA S1-1):** create review doc as DRAFT with deterministic slug → version-checked
  case link → flip `_status: 'published'` (compliance gate fires here). Nothing goes live until the
  final flip, so a partial failure never orphans a live doc; re-publish is idempotent.
- **Verdict freshness (QA S1-2):** `integritySignOff` gains `verdictForVersion`; publish requires a
  server-side re-read (status integrity-check + PASS + version match). Edits after the verdict force
  a re-check.
- **Concurrency (QA S1-3):** deterministic slug + unique constraint + in-flight guard prevent
  double-publish duplicates. Review-before-write: approve sends the loaded case version; stale
  approve → 409 surfaced as BLOCKED_CONFLICT.
- **Truthful "agents at work" (QA S2-2):** aiRun.status flips to running at model-call start,
  one active run per case, stale-pending rule (~15 min → stale + dismiss).
- QA round 2: APPROVE_WITH_FIXES (3 S1, 3 S2, 3 S3) — all resolved in spec §12/§11/§13.
  Build order extended: G.6 control room + G.6b publish flow; tests #13–#20.


## 2026-08-09 — Phase G G.1: shared LLM client implemented (DeepSeek V4 Flash)

**Goal:** the first Phase G build step — `src/lib/reviewChat/llm.ts`, the single
OpenAI-compatible LLM client the Cofounder AND the five pipeline agents will use, plus the
model-id self-check endpoint. Shipped with mocked tests; live verification waits on the
`DEEPSEEK_API_KEY`.

- **No SDK dependency added** — plain `fetch` to the configured provider (default
  `https://api.deepseek.com`, model `deepseek-v4-flash`), matching the repo's no-AI-dep stance.
- **Daily spend cap (spec §7.1):** `checkDailyCap` counts today's `agent-logs` rows where
  `event = 'llm_call'` — the log IS the counter (one audit row per call, metadata only, never
  message content/PII). Cap env `LLM_SPEND_CAP_PER_DAY` (default 1000, 0 = off). Documented as
  a best-effort soft cap (read-then-write race, reviewer S2) — fine for the single-admin surface.
- **`llm_call` added to AgentLogs** event select + `logEvent` union; operational retention class
  (NOT compliance). Config-only change — no migration; `payload generate:types` regenerated.
- **Per-role model overrides:** `LLM_MODEL_<ROLE>` env wins over `DEEPSEEK_MODEL`
  (e.g. `LLM_MODEL_DESK_RESEARCHER`). Default temperature 0.3 (reviewer S3 — rubric-strict).
- **Streaming contract:** `streamLlm` re-emits provider deltas as `data: {"delta":...}\n\n` and
  terminates with `data: {"done":true}\n\n` — stable for the G.6 chat UI regardless of provider.
- **`GET /api/cofounder/health`** (admin-only): reports key-missing vs model-id-verified state
  (QA S0-1). Health pings deliberately uncounted/unlogged (reviewer S3 note).
- **Audit failures never fully silent** (reviewer S2): a dropped `llm_call` row logs
  `payload.logger.error` — the call still succeeds, but the undercount is observable.
- Gates: typecheck + lint + **172/172 tests** (11 new, all mocked — no key/network/DB).
- Next: G.2 (`CofounderSessions` collection + migration). `DEEPSEEK_API_KEY` needed for G.3+
  live runs; `.env.example` + `CREDENTIAL-LOG.md` updated with the full Phase G env contract.

