# Full-Codebase Audit & Fix Plan — 2026-08-07

> **Pipeline:** Reviewer #1 (full-codebase review) → QA agent (independent audit of findings) → Audit Fix Planner (plan + log + inventory). Every S1 finding was **live-verified** against the running production server, not theorized.
> **Scope:** entire `playerside` repo — plan/docs, gamification ledger, research pipeline, UI/UX & motion, content/rubrics, admin dashboard & access control, tests, build & deploy.
> **Status:** findings documented, plan approved by orchestrator, **awaiting Viktor's green light + one decision (FIX-04)**.

---

## Headline finding (live-verified, S1)

**Anonymous `GET /api/quests` (Payload's default REST surface) returns mission `steps` including `correctKey` and `bonusSlug`.**

Verified live on `localhost:3001`:
```
GET /api/quests?limit=1&depth=0  (no auth)
→ total: 1, mission bonus_hunter "The Bonus Heist"
→ payload contains correctKey: True | bonusSlug: True
```

The custom `/api/gamification/*` endpoints sanitize via `sanitizeQuestForClient` (strips `correctKey`/`bonusSlug`/`rgExplain`/`hint`), but the `quests` collection's `read: authenticatedOrPublished` makes published missions publicly readable through Payload's own REST API, bypassing all sanitization. **The CHANGELOG guarantee "no correctKey/bonusSlug/rgExplain/hint leakage" is violated by this surface.**

---

## Inventory

| Metric | Count |
|---|---|
| Total findings | 15 (14 actionable + 1 note-only) |
| By severity | **S1: 2** · S2: 4 · S3: 9 |
| By area | Gamification/security: 7 · Tooling/deps: 5 · Docs/spec-drift: 3 · UI polish: 1 |

**Known-good (verified, DO NOT TOUCH):**
- XP idempotency: DB unique index `(playerKey, evidenceId)` in migration `20260806_225622` + app-level `lastEvidenceId` dedup + unique-violation fail-closed (never double-mints, never 500)
- Daily XP cap enforced **inside** one transaction (ledger insert + profile + user-quest commit or fail together)
- Anti-cheat step-gating: only the current step may be answered; skip-ahead and regression rejected without minting
- Deny-write access on all three ledger collections (`create/update/delete: () => false`, `read: authenticated`)
- Sanitization (`sanitizeQuestForClient`) on all custom flows — strips answers + hints
- Reduced-motion across 7 components; zero TODO/FIXME in src; zero PostgREST/Supabase remnants
- Migration-driven schema (`push: false`, 12 migration sets); 74 tests green; build green with prebuild guard
- Build fix `f48ea92`/`f4f0c7a` (prebuild DB guard + Vercel CLI) passed QA with **GO**

---

## Fix plan (14 tasks, 5 tranches)

### TRANCHE 0 — Immediate security (one commit)

**FIX-01 (S1 | M1) — Close the `/api/quests` answer-key leak**
- **Files:** `src/collections/Quests/index.ts`, `tests/int/gamification.int.spec.ts` (add regression test), `CHANGELOG.md`
- **Steps:**
  1. Change `Quests.access.read` → `authenticated` (admin-only). Comment: raw `steps` JSON contains `correctKey`/`bonusSlug`/`rgExplain`; public mission data flows **only** through sanitized `/api/gamification/*`, which call with `overrideAccess: true` — unaffected.
  2. Grep for any frontend/server code fetching `collection: 'quests'` without `overrideAccess` → confirm zero (hooks use `/api/gamification/*` only).
  3. Audit sibling collections for the same pattern (`WageringBonuses`, `NoWageringBonuses`) — bonus data is public on review pages by design, but confirm no authored-answer fields anywhere.
  4. Regression test: anonymous `payload.find({ collection: 'quests' })` (no overrideAccess) returns 0 docs; `missionsFlow` still serves sanitized missions (steps have no `correctKey`/`bonusSlug`/`rgExplain`/`hint`).
- **Verification:** `pnpm test:int`; `curl -s 'http://localhost:3001/api/quests?limit=1&depth=0'` → no `correctKey`/`bonusSlug`; browser-check `/missions` + dock still work.
- **Effort: S**

**FIX-02 (S1 | A) — Hard-fail on missing `PAYLOAD_SECRET` outside development**
- **File:** `src/payload.config.ts`
- **Steps:** Above `secret`, add: throw if `!process.env.PAYLOAD_SECRET && process.env.NODE_ENV !== 'development'`; keep the dev fallback only for dev. Vercel prod/preview already set it — unchanged there.
- **Verification:** `NODE_ENV=production PAYLOAD_SECRET= npx tsx -e "import('./src/payload.config.ts').catch(e=>console.log('EXPECTED-THROW:', e.message))"` → throws; `pnpm dev` still boots.
- **Effort: S**

### TRANCHE 1 — Security hardening

**FIX-03 (S2 | I) — Rate-limit anonymous gamification endpoints**
- **Files:** new `src/gamification/rateLimit.ts`; wrap `/api/gamification/{me,missions,quests/start,quests/submit}` routes
- **Steps:** tiny in-memory sliding window keyed by `playerKey|ip` (writes ~10 req/10s, reads ~30 req/10s, 429 on exceed). Document the Vercel per-instance caveat (dampening, not global enforcement). XP cap already bounds the economy; this bounds DB load.
- **Verification:** unit test on limiter; burst curl → 429s.
- **Effort: M**

**FIX-04 (S2 | M2) — Bound profile row-creation (playerKey)**
- **Files:** `src/gamification/service.ts`, `src/gamification/flows.ts`, `DECISION-LOG.md`
- **Steps:** tighten `isValidPlayerKey` and/or add per-IP profile cap. **Open decision (see below):** (a) strict UUID v4 — breaks existing non-UUID keys (`board-verify-0002` test players); (b) legacy-accept + per-IP cap — **recommended**.
- **Verification:** unit tests; `pnpm test:int`.
- **Effort: M**

### TRANCHE 2 — Spec reconciliation

**FIX-05 (S2 | B) — Back the "5 required tests" claim or fix the spec**
- **Files:** `tests/int/gamification-unit.int.spec.ts`, `skills/vex-ledger/SKILL.md`
- **Steps:** read the `describe('vex-ledger: validators')` block; add missing negative cases (wagering wrong-turnover, quiz wrong-key) if absent; annotate skill: `quiz` + `wagering_math` implemented, `casino_filter_match`/`license_field_match`/`dwell_read` planned for future missions.
- **Verification:** `pnpm test:int`.
- **Effort: S**

**FIX-06 (S2 | C) — Document clicks/offers deferral (no code)**
- **Files:** `skills/vex-ledger/SKILL.md`, `docs/review-system/DECISION-LOG.md`
- **Steps:** mark `clicks`/`clicks/confirm`/`offers?path=` as **planned, not implemented**; note containment gate "outbound XP only after verified click_id" is dormant until the clicks flow ships.
- **Effort: S**

### TRANCHE 3 — Hygiene

- **FIX-07 (S3 | D):** `@types/three` → exact `0.182.0` (align with pinned three). Verify: install, typecheck, build.
- **FIX-08 (S3 | E):** move `three` from devDependencies → dependencies (client-bundled). Verify: install, build.
- **FIX-09 (S3 | F):** `git rm package-lock.json` (pnpm is the PM). Verify: build resolves from `pnpm-lock.yaml`.
- **FIX-10 (S3 | G):** engines → `">=20.9.0"` (Node 18 EOL). Verify: build.
- **FIX-11 (S3 | M4):** `.env.example` documents `DATABASE_URL`, `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET`. Verify: read.
- **FIX-12 (S3 | M5):** e2e CI-ability — document that `test:e2e` needs dev+prod on :3000/:3001 + seeded DB. Verify: README diff.

### TRANCHE 4 — Polish & notes

- **FIX-13 (S3 | J):** unify homepage zinc tokens → brand tokens. Browser-verify. **Effort: M**
- **FIX-14 (S3 | H/K):** decision-log note only (counters single-writer confirmed; playerKey auth-by-obscurity accepted, rate limiting applies).

---

## Execution order

```
Tranche 0 (now):  FIX-01 → FIX-02   (S1s — one security commit + CHANGELOG)
Tranche 1:        FIX-03 → FIX-04   (hardening; FIX-04 has a user decision point)
Tranche 2:        FIX-05 → FIX-06   (spec truth)
Tranche 3:        FIX-07 → FIX-08 → FIX-09 → FIX-10 → FIX-11 → FIX-12
Tranche 4:        FIX-13 → FIX-14
Gate after each tranche: pnpm test (typecheck + lint + test:int + test:e2e) + build; commit + push per repo flow.
```

## Open decision for Viktor

**FIX-04 policy:** (a) strict UUID v4 validation for `playerKey` (clean, but existing non-UUID test keys stop resolving and localStorage profiles regenerate), or (b) keep current format validation + add a per-IP profile-creation cap (no breakage, bounds the blast radius). **Recommendation: (b)**, combined with FIX-03 rate limiting.
