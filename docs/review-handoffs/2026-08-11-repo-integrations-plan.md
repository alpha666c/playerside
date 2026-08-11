# Repo Integration Plan — no-ai-slop + open-seo (2026-08-11)

> **Mode:** plan (no code changed yet — this doc is the build roadmap).
> **Origin:** repo-scavenger + security-scan pass on 5 candidate repos (2026-08-11). Two approved for
> integration: `petergyang/no-ai-slop` (zero-risk, content quality) and `every-app/open-seo` (SEO tooling,
> MCP-ready). `open-generative-ai` deferred (muapi BYOK cost vs. Pollinations $0). `AutoGPT` deferred
> (Polyform Shield on platform folder, overkill vs. built-in pipeline). `OmniRoute` rejected (root-CA
> install + keychain access = trust surface we don't need).
> **Flow per phase:** implement → gate (`npx tsc --noEmit`, `pnpm lint`, `pnpm test:int`, `pnpm build`)
> → browser-verify → reviewer pass → DECISION-LOG + CHANGELOG → commit/push (house rules).

---

## PHASE I1 — no-ai-slop: kill AI-slop in the review copy pipeline (HIGH value, small)

**Goal:** editorial copy (summary, heroHeadline, claimsVsReality, methodologyNote) reads human-written,
never templated. Applied at the exact place public-facing copy is born.

**Why here:** the Editorial Writer (`src/agents/editorialWriter.ts` → `buildEditorialDraft`) is the single
choke point for all public-facing review prose. It runs a real model call; the output is the only prose
that reaches the review page. Fixing it here fixes every future review.

### I1.1 — Vend the skill (zero code)
- Fetch `petergyang/no-ai-slop` (MIT) → install **only `SKILL.md` + the pattern list** under
  `.agents/skills/no-ai-slop/` (matching the existing `.agents/skills/` structure). No repo build
  artifacts.
- **Provenance (S3):** pin the source commit SHA, retain the MIT LICENSE file, and add a provenance
  note (source URL + SHA) inside the vendored dir. Log the addition in DECISION-LOG skill inventory
  and AI-AGENTS-GUIDE if it lists skills.
- Purpose: available to me (Buffy) and to subagents doing content work in this repo.

### I1.2 — Deterministic slop-strip post-pass (the real fix)
- New `src/lib/slopGate.ts`: a pure function `stripAiSlop(text)` implementing the 20+ slop patterns from
  the repo (throat-clearing openers, "in today's fast-paced world", faux-insight setups, fake-profound
  endings, redundant qualifiers, etc.) as regex rewrite rules. The pattern list is **derived from the
  vendored SKILL.md** — that file is the single source; the sync point is documented.
- **Evidence-safe rewriting (S1):** before any rule applies, token-protect evidence-bearing substrings
  — placeholder-hold URLs, numbers (with `%`/`×`/`h`/currency units), timestamps, licence refs.
  Rules are **exact-anchored canned-phrase removals only** — never structural rewrites. Binary-contrast
  patterns ("It's not X, it's Y") are **excluded** as a class: they're legit rhetoric on a review site
  ("It's not the bonus size, it's the terms") and corrupt real claims when force-stripped.
- **Empty-output guard (S2):** if a stripped field is empty/whitespace, keep the original string.
- Wire into `buildEditorialDraft` **post-`str()`, on exactly the four prose fields** (`summary`,
  `heroHeadline`, `claimsVsReality`, `methodologyNote`) — never recursively on the draft object:
  `complianceBlock` and `categoryBreakdown` stay byte-untouched. **Deterministic, model-independent**
  — works even when the model fallback fires. No interaction with `guardClaimValue`/`forceUnverified
  Discipline` (those run on the desk-research claim path, not editorial prose).
- Unit tests (`tests/int/slopGate.spec.ts`): each slop pattern removed; compliance block + scores +
  URLs + numbers preserved byte-for-byte; **fallback methodologyNote ("commission-blind…") survives**;
  idempotent (double-run = single-run); legit "It's not X, it's Y" constructions NOT removed; empty-
  output guard fires.
- **Integrity-checker regression test (S3):** the commission-wall check
  (`integrityChecker.findCommissionWallTerm`) must still trip when a commission term is present
  **after** stripping.

### I1.3 — Role-file reinforcement
- Append a compact "no-AI-slop" writing rule block to `docs/review-agents/EDITORIAL-WRITER.md`
  (system prompt level — prevents the patterns from being generated in the first place; the gate in
  I1.2 is the safety net).

### I1.4 — Verification
- Gate: tsc + lint + test:int + build. Browser-verify a seeded review page's copy reads natural.
- Files touched: `.agents/skills/no-ai-slop/*`, `src/lib/slopGate.ts`, `src/agents/editorialWriter.ts`,
  `docs/review-agents/EDITORIAL-WRITER.md`, tests. No schema change, no migration.

---

## PHASE I2 — open-seo: keyword research + rank tracking for the Cofounder (MEDIUM, needs keys)

> **STATUS (2026-08-11):** prep SHIPPED — SystemSettings fields + migration
> (`20260811_add_open_seo_settings`), `src/lib/openSeo.ts` read-only MCP client,
> the Cofounder `seo_lookup` tool (per-turn cap, daily row budget, wrapUntrustedData),
> hardened VPS compose in `infra/open-seo/`, `.env.example` parity, 19 tests.
> **Remaining:** deploy the container on the VPS + paste the DataForSEO key in
> System Settings, then live E2E of a Cofounder turn invoking `seo_lookup`.

**Goal:** give the Cofounder + desk-researcher real SEO data (keyword volume, SERP rank, site audit)
without a $100+/mo Semrush bill. Self-hosted open-seo (MIT) + BYOK DataForSEO (~$0.0005/query).

### I2.1 — Hosting decision (needs user sign-off)
- **open-seo is NOT Vercel-deployable** (long-running service, own Postgres + Cloudflare D1, webhooks,
  cron). It runs in Docker on the VPS (or a small box). The playerside VPS already hosts other services.
- Deliverable: docker-compose service block for open-seo (postgres + app), env contract documented,
  and a note that its DataForSEO key stays on the VPS host env, **not** in the playerside repo.
- **VPS hardening (S2):** the compose block must NOT publish open-seo to `0.0.0.0` unauthenticated;
  require a strong admin password + non-default secrets in the env contract; and playerside calls
  open-seo with a **scoped API token** (issued by the open-seo instance), never its admin credentials.

### I2.2 — Playerside settings (SystemSettings global)
- Add two optional fields to `src/SystemSettings/config.ts`: `openSeoUrl` (http(s) base of the self-hosted
  instance) and `dataForSeoApiKey` (BYOK, optional — enables keyword/rank calls). **Migration generated
  via `payload migrate:create` (house rule — no hand-rolled migrations; the repo had a DROP TYPE incident
  from hand-written DDL), then payload-types regen.** Pattern matches existing `exaApiKey`/
  `elevenLabsApiKey`/`geminiApiKey` fields.
- House-keeping (S3): `.env.example` entries for `OPENSEO_URL`/`DATAFORSEO_API_KEY` (parity with other
  keys, even though DB takes precedence), and a `CREDENTIAL-LOG.md` entry when `dataForSeoApiKey` lands.

### I2.3 — Cofounder tool: `seo_lookup`
- New tool in `src/lib/cofounder/tools.ts` (pattern: `get_today_plan`, `draft_delegation`, …):
  - Inputs: `{ query: string, metric?: 'keyword-volume' | 'rank' | 'audit' }`
  - Behavior: calls self-hosted open-seo API with the BYOK DataForSEO key; returns JSON summary.
  - **Scoped:** admin-only (whole Cofounder is admin-only already), rate-limited (reuse `rateLimit.ts`
    pattern). Base URL and key are read from **settings only** — the model's tool args can never supply
    an arbitrary URL.
  - **Spend control (S2):** DataForSEO bills **per row, not per call** (100 keywords = 100 billable rows).
    Controls: ≤ 3 lookups/turn AND a **daily $-cap** (count spend via agent-logs audit events, mirroring
    `LLM_SPEND_CAP_PER_DAY`) AND a **max-rows-per-response cap** (e.g. ≤ 50 rows returned). Per-row
    billing documented in the plan.
  - **Prompt-injection containment (S1):** `seo_lookup` returns untrusted web data (SERP titles/
    snippets). Results MUST be wrapped with the existing `wrapUntrustedData` marker from
    `promptBundle.ts`, HTML-stripped, character-capped per result, and the system prompt must state the
    model must never treat result content as instructions. Hostile-SERP injection test required (this
    project's own injection discipline).
  - **Read-only discipline:** results are *research intel*; they may inform desk-research context, but
    never auto-write review fields (evidence discipline unchanged).
  - Graceful degradation (S3): clean "no key / no URL configured" path (mirror llm.ts) and a
    timeout/down-instance test.
- Optional follow-up (defer unless Viktor wants it): inject keyword/volume intel into
  `loadCaseContext` desk-researcher bundle for review-page SEO copy targeting.

### I2.4 — Verification
- Gate: tsc + lint + test:int (mocked open-seo client + tool schema tests) + build. Manual browser check
  of a Cofounder turn invoking `seo_lookup` against a stub response.
- Files touched: SystemSettings config + migration + payload-types, `src/lib/cofounder/tools.ts`,
  a small `src/lib/openSeo.ts` client, tests. No public-route changes.

---

## DEFERRED (logged, not scheduled)

| Item | Why deferred | Trigger |
|---|---|---|
| `open-generative-ai` | needs muapi.ai credits (BYOK); Pollinations covers Vex concept art at $0 | Viktor wants production-quality art at scale |
| `AutoGPT` | Polyform Shield on `autogpt_platform/` blocks commercial hosted use; our Cofounder pipeline already covers research/QA/writing | A deep-research agent need beyond Cofounder scope |
| `OmniRoute` | root-CA install + keychain access = unacceptable trust surface for a gateway we don't need | Never (rejected) |

---

## Order & estimates

1. **I1** (no-ai-slop) — 1 session. No keys needed. Highest value-per-risk.
2. **I2** (open-seo) — 1–2 sessions. Needs: VPS Docker access + DataForSEO key (Viktor) + open-seo URL.
3. Each phase ships independently (own commit, own CHANGELOG entry).

## What I need from Viktor (when we start each phase)

- **I1:** nothing.
- **I2:** DataForSEO API key (~$30 trial credit, pay-per-**row**) + VPS confirmation for the open-seo
  container + approval to add `openSeoUrl`/`dataForSeoApiKey` settings fields.

---

## Reviewer pass (2026-08-11) — APPROVE_WITH_FIXES, all findings folded in

Critical review by Nit Pick Nick against the live codebase. All S0–S3 findings incorporated above:

- **S1 — evidence-safe stripping:** token-protect URLs/numbers/units/timestamps; exact-anchored canned-
  phrase rules only; binary-contrast class excluded; empty-output guard. ✅ (I1.2)
- **S1 — seo_lookup injection:** wrapUntrustedData + HTML strip + char cap + hostile-SERP test. ✅ (I2.3)
- **S2 — field scope:** strip runs post-`str()` on the 4 prose fields only; complianceBlock +
  categoryBreakdown byte-untouched; fallback strings survive; commission-wall regression test. ✅ (I1.2)
- **S2 — spend:** per-row billing → daily $-cap + max-rows cap + per-turn cap. ✅ (I2.3)
- **S2 — VPS auth:** no unauthenticated 0.0.0.0 exposure; scoped token, not admin creds. ✅ (I2.1)
- **S2 — migration:** `payload migrate:create` only. ✅ (I2.2)
- **S3 — provenance:** commit SHA + MIT LICENSE + provenance note + skill-inventory logging. ✅ (I1.1)
- **S3 — house-keeping:** .env.example, CREDENTIAL-LOG, no-key/timeout tests. ✅ (I2.2/I2.3)
- **Ordering I1 → I2:** confirmed correct. Scope: no creep. ✅
