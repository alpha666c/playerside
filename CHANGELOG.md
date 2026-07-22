# Changelog

> Referenced by name in `docs/review-system/MASTER-BLUEPRINT.md`, `docs/review-system/SOURCE-OF-TRUTH.md`, and `docs/review-system/TEST-CASES.md` as the place changes to locked documents and locked behavior are logged. Did not exist until this entry — see `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`. Entries below are a retrospective of commits already on `main`; nothing here is invented.

## 2026-07-22

- Replaced the non-functional, publicly-exposed evidence-upload design with a private Vercel Blob-backed storage adapter for the `Media` collection. Uploads no longer write to Vercel's read-only serverless filesystem (the cause of the previous HTTP 500), and internal-visibility files are no longer reachable via an unauthenticated raw static URL — every read now goes through Payload's own access-controlled `/api/media/file/:filename` route. See `docs/review-system/DECISION-LOG.md` (2026-07-22, "Private evidence storage: implemented") and `docs/review-handoffs/2026-07-22-private-evidence-storage.md`.
- **`a291c42`** — Repo & deployment security review handoff: read-only review of Phase 2A.2 (git reconciliation, live production testing, Vercel log inspection, adversarial pass). Surfaced the undelivered `~/Downloads/playerside-phase3-handoff/` package as the session's headline finding. No code changed.
- **`dbb2ef2`** — Phase 2A.2: deployment verification, media protection, abuse tests.
- **`7e04319`** — Phase 2A hardening: evidence register upgrade (3-tier verification labels), immutable audit log, stage entry gates.
- **`7ea6f33`** — Phase 2A: Review OS governance foundation on `research-queue`/`operators`.
- **`a958602`** — Added `Operator` and `ResearchQueue` Payload collections per `MASTER-BLUEPRINT.md` §9.
- **`336926c`** — Fixed production build: promoted `pg` to a direct dependency.
- **`4679a9e`** — Fixed the Living Seal: an overly broad `viewport < 380px` low-power heuristic — not a real WebGL/SSR issue — was forcing the flat-SVG fallback on narrow viewports.
- **`eb04b5d`** — Added UX-feature dependencies for Living Seal, Claim Collapse, and Score Reveal.
- **`fdb9965`** — Marked planning documentation sync.
- **`e562718`** — Locked Stake.com as `#PS-2026-001` (planning only — no CaseFile ever created in Payload), standardised test cases, credential-logging spec, Blueprint §5.2 update.
- **`f14299c`** — Added Category Identity System spec, UX Feature Blueprint, and session handoff (2026-07-22 part 2).
- **`63a8e45`** — Added Review Intelligence System master blueprint and agent role files.
- **`a66e55b`** — Synced code to the locked rubric weights; Community Sentiment moved to display-only context, excluded from `overallScore`.
- **`f01c746`** — Verified the commission-blind wall structurally rejects deal data (Task 6).
- **`4d0e7a2`** — Verified `agent-logs` round-trips correctly (Task 3 checkpoint).
- **`b0265ca`** — Added the machined-seal 3D signature moment; fixed pre-existing build-blocking type errors.
- **`68bfcfe`** — Added Traditional/Crypto Casino reviews and Wagering/No-wagering bonuses (Task 2).
- **`3f9abe1`** — Added The Blind: signature Pressure Test, hero intake artifact, evidence-archive homepage.
- **`46814dd`** — Merged the Fable 5 homepage build: hero, methodology, The Wall, sample reviews.
- **`902fac1`** — Built the Playerside homepage; brought Header/Footer to brand quality.
- **`6403237`** — Added the initial Payload migration for the Supabase schema.
- **`5248309`** — Wired Playerside design tokens, fonts, and brand identity into the shell.
- **`7ce358a`** — Scaffolded Playerside: Next.js + Payload (Postgres adapter), brand shell foundation.

### Documentation reconciliation (this entry's own commit)

- Reconciled `~/Downloads/playerside-phase3-handoff/` against committed state: produced a file-by-file role-file diff, verified the Downloads session handoff's claims against current repo/database state, corrected security-review severity language (RLS/PostgREST exposure reclassified Critical), and recorded standing owner decisions in `docs/review-system/DECISION-LOG.md`. No application code, schema, migrations, RLS/grants, dependencies, or Stake data were touched.
