# Changelog

> Referenced by name in `docs/review-system/MASTER-BLUEPRINT.md`, `docs/review-system/SOURCE-OF-TRUTH.md`, and `docs/review-system/TEST-CASES.md` as the place changes to locked documents and locked behavior are logged. Did not exist until this entry — see `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`. Entries below are a retrospective of commits already on `main`; nothing here is invented.

## 2026-08-07

- **`7510c2f`** — Pinned `three` to exact `0.182.0` and refined the HeroField motion grammar. The pin kills the `THREE.Clock` deprecation warning at the root (three r183+ deprecated `Clock`, which `@react-three/fiber` constructs unconditionally per Canvas; 0.182.0 is the last clean release and every peer in the lockfile resolves to it). Motion refinement: directional scroll drift (signed velocity — dots flow with intent and settle to still), a causal one-shot expanding cursor ripple replacing the looping sin() wave (throttled, and gated to fire only at rest), asymmetric velocity smoothing (fast attack, slow release), and subtle pointer parallax. Verified live with zero console errors and the ripple/scroll-stretch observed in the browser; 74/74 tests, lint, typecheck and build all green.
- **`b795c48`** — Wired Vex Missions into the site chrome: added a Missions entry to the header/footer nav globals (via `scripts/seed-nav.ts`), added the `MissionsPromo` homepage section (live scout dossier with rank/XP/missions/badges and a CTA into `/missions`, fail-soft on API), and added a `MissionBoardCTA` strip on casino and crypto review pages linking to the mission board. Browser-verified end-to-end with zero console errors.
- **`c4dfb74`** — Shipped Vex Missions gamification end-to-end: Payload collections (`quests`, `gamification-profiles`, `user-quests`, `xp-events`) with an append-only XP ledger, unique idempotency indexes and migration `20260806_225622`; server-authoritative flows + `/api/gamification` routes (`me`, `missions`, `quests/start`, `quests/submit`) with pure validators, the `floor(100·L^1.5)` XP curve, daily cap, anti-cheat step gating and answer sanitization (no `correctKey`/`bonusSlug`/`rgExplain`/`hint` leakage); the Vex Dock + MissionHUD + XpBar mounted on casino/crypto review pages; the `/missions` board (rank ladder, derived badge catalog, mission roster with RG + 18+ adjacency); shared `useGamification`/`useMissions` hooks on a common identity util; `scripts/seed-gamification.ts`; the four vex-* skills, agent definitions and `docs/persona/vex.json`; and 11 test files (74 tests green, typecheck/lint/build clean). See `docs/review-handoffs/2026-08-07-vex-missions-board.md`.
- **`70e3807`** — Rebuilt the homepage around a three.js HeroField and a motion system: replaced the Fable-era homepage component set with a rebuilt `PublicHomepageView`, added the Motion provider + scroll-velocity store (`useScrollVelocity`) and the ProtocolScrub rail, upgraded `LivePayoutLeaderboard` and `MachinedSealLazy`, swapped `VerificationSeal` for `MachinedSealLazy` on casino review pages, stripped legacy grain/blind CSS, and added the `lenis` dependency.

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
