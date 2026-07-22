# Decision Log

> **Purpose:** Durable record of standing owner decisions and open gates for the Playerside Review Intelligence System — the things that must not be silently re-litigated or silently implemented by a future session. Per `docs/review-system/SOURCE-OF-TRUTH.md`, this log does not outrank schema, code, or role files; it records *decisions about* those layers, made by Viktor.
> **Update rule:** Append new decisions with a date. Do not delete superseded entries — mark them superseded and say why, so the history of why something changed stays legible.

---

## 2026-07-22 — Stake remains paused

Stake.com (`#PS-2026-001`) does not begin real desk research, hands-on testing, or any other pipeline stage. This has been stated as a standing instruction across multiple sessions and is re-confirmed here: `research_queue` and `operators` are both empty (0 rows, confirmed live) — the planning documents (`docs/review-handoffs/PS-2026-001-queued-2026-07-22.md`, `docs/review-system/CREDENTIAL-LOG.md`) describe intent and pre-research facts to verify, but no actual CaseFile has been created. No case may be created for Stake or any other operator without Viktor's explicit fresh sign-off, evaluated against the "Definition of Ready for Stake" criteria in `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`.

## 2026-07-22 — Private evidence storage required before uploads are enabled

Evidence/media uploads currently fail in production (HTTP 500 — Vercel's serverless filesystem has no writable `public/`, and no storage adapter is configured). Before this is fixed, the fix must be a storage adapter that supports **private/signed URLs** (e.g. Vercel Blob's private-access mode), not merely one that makes uploads succeed. The current `Media` collection's `visibility:'internal'` field only gates the Payload API layer — the raw static file URL is unauthenticated regardless of this field, because `upload.staticDir` serves out of Next's public `public/` directory. Enabling uploads with a storage adapter that doesn't also solve the raw-URL exposure would convert a dormant architectural flaw into a live one. See `docs/review-handoffs/2026-07-22-phase-2a-2-security-review.md` finding #2 and #3.

## 2026-07-22 — Direct Supabase/PostgREST exposure requires an explicit RLS/grants decision

Row Level Security is disabled with full default `anon`/`authenticated` CRUD grants across 98 tables, including `research_queue`, `operators`, `agent_logs`, and `media` — confirmed live via Supabase's own advisory tooling (self-labelled `critical`) and via a prior anonymous PostgREST request. This is Supabase's own platform default, not a Playerside-specific misconfiguration, and no Supabase key was found exposed in application code or the built client bundle. Classified **Critical, pending a deliberate decision** (not merely High): the exposure is unconditional and currently harmless only because the affected tables are empty. Real operator data, evidence references, or account-profile metadata must not be written to these tables until Viktor decides either (a) to enable RLS with explicit policies for each table, or (b) to knowingly accept the current posture with a documented reason. Do not auto-apply the remediation SQL — enabling RLS without policies blocks all access, including the application's own.

## 2026-07-22 — ResearchQueue optimistic concurrency required before multi-writer workflows

Concurrent writes to different fields on the same `research-queue` document currently lose data silently (last-writer-wins; Payload's `updateByID` reads a non-locking snapshot before hooks run — reproduced 4 times across sessions). A zero-migration fix exists (a `where`-based compare-and-swap on the existing `updatedAt` field) but is not implemented. This fix must land **before** any workflow introduces a second concurrent writer to a CaseFile — most notably the deferred AI chat panel/`/api/review-chat` route, but also any future server action or background job that touches `research-queue`. Single-writer, single-session use (the only mode exercised so far) is not at risk.

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
