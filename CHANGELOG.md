- **feat(ai): Phase I2 follow-up — keyword/volume intel injected into the desk-researcher bundle.**
  - **`src/lib/openSeo.ts`** — `sanitizeSeoLines` (line-preserving sanitizer for
    pipe tables), `parseSeoCopytargets` (table → `{keyword, volume}`, header
    skip, hostile-row containment incl. `</untrusted_data>` tag stripping,
    sorted desc, cap 15), `buildSeoCopytargetPromptBlock` (inlined
    untrusted-data contract — agents layer does not import the Cofounder
    bundle), `fetchKeywordIntel` (best-effort, never throws; daily row budget
    checked; `seo_call` ledgered on any successful billed call).
    `callOpenSeoMcp` gains `opts.preserveLines` (default collapse — `seo_lookup`
    unchanged).
  - **`src/agents/deskResearcher.ts`** — one best-effort `research_keywords`
    lookup per run (seed = operatorName → casinoType), injected into the TASK as
    `<untrusted_data>` (never `context` — no-invention guards intact);
    deterministic `_seoCopytargets` on `deskResearchOutput`; call site wrapped
    so intel can never fail the run.
  - **`docs/review-agents/DESK-RESEARCHER.md`** — §9 SEO Copytarget Intel
    (display-only, never evidence; mention top terms in `_assistantSummary.note`).
  - **Tests** — `tests/int/seoCopytargets.int.spec.ts` (13): sanitize/parse
    units, prompt-block contract, `fetchKeywordIntel` integration
    (unconfigured-no-spend, success + spend, daily budget, unreachable,
    unparseable-content spend), and a desk-researcher E2E with mocked LLM +
    stubbed MCP: `_seoCopytargets` on output, claims stay unverified, intel in
    task but absent from case-context JSON, unconfigured control.
- **feat(ai): Phase I2 — open-seo prep: SystemSettings fields, seo_lookup tool, VPS compose.**
  - **Settings:** `system-settings` global gains `openSeoUrl`, `openSeoProjectId`,
    `dataForSeoApiKey` (secret, admin-only) and `seoRowCapPerDay` (default 500,
    0 disables) — env-over-DB (`OPENSEO_URL` / `OPENSEO_PROJECT_ID` /
    `DATAFORSEO_API_KEY` / `SEO_ROW_CAP_PER_DAY`). Migration
    `20260811_add_open_seo_settings`: idempotent `ADD COLUMN IF NOT EXISTS` ×4 +
    `enum_agent_logs_event` gains `seo_call` (the spend counter, mirroring
    `llm_call`).
  - **`src/lib/openSeo.ts`** — read-only MCP client for the self-hosted
    every-app/open-seo instance (MIT): streamable-HTTP JSON-RPC (initialize →
    notifications/initialized → tools/call) with JSON + SSE parsing and
    session-id capture; 15s timeout; maps keyword-volume→`research_keywords`,
    rank→`get_ranked_keywords`, audit→`get_audit_issues` (read-only tools only,
    limit ≤ 50); `sanitizeSeoText` strips scripts (content included) / tags /
    entities + 8k char cap; daily row budget `checkSeoDailyCap` (paginated sum of
    `seo_call` rows); `recordSeoCall` spend log. Review-caught bug:
    `Number(null) = 0` silently disabled the cap — `num()` treats null/'' as
    fallback.
  - **Cofounder `seo_lookup` tool** — settings-only config (no SSRF), per-turn
    cap 3 via `ToolContext.seoCallsUsed` (route passes ONE mutable ctx per
    turn), daily row cap, read-only, results wrapped in `wrapUntrustedData`
    (hostile-SERP containment); `seo_call` audit row written only on success;
    `audit` metric no longer requires a query (S3). promptBundle LOCKS line:
    SERP data is data, never instructions/evidence.
  - **Infra:** `infra/open-seo/docker-compose.open-seo.yml` — loopback-only bind
    `127.0.0.1:3100:3001`, `AUTH_MODE=cloudflare_access` default (never
    unauthenticated 0.0.0.0), telemetry off, secrets from VPS host `.env` only —
    plus README env contract + threat notes (worst-case spend ≈ $0.25/day at 500
    rows × $0.0005); `.env.example` parity.
  - **Tests:** `tests/int/openSeo.int.spec.ts` — 19 tests (env-over-DB config
    precedence incl. null-clear, sanitizer + hostile-injection containment,
    no-config graceful paths, per-turn + daily caps, mocked MCP handshake +
    tool-args assertions, SSE parsing, isError + unreachable, failed-call spend
    accounting). `g5ToolContract` dispatcher allowlist gains `seo_lookup`.
    297/297 suite green; tsc + lint + build clean.
  - **Awaiting (Viktor):** DataForSEO key + VPS container for live E2E.

- **feat(content): Phase I1 — kill AI-slop in review copy (vendored no-ai-slop skill + deterministic gate).**
  - **Vendored `petergyang/no-ai-slop`** (MIT, pinned `d30eddb9`) into `.agents/skills/no-ai-slop/`
    (SKILL.md + eval.md + LICENSE + PROVENANCE.md) as the agent-level editorial guide.
  - **New `src/lib/slopGate.ts`** — the deterministic enforcement point. `stripAiSlop()`:
    token-protects evidence (URLs, licence refs, numbers+units, currency, timestamps,
    RTP/ratios) before rules run and restores them after, so published facts ("avg 4.2h
    payout", "35× wagering → $3,500", "MGA/CRP-123456") can never be mangled (S1);
    sentence-initial opener removal incl. weasel attribution; grammar-safe
    `SLOP_REPLACEMENTS` (game changer → major change, in terms of → for, …); filler +
    deletable-adjective removal; binary contrasts ("It's not X, it's Y") intentionally
    preserved (legit review rhetoric); empty-output guard; structurally idempotent.
    Debug note: the first cut captured the internal `out` in the restore closure and
    silently discarded every edit — restore now takes the caller's string (regression-
    tested). `let's dive in to X` is left alone (mid-clause removal corrupts grammar);
    the role-file rule prevents generation instead.
  - **Wired into `buildEditorialDraft`** (`src/agents/editorialWriter.ts`) — exactly the four
    prose fields (summary, heroHeadline, claimsVsReality, methodologyNote) pass through the
    gate post-`str()`; `complianceBlock` + `categoryBreakdown` are byte-untouched.
  - **`EDITORIAL-WRITER.md`** gained a No-AI-Slop writing-rules section (prevention; the gate
    is the safety net).
  - **Tests:** `tests/int/slopGate.int.spec.ts` — 23 tests (evidence byte-preservation,
    idempotency, binary-contrast non-removal, mid-text openers, weasel non-strip pin,
    empty guard, complianceBlock untouched, commission-wall regression). Fixed a pre-existing
    fragile test in `llm.int.spec.ts` (promised "DEEPSEEK_* aliases when LLM_* unset" but
    never cleared LLM_*; the 2026-08-11 key rotation added a real `LLM_API_KEY` to `.env`).
  - Reviewer pass: APPROVE_WITH_FIXES — 4× S3 folded in (dead `report` code removed,
    comment/code ordering aligned, `let's dive in` grammar case, mid-text + weasel pins).
  - Verification: tsc + lint + **278/278 tests** + build exit 0 (48/48 static pages).

- **chore(ai): rotate LLM API key + first Vex concept art (Gemini-replacement research landed).**
  - **Key rotation (2026-08-11):** new OpenRouter key stored in all three stores — local
    `.env` (`LLM_API_KEY`), the `system-settings` DB global (admin rotation path), and
    Vercel production env (Sensitive). Verified live: `deepseek/deepseek-v4-flash` returns
    a real completion via the rotated key (provider SiliconFlow). Old key retired. No
    secret values in git — see `docs/review-system/CREDENTIAL-LOG.md`.
  - **Gemini replacement decided (research, 2026-08-11):** the Google Cloud project's
    unpaid-bill (dunning) block blocks Imagen/Veo via the Gemini key. Live OpenRouter
    catalog check: Google image models ARE hosted on OpenRouter (billed through the
    OpenRouter balance — bypasses Google's billing entirely), but the cheapest path for
    **Vex concept art is Pollinations.ai (zero-key)** — chosen by Viktor. Five noir-ops
    portraits generated on the brand palette (ink / coral ledger / evidence-blue),
    saved under `art-concepts/vex/` for review (768×768, flux, seeded).
  - **Free-model findings for the pipeline:** `nvidia/nemotron-3-ultra-550b-a55b:free`
    (1M ctx, $0) is a strong free orchestrator candidate for the Cofounder; `google/gemma-4-31b-it:free`
    and `inclusionai/ling-3.0-tiny:free` also live on OpenRouter — logged in DECISION-LOG
    for a future model swap; no code change made.

- **feat(ui): Phase H2 — Wire Room hero 2.0 (view transitions, atmosphere, cursor signal).**
  `experimental.viewTransition` on for Next-native route cross-fades; persistent
  header/footer get their own transition identity (`vt-header`/`vt-footer`) so the
  chrome stays put while the page body cross-fades (root `vt-out`/`vt-in`, guarded
  by prefers-reduced-motion). Hero gets a `.atmos` layer — two slow-drifting
  evidence/coral washes (transform-only, pointer-transparent, reduced-motion off) —
  plus the static `.hud-scanlines` CRT texture. New `CursorSignal` desktop cursor
  glow: evidence/coral radial signal trailing the pointer + subtle magnetic pull on
  `[data-magnetic]` CTAs; gated on `(hover:hover) and (pointer:fine)` and
  prefers-reduced-motion, with live media-query listeners and a symmetric
  enter/leave cleanup so magnetic state can never leak (reviewer S2). No React
  re-renders (refs + rAF), transform-only animation, native cursor and
  `:focus-visible` untouched.

- **fix(deploy): unblock Vercel builds — converge the delegation-queue DROP TYPE on the dev-pushed prod DB.**
  Every deploy for ~24h failed at prebuild's `ci-migrate` step: migration
  20260809_184012's `up` ran a bare `DROP TYPE "enum_cofounder_sessions_delegation_queue_source"`,
  but on the prod DB (bootstrapped by dev-mode schema push) that enum was
  never created — 20260809_183111 got baselined when its CREATE TABLE hit
  duplicates, so the whole transaction (incl. its CREATE TYPEs) rolled back.
  `42704` (undefined_object) wasn't in the reconciler's tolerance sets, so
  ci-migrate exited 1 and every build died before static generation.
  - 20260809_184012 `up`: `DROP TYPE` → `DROP TYPE IF EXISTS` (same hardening
    pattern as 20260809_182227's llm_provider conversion).
  - `scripts/ci-migrate.ts`: `DROP_ALREADY_APPLIED_CODES` now includes 42704
    (missing TYPE) — any future DROP-type migration converges on dev-pushed
    DBs instead of hard-failing; 42704 only applies to drop-type ups, so
    non-drop migrations stay strict.
  - Verified on the real Vercel build: `20260809_184012 APPLIED`, chain
    reconciled (7 applied, 15 already-present, 22 total), ✓ compiled 14.6s,
    ✓ 51/51 static pages generated, deployment Ready.
  - Housekeeping: ElevenLabs + Gemini keys stored as Vercel production env
    vars (Sensitive, values hidden) + in the local dev system-settings
    global — keys never committed to the repo.

- **feat(ui): Phase H1 — palette convergence + the alive-layer (Wire Room groundwork).**
  The 4-layer Alive-UI gameplan (research + roadmap, docs/review-handoffs/
  2026-08-10-alive-ui-gameplan.md) kicked off with "kill the dead pixels":
  every public surface now speaks one brand language.
  - **Hero shader converged:** the WebGL evidence field dropped the old
    amber/emerald (#fbbf24/#34d399) for brand tokens — coral ledger dots
    (#ff5d45) with evidence-blue verified points (#6ea8d8); the cursor
    ripple is now the coral action color. Static reduced-motion fallback
    (globals.css .evidence-field-static) matches.
  - **Dashboard zone re-skinned:** /dashboard shell, TeamDashboardClient,
    operator directory and case inspector moved off zinc-950/amber-400 to
    ink/dusk/line/coral/evidence/success/warning; stage badges mapped to the
    brand semantic set (published = solid green, monitoring = dashed green
    outline so the two never blur together).
  - **Alive-layer primitives:** `.kinetic` hover utility (transform/border/
    shadow through the motion tokens, hover-only under @media (hover:hover))
    and the entry ceremony (.enter-eyebrow/.enter-title/.enter-fade one-shot
    choreography, collapsed to instant by the global reduced-motion rule).
    Applied to the homepage hero (badge → title blur-rise → subhead → proof
    metrics) and to dashboard cards.
  - **Reveal component:** new optional `blur` prop (blur-to-sharp entrance)
    with reduced-motion plain-fade fallback.
  - **Admin SystemSettings:** new `elevenLabsApiKey` + `geminiApiKey` fields
    (same managed-key pattern as Exa — paste once at /admin/globals/
    system-settings, every host reads from the DB). Migration
    20260810_add_system_settings_keys + regression test locking the
    save/read contract (the "Something went wrong" bug class).
  - Verified: tsc, lint, 255/255 int tests (incl. new settings spec), build
    clean, migration applied, old hexes gone from the shipped bundle.

- **fix(control-room): two real bugs caught by the browser E2E — the control room now works end-to-end.**
  - **decideJob expectedVersion gap:** the UI's approve function read `expectedVersion` from `runs` (derived from `aiRuns`), so a fresh case with no prior runs (common for the first delegation-queue approve) never sent the version → the route returned 400 "expectedVersion is required". Fixed: `decideJob` falls back to the pinned case's own `version` field (populated at depth 1 in the ticket GET), so the very first approve on a fresh case works.
  - **Commission-wall false positive:** the no-key fallback editorial writer's `methodologyNote` contains "commission-blind evaluation rules" — the integrity checker's Commission Wall check did a bare substring match for `commission`, which always blocked the fallback skeleton copy. Fixed: `findCommissionWallTerm` strips the safe methodology phrases (`commission-blind`, `commission-free`, `commission-neutral`) before scanning, so the system's own disclosure never false-positives. Real commercial terms (CPA, revshare, affiliate link, referral fee) are still caught.
  - **Regression tests:** `findCommissionWallTerm` unit test (skeleton copy passes, real deal terms still blocked) in `integrity-freeze.int.spec.ts`.
  - **Verification:** logged into the admin, approved the desk-researcher delegation job on ticket 725 → DONE, applied to case 750 (deskResearchOutput + evidenceRegister, version 1→2). Walked the case through score-analyst, editorial-writer, integrity-checker (PASS verdict). Published via the control room → review doc #4 flipped live (`_status: published`, slug `g6-e2e-operator-385579`, markets `nl`, KSA license). Public page `/casinos/g6-e2e-operator-385579` → HTTP 200, `/casinos` listing shows the operator. Pipeline: 1 live.

- **feat(ai): Phase G G.6/G.6b — the delegation control room: Approve & Publish.**
  `POST /api/cofounder/approve` is now the delegation executor: QUEUED→REJECTED,
  QUEUED→APPROVED for roster-only roles (no apply), while the five pipeline roles
  run the REAL agent function WITH apply (`applyDraft` + `expectedVersion` +
  `changedFields`). Wrong-stage jobs are marked APPROVED without apply; an agent
  409 → `BLOCKED_CONFLICT` + revert to QUEUED; any other failure → revert QUEUED +
  notes. `updateQueue` rebases on a fresh ticket version (one 409 retry).
  `POST /api/cofounder/publish` is the human-initiated §12 two-step (DRAFT doc →
  link case → flip doc live) with server-side re-read + verdict-freshness gates
  (`verdict === PASS` AND `case.version === verdictForVersion`, keyed off the latest
  COMPLETED integrity run, not counts). `GET /api/cofounder/status` aggregates
  case/ticket/job counts for the control room; new **T8 `draft_delegation`** tool
  creates queue jobs for the five roles. `delegationQueue.notes` (migration
  `20260809_211624`) + AgentLogs select/union extension (migration `20260809_210514`).
- **fix(ai): two real bugs the G.6 E2E caught.** (1) *`req.context` leak (phantom
  409)* — the route's ticket-write passed an optimistic-version `context` which
  Payload mutates onto the SHARED `req`, so the agent's `completeAiRun` case-write
  consumed a stale `expectedVersion` and 409'd; the agent now runs on a **fresh
  local req**. (2) *`sourceType: 'public-web'` enum violation* — the evidence
  register select only accepts 5 enum values but the desk researcher's fallback
  placeholder and row mapping emitted `public-web`, so a desk-research apply
  without an LLM key always failed validation; fixed with `normalizeSourceType`
  (default `other`) + the system prompt now enumerates the exact enum.
- **Verification:** tsc + lint + **253/253 tests** (2 new regression tests) + build
  + 12-check HTTP E2E (approve→apply lands on case, reject, 409 double-decide,
  publish blocked without fresh verdict: WRONG_STAGE / BLOCKED_CONFLICT /
  VERDICT_BLOCKED / STALE_VERDICT, status/ticket GET); publish positive path +
  idempotent re-publish covered by `g6Publish.int.spec.ts` (15 tests).

- **fix(ai): lock the LLM provider to OpenRouter (`deepseek/deepseek-v4-flash:free`).** The
  Cofounder + pipeline agents now target OpenRouter by default — env names are provider-agnostic
  (`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`, with `DEEPSEEK_*` kept as deprecated aliases),
  the SystemSettings admin defaults flipped to OpenRouter (base URL `https://openrouter.ai/api/v1`,
  model `deepseek/deepseek-v4-flash:free`), and the admin field is relabeled "LLM provider API key"
  (field name unchanged for DB compatibility). `.env.example`, `CREDENTIAL-LOG.md`, and the Phase G
  build spec document the `:free` rotation risk + fallback chain (paid `deepseek-v4-flash` →
  DeepSeek direct `deepseek-chat`); tests updated to canonical names + OpenRouter defaults
  (174 green). Viktor's DeepSeek key tested live: HTTP 402 Insufficient Balance — OpenRouter key
  required (admin System Settings or `LLM_API_KEY` env).

- **fix(ai): default LLM finalized — paid `deepseek/deepseek-v4-flash` (~14¢ per million tokens).**
  The `:free` variant Viktor picked was rotated out of OpenRouter's catalog (live-verified: no
  DeepSeek `:free` exists; only 2 relevant models from his pasted list are live — Poolside Laguna
  XS 2.1 and Cohere North Mini Code, both with strict free limits). The paid variant is the same
  model, effectively free, and never rotates. Default model updated in `llm.ts`, the SystemSettings
  global, and `.env.example`; tests, CREDENTIAL-LOG, and the Phase G build spec updated to match.
  Gemini 3 Flash free tier (Google AI Studio, 1,500 calls/day, no card) documented as the $0
  fallback. Gates: tsc + lint + 176/176 tests green.

- **docs(ai): model routing decision — DeepSeek V4 Flash stays the sole default.** Viktor chose
  quality-first everywhere over a cost-split (no code change; already wired in the previous
  commit). Logged the OpenRouter budget reality (~$0.22/day at 100 calls/day, ~15K tokens/call)
  and the zero-code per-role override escape hatches (`LLM_MODEL_<ROLE>` env → cheaper/free
  models like `inclusionai/ling-3.0-flash` or `openai/gpt-oss-20b:free`) for when a top-up
  isn't convenient. See DECISION-LOG 2026-08-09.

- **fix(admin): System Settings save failure — `llmProvider` enum footgun.** Saving keys in
  `/admin/globals/system-settings` failed with "Something went wrong": `llmProvider` was a `select`
  field whose Postgres enum only contained `deepseek`, so the newer `openrouter` value was rejected
  (`invalid input value for enum`). `llmProvider` is now a `text` field (kills the bug class;
  informational anyway — routing is by baseUrl+model) + migration `20260809_182227` converts the
  column to varchar, refreshes stale DB defaults, and drops the enum (`DROP TYPE IF EXISTS` for
  dev-pushed prod DBs; down maps `openrouter → deepseek`). E2E-proven save (admin login +
  updateGlobal with keys → read back OK); migration down/up cycle verified. Gates: tsc + lint +
  176/176 tests.

- **feat(ai): Phase G.2 — `CofounderSessions` ticket collection.** The Cofounder's resumable
  session unit (`#CF-YYMMDD-NN`, auto-numbered per day via a field-level beforeValidate hook):
  title, sessionType, status, plan array (linked to research-queue cases), pinnedCases, thread,
  the delegation queue (spec §4.1 — the Cofounder proposes jobs, humans approve/execute), and
  lastActiveAt. Reuses the research-queue optimistic-version contract (generalized into a
  factory; stale `expectedVersion` → 409). Audit events `ticket_created` /
  `ticket_status_change` / `ticket_updated` added to agent-logs. Migrations `20260809_183111`
  (5 tables + enums) + `20260809_184012` (delegationQueue.source select→text — avoids the
  single-value-enum footgun). 8 int tests; gates: tsc + lint + **184/184**.

## 2026-08-09 — Phase G G.4: the Cofounder workspace (/admin/cofounder)
- **feat(ai): Phase G G.5 — the five pipeline agents are rewired onto the real model.** Desk Researcher, Score Analyst, Editorial Writer, Integrity Checker, and Monitor no longer return placeholder JSON — each now calls the shared `chatLlm` client (role file = system prompt, allowlisted case context = the only source of facts) through a new `src/agents/llmBridge.ts`. The safety mechanics that keep a real model call inside the evidence discipline: **no fabrication** (a claim value survives only with a cited http(s) source or when it exists in the case context — a hostile model's invented licence number is dropped), **no self-verification** (every `confidence`/`verificationStatus` is forced back to `unverified` — QA S1-2), deterministic skeletons own the schema (a garbage reply falls back to the all-unverified skeleton without crashing), the editorial compliance block is pinned deterministic constants (18+/RG links can never be model output), the integrity verdict is recomputed deterministically (model S0/S1 findings can only BLOCK; S3 is advisory), and the monitor is honest (`CHECK_SCHEDULED` instead of the old fabricated "license standing active"). New **T7 `run_pipeline_agent`** Cofounder tool triggers any of the five as DRAFT-ONLY (never applies; refuses when the turn's wall-clock budget can't fit the run). Also: a latent bug the E2E caught — `grade_assigned` audit events were missing the mandatory `evidenceRef`, so a score-analyst run could never complete (now `evidenceRef: runId`); `aiRuns.status` gained `complete-with-warning` (migration `20260809_203730`, hardened down) so a fallen-back run is visibly marked instead of looking like a legitimately thin result. Verified: tsc + lint + **227/227 tests** (31 new) + build, plus a 19-check E2E running all five agents against a hostile mock LLM and a prose-mock fallback path.
- **fix(admin): regenerate the Payload importMap so every custom admin view actually renders.** Root cause of the blank `/admin/pipeline`, `/admin/gamification`, and `/admin/cofounder` pages (and the reason the browser-verification pass for G.4 had to be retried): Payload v3 routes string-referenced admin components through `src/app/(payload)/admin/importMap.js`, and that file was stale (Aug 6) — none of the three custom views were in it, so the client threw `getFromImportMap: PayloadComponent not found` and rendered nothing. Fix: regenerated the importMap (+8 lines) and wired `payload generate:importmap` into `prebuild` (after `wait-for-db`, so it reaches every `pnpm build` and Vercel deploy) **and** into `dev`, so a future custom view can never blank-page silently again. Verified end-to-end in real Chrome (Playwright, system Chromium channel): all three views render content, the Cofounder workspace panes render, a live chat turn streams a reply, plan items add to the board, and the console is clean (0 errors). Chrome-bridge verification is now a repeatable, scripted flow in this repo.

- **feat(admin): three-pane Cofounder workspace (spec §11).** Registered as a custom admin view at
  `/admin/cofounder` (`CofounderView.tsx`): **left** — today's plan rollup + the ticket list
  (open/active/paused/done, #CF, sessionType, lastActive) + a "New ticket" form; **center** — the
  ticket workspace (status/sessionType chips, pause/close actions, the STREAMING Cofounder thread
  consuming the SSE delta/done contract, the plan board with per-item status + add form, and pinned
  cases with Edit/Chat deep links); **right** — last-turn tool activity (ok/err chips + expandable
  output) and the read-only delegation queue (approve/reject + approve-to-publish arrive with the
  G.6 control room).
- **feat(api): `GET /api/cofounder/tickets/:id`** — the full ticket at depth 1 (plan, thread,
  pinnedCases resolved, delegationQueue, version) for the workspace panel. **`POST
  /api/cofounder/tickets/:id/plan`** — add/update a plan item through the shared
  `updateTicketPlanItem` (extracted from the `set_plan_item` tool so the panel and the Cofounder
  mutate the plan through the exact same optimistic-version path; reviewer S3 — no drift). Plan
  route preserves Payload statuses (404/409) on failure.
- **feat(admin):** dashboard home gained a live "Cofounder workspace" block (ticket + plan-item
  counts via the tickets endpoint).
- **Hardening (reviewer S2/S3):** ticket-switch race guarded with a live-selection ref — stale GET
  responses and mid-stream chat deltas from a previous ticket can never overwrite the current
  workspace; `fetchJson` only sets Content-Type when a body exists.
- **Tests:** gates tsc + lint + **196/196** + full build + 12/12 E2E smoke (ticket detail, plan
  add/update, pinnedCases depth, chat SSE, /admin/cofounder 200).

## 2026-08-09 — Phase G G.3: Cofounder chat route + ticket lifecycle endpoints

- **feat(ai): `POST /api/cofounder` — the Cofounder chat endpoint (SSE).** Admin-only. Resolves or
  creates the work-session ticket (§3.1 #2: reuse today's open/active ticket only when its
  sessionType matches the detected intent and it is owned by the acting admin; otherwise a fresh
  `#CF-YYMMDD-NN` ticket is created), builds the system-prompt bundle (identity + locked rules +
  session state + budget-trimmed thread, 12k tokens), runs the model with the 5 ticket-scoped tools
  (max 4 iterations, 190s wall-clock budget — QA S1-3), records user-then-assistant turns on the
  ticket `thread` via the optimistic-version contract (one 409 retry; a failed assistant call still
  leaves the user turn + a `system` failure note — reviewer S3), runs the banned-phrase output gate
  (RG aside appended, flagged in the `done` event), and streams the reply as chunked SSE
  (`{"delta"}` … `{"done":true,…}` — the same wire contract `streamLlm` uses; the loop itself runs
  non-streaming because `streamLlm`'s parser can't relay tool-call deltas, and re-generating the
  final answer would double spend).
- **feat(ai): ticket endpoints.** `POST /api/cofounder/tickets` (create + today's plan rollup),
  `POST /api/cofounder/tickets/resume` (full ticket + mark active — shares `findTicketAndResume`
  with the `resume_ticket` tool), `POST /api/cofounder/tickets/:id` (`{action:'pause'|'close'}`;
  close refuses open plan items unless `confirm:true`).
- **fix(ai): `#CF` numbering race closed (QA S2-4).** The count-then-insert field hook collides
  under concurrent creation (tool + REST + route + parallel test files). `createTicketWithRetry`
  counts once and walks UP from the base on unique collision (Payload re-wraps Postgres 23505 into
  a ValidationError whose path survives in `data.errors[0].path` — `isUniqueViolation` matches that
  plus the raw code/message forms).
- **feat(ai): `llm.ts` tool-loop support.** `LlmMessage` gains `toolCalls`; `buildBody` serializes
  `tool_calls` / `tool_call_id` (backward compatible — plain messages serialize byte-identical).
- **Migration `20260809_185901`:** adds `tool_call` to the agent_logs event enum; down migration
  hardened with `DROP TYPE IF EXISTS` + CASE remap of `tool_call` rows (reviewer S2).
- **Tests:** 12 new (tools: create/resume/close/plan/audit; prompt bundle shape + thread trim;
  output gate) + G.2 tests re-pointed at `createTicketWithRetry`. Gates: tsc + lint + **196/196**
  + full build + 14-check E2E smoke (mock LLM, incl. the failure-trace path).

## 2026-08-09 — Phase G: admin-managed settings — keys live in the DB, one place for every host

- **New `SystemSettings` global** (`/admin/globals/system-settings`, admin-only): DeepSeek API
  key, model, base URL, max tokens, daily cap, and the Exa key. Read from the shared database on
  every host (Vercel + VPS + local) — paste once, used everywhere. Env vars still override.
- **`llm.ts` config is now async** with precedence env > DB > defaults; `/api/cofounder/health`
  reports where the key came from (`keySource`). Rotation invalidates the cache instantly.
- **Migration `20260809_162628`** adds the `system_settings` table + the `llm_call` agent-logs
  enum value (trimmed to only Phase G changes — see DECISION-LOG). Applied locally.
- Tests: 174/174 green (DB-fallback, env-wins, keySource cases added).

## 2026-08-09 — Phase G G.1: shared LLM client (DeepSeek V4 Flash) + health self-check

- **Implemented:** `src/lib/reviewChat/llm.ts` — one OpenAI-compatible LLM client for the
  Cofounder + the five pipeline agents: env config (DEEPSEEK_API_KEY/BASE_URL/MODEL,
  LLM_MAX_TOKENS), per-role model overrides (`LLM_MODEL_<ROLE>`), daily spend cap via
  `agent-logs` (`llm_call` event, log IS the counter), non-streaming chat with tool-call
  parsing, SSE streaming with a stable `{"delta":...}`/`{"done":true}` contract, and a
  model-id self-check. Default temperature 0.3 for rubric-strict determinism.
- **New route:** `GET /api/cofounder/health` (admin-only) — reports key-missing vs
  model-id-verified state; the admin UI will render it as a status chip.
- **Collection:** `llm_call` added to `agent-logs` event options (operational class) +
  `logEvent` union; `payload-types.ts` regenerated. No migration required.
- **Env contract:** `.env.example` + `CREDENTIAL-LOG.md` updated (DEEPSEEK_*, LLM_*, EXA_API_KEY).
- **Tests:** `tests/int/llm.int.spec.ts` — 11 mocked tests (config, cap 429, no-key, tool
  calls, provider errors, health, streaming). Gates: typecheck + lint + **172/172** green.
- Live verification runs once `DEEPSEEK_API_KEY` is in the environment (health endpoint).

## 2026-08-09 — Phase G round 2 planned: orchestrator control room + approve-to-publish

- **Planned (doc-only commit):** extended the Phase G Cofounder spec with the `/admin/cofounder`
  control room (tickets & today's plan, streaming chat + plan items, agents-at-work + delegation
  queue + Approve & Publish) and the human-initiated approve → publish flow (draft → link → flip
  ordering, verdict freshness guard, deterministic-slug idempotency). The model can never publish;
  Viktor's Approve triggers the mechanical publish and the existing revalidate hooks update the site.
- Spec updated: `docs/review-handoffs/2026-08-09-ai-cofounder-phase-g-build-spec.md` §11–§13
  (QA round 2: APPROVE_WITH_FIXES, all resolved). Build order G.6/G.6b; tests #13–#20.

## 2026-08-09 — Phase G planned: "The Cofounder" — AI operations partner in the admin

- **Planned (doc-only commit):** approved build spec for a chat-first meta-agent in the
  Payload admin (DeepSeek V4 Flash) that guides reviews against the locked algorithm, plans
  daily workloads, researches trending operators/bonuses (Google/X/Reddit/AskGamblers/
  CasinoGuru), runs on resumable tickets (#CF-YYMMDD-NN), and drafts roster delegations.
- Includes the shared LLM client (`src/lib/reviewChat/llm.ts`) that will also make the five
  placeholder pipeline agents real (G.5). No autonomous case writes; Apply contract unchanged.
- Spec: `docs/review-handoffs/2026-08-09-ai-cofounder-phase-g-build-spec.md` (QA-approved,
  findings resolved in §11). Implementation is Phase G, order G.1–G.7, pending Viktor's go.

## 2026-08-09 — Phase B: tactical homepage + HUD framing (Tactical 2.0, second cut)

- **feat(motion): Phase E round 2 — section reveals land on the homepage, real reduced-motion story for the hero.**
  - Homepage sections now scroll-reveal: SEC 02 (operator directory), SEC 04 (claims), SEC 05
    (bonus decoder) and the Missions band fade+slide in via the shared `Reveal` component
    (slow+expo tokens). SEC 03 is deliberately unwrapped — its ScrollTrigger pin breaks under a
    transformed ancestor.
  - `Reveal` hardened and given its first real usage: a mounted-gate means SSR/no-JS renders
    content fully visible (never baked `opacity-0`), and an in-view sync check at mount kills the
    visible->hidden flash for above-the-fold use.
  - **Bug caught in review:** Tailwind v4 `translate-*` use the modern `translate` property, not
    `transform` — the arbitrary `transition-[opacity,transform]` list meant the reveal slide was
    snapping while only opacity animated. Fixed to `transition-[opacity,translate]`; same fix to
    the shared `ui/button` and `PillButton` transition lists so their hover lifts animate.
  - Reduced-motion hero story: instead of the WebGL field vanishing, the hero now falls back to a
    `StaticEvidenceField` — a zero-animation CSS dot-grid texture with the same amber/emerald
    ledger grammar — for reduced-motion, no-WebGL, and weak devices. Users who asked for less
    motion keep the atmosphere, still.

- **feat(motion): Phase E — motion tokens standardized site-wide, radar accents, reduced-motion verified.**
  - Every public surface now speaks the Phase A motion tokens: `@utility duration-fast/med/slow`
    (150/260/520ms from `--dur-*`) and `ease-quart`/`ease-expo` (from `--ease-out-*`). ~30 files
    swept from hardcoded `duration-200/300/500/700` and `ease-[cubic-bezier(0.25,1,0.5,1)]` to the
    token utilities (Header, compare, archive, cards, homepage widgets, Vex missions, review page).
  - Bare `transition-*` now resolves to `--dur-fast` + `--ease-out-quart` by default
    (`--default-transition-duration` / `--default-transition-timing-function` in `@theme inline`).
  - Entrances use slow+expo (Reveal), interactions use fast+quart (buttons, links) — the
    interaction/entrance split documented in DESIGN-SYSTEM §5.
  - Radar accent: a `.radar` conic sweep primitive (rings + rotating beam) placed behind the hero's
    `SEC-01 // LIVE_INTEL` readout — the one spot on the homepage that earns it; the leaderboard's
    evidence dot now pings (motion-reduce:animate-none).
  - Reduced motion: radar beam killed via scoped `prefers-reduced-motion` rule; all animate-in
    toasts/drawers retain fast timing because the duration utilities mirror Tailwind v4's
    `--tw-duration` coupling (fixes animate-in falling back to the 1s default — reviewer S2).


- **feat(review): the review page is now a case file.** Top header gains a mono
  `CASE FILE // evidence_logged` rule; the verdict box is reframed as a `field_brief`
  with corner-bracket framing, an "Intel // Excels at" list with per-strength score bars,
  a coral `Warning // The catch` box (derived from the weakest rubric category), and a
  status chip for the license (verified = success / not verified = coral).
- **feat(review): score accordion is a tactical readout** — mono `CAT 01/08` indices,
  evidence-colored scores, coral→evidence gradient bars, and the category weight as a HUD
  chip; cards get a hover border accent instead of full corner-bracket framing.
- **feat(review): pros/cons are now Intel cards** — shared `IntelCard` component
  (good/bad variants with check/x icon rows) used by both the traditional and crypto review
  pages, killing ~40 duplicated lines; narrative gets a hairline separator.
- **feat(review): HUD chrome everywhere** — mobile ToC pills get mono index numbers
  (`01 Verdict · 02 Claims · 03 Breakdown…`), the sticky CTA bar gets a mono
  `CASE FILE //` label, and the breakdown section header carries a
  `field_readout // category breakdown` eyebrow.
- **chore(design-system): gold discipline documented in code** — overall score stays gold
  (it is the verified mark beside the seal); per-category scores are measured data and use
  evidence. Comments added to VerdictBox + ScoreBreakdown so the next pass doesn't
  "fix" it back.


- **feat(homepage): the whole homepage now speaks the brand.** Hero rebuilt as a command deck
  (mono coordinate readouts, evidence/coral glow, serif display headline, HUD metric panels);
  all sections reframed with numbered `SEC 01–05` mono headers; the hero filter bar is now
  LIVE-wired to the operator directory (search + category actually filter the grid, with an
  honest empty state) — no more dead interaction.
- **feat(protocol): The Protocol scrub is now a mono step readout** — `STEP 0n/04` per step,
  a `SYNC` percentage readout driven by the scroll scrub, coral→evidence rail, corner-bracket
  framing, brand palette throughout.
- **feat(interactions): "alive" pass** — `.hud-frame` corner brackets (expand on hover),
  `.hud-scan` scanline sweep, card lift + hover accents, coral primary actions everywhere
  (stamp CTA, drawer close, sticky-CTA bonus button, mission-board CTA), focus + active
  feedback on all controls.
- **fix(ui): the white strip at the very top is dead.** Root cause: `html` had no background
  and SSR carried no `data-theme`, so the `opacity:0` theme-init dance showed the browser's
  white canvas during load and in the overscroll/rubber-band area. Fixed with a dark html
  canvas (`background-color: var(--ink)` + `color-scheme: dark`) and server-rendered
  `data-theme="dark"` on `<html>`; the no-JS case is now covered too.
- **chore(palette): old Fable-era palette swept to zero on all public surfaces** (homepage,
  review pages, archives, compare, missions, blocks) — zinc/amber/emerald →
  ink/paper/coral/evidence/success; Vex Missions keeps its sanctioned restrained-gold
  identity with surfaces aligned to brand ink/dusk.
- **chore(a11y):** evidence drawer hardened (role=dialog, aria-modal, z-[60] above the noise
  overlay), emoji icon removed from the bonus calculator (replaced with an SVG).

# Changelog

> Referenced by name in `docs/review-system/MASTER-BLUEPRINT.md`, `docs/review-system/SOURCE-OF-TRUTH.md`, and `docs/review-system/TEST-CASES.md` as the place changes to locked documents and locked behavior are logged. Did not exist until this entry — see `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`. Entries below are a retrospective of commits already on `main`; nothing here is invented.

## 2026-08-08

- **Phase A: Design-system consolidation (Tactical 2.0).** New noir-ops HUD language in `globals.css` (documented in `docs/review-system/DESIGN-SYSTEM.md`, which Phase B-F consume): type scale `.t-display/.t-h1-4/.t-eyebrow/.t-data/.t-caption` (Fraunces display + IBM Plex Mono data), elevation tokens `--shadow-panel/--shadow-float`, motion tokens `--ease-out-expo/quart` + `--dur-*`, `.panel`/`.hud-chip`/`.hud-rule` recipes, `.bg-blueprint` paper-tinted grid texture, and a fixed `.noise` film-grain overlay (opacity .03, pointer-transparent, mounted once in the frontend layout). Global `prefers-reduced-motion` kill-switch added (CSS animations/transitions collapse; the Three.js hero and lenis are rAF-driven and unaffected). Template-era seam closed: `CallToAction` block restyled as a tactical directive panel (`.panel` + blueprint + `▸ FIELD DIRECTIVE` eyebrow + mono footer strip), `MediaBlock` captions go mono uppercase, `RenderBlocks` owns rhythm (`gap-14`, blocks' duplicate `my-16` removed). Header: 2px coral top hairline (brand edge), nav links restyled to mono uppercase 11-12px with an expanding underline on hover (CMSLink forwards className to the anchor - verified), mobile nav matched. `ui/button` radius aligned to 10px with a new `hud` variant (mono uppercase bordered) + hover lift on primary/secondary; `ui/card` radius `rounded-2xl`. Gold discipline: ghost pill's `hover:border-gold` corrected to paper (gold stays reserved for the seal); the gold-tinted `--line` token is documented as a kept, opacity-capped exception (texture, not accent). Reviewer pass applied: RenderBlocks Fragment-import cleanup + direct block rendering, md-width nav tightening (`gap-5`/11px below `lg`), cascade rule documented (`.t-*` are components-layer; utilities override). Gates: typecheck + lint clean, **161/161 tests**, build **40/40**, live-verified on local prod (coral hairline, mono nav + underline hover, film grain, clean header, no runtime errors).

- **fix(deploy): apply-or-baseline migration reconcile (supersedes the all-but-newest baseline).** The first ci-migrate version tracked every migration except the newest as already applied on the dev-pushed prod DB - wrong for the gamification schema (`20260806_225622`): prod's dev push predates it, so its tables never existed, yet it was baselined and `/api/gamification/missions` 500'd with `relation "gamification_profiles" does not exist` after the deploy went green. **Fix:** `scripts/ci-migrate.ts` now attempts every migration in order inside a transaction and baselines only when the failure SQLSTATE means "already exists" (42P07/42701/42710/42723/42P04/23505; plus 42P01/42703 for DROP-type migrations - the object being gone IS the applied state); any other failure exits 1 so the build fails loudly. Converges any DB state onto the chain, idempotent (healthy builds fail-fast-rollback on the first duplicate statement), still removes the `dev` marker so `payload migrate` never prompts. Verified against faithful local simulations of the broken state (migration re-applied, tables restored, re-run no-op), the dev-pushed state, and the healthy state. Decision entry supersedes the 2026-08-08 baseline entry.

- **fix(deploy): self-healing migrations on the dev-pushed production DB (deploys were failing since the claims commit).** Root cause: prod was bootstrapped by a dev-mode schema push, so `payload_migrations` holds only a `dev` row with `batch = -1` and no real migrations are tracked - the claims migration never applied, and every build since failed static generation with `column trad_casino_reviews.claims_vs_reality_* does not exist`. A bare `payload migrate` in prebuild made it worse: Payload sees the `-1` marker, prompts "It looks like you've run Payload in dev mode…" interactively, and hangs forever on Vercel's non-TTY build (auto-answering yes would re-run the entire plain-CREATE TABLE chain against the pushed schema and fail with "already exists"). **Fix:** new `scripts/ci-migrate.mjs` runs in `prebuild` before `payload migrate` - on a DB with the `-1` marker it baselines (tracks) every migration file whose schema is already present (all but the newest) into `payload_migrations` and deletes the stale `dev` marker, so `payload migrate` applies only genuinely pending migrations non-interactively. Idempotent: clean/migrated DBs and repeat builds no-op. Verified end-to-end against a faithful local simulation (pre-claims schema + wiped tracking + `dev` marker): baseline 12, marker removed, migrate applied only `20260808_add_claims_vs_reality`, claims columns present, second run no-ops. Decision entry logged 2026-08-08.

- **Blueprint §10: CaseFile AI chat panel (shipped).** Custom document view registered in `payload.config.ts` `admin.components.views` as `/collections/research-queue/:id/chat` — the collection-level `admin.components.edit` is slots-only in Payload 3.86 (verified against the installed types; the client component receives `docID` via view props with `initPageResult.docID` / `doc.id` / URL fallbacks). Panel (`src/components/admin/CaseChatPanel.tsx`, client): active-agent banner derived from LIVE status via the new pure `src/lib/reviewChat/roles.ts` (status→agent single source of truth shared with the route, 8 unit tests — queued=none, desk-research=Desk Researcher, hands-on-testing=human stage, editorial split by computedScores, integrity-check=read-only verdict, published/monitoring=Monitor); run history rendered from the case's `aiRuns` (user prompt + assistant summary + expandable JSON output — history survives sessions); Send (⌘/Ctrl+Enter, 4000-char cap server+client) and a human-only **Apply** that sends the panel's loaded `expectedVersion` — a stale panel gets a 409 with "Reload and re-apply" copy. Route upgrades (`/api/review-chat`): honors client `expectedVersion` (fresh-version fallback kept for legacy `/dashboard` callers and logged), records conversation turns via new `recordChatTurn` in `runner.ts`, and preserves Payload error statuses (the concurrency 409 used to surface as a swallowed 500). Human/none stages disable Send honestly ("no agent runs at this stage"). `aiRuns` field description updated to reflect the route writing it. Verified end-to-end: `scripts/verify-chat-panel.ts` authenticated e2e (anon 403 → desk-research run 200 + runId → run complete with user prompt in `input` + user/assistant turns in `messages` → apply bumps version + writes draft → stale apply 409) **10/10 PASS**; gates: typecheck + lint clean, **161/161 tests** (+8 roles), build **40/40 static pages**, admin routes 200, prod log clean. Decision entries logged 2026-08-08. Agents remain safe placeholder scaffolds (every claim unverified) — a real model call is documented future work.

- **Blueprint §6: Claims vs Reality table on review pages.** Migration `20260808_add_claims_vs_reality` adds a `claimsVsReality` group (withdrawal / support / kyc / bonus, claimed+measured number pairs) to both review collections and their `_v` tables — fields admin readOnly (integrity: measurements come from the testing pipeline/seed, verdicts are never hand-set). `src/lib/claimsVsReality.ts` is the pure derivation core (lower-is-better: met ≤ claim, partial within the 1.25× band, missed beyond, untested if either side missing or ≤ 0; unit-aware formatting, "35×" joined) with 9 unit tests. `ClaimsVsReality` renders as the FIRST scored section on both `/casinos/[slug]` and `/crypto-casinos/[slug]` (before the category breakdown, TOC entry added) — 4-column table (Claim / What they say / What we measured / Verdict), `th scope="col"`, ✓/~/✗ chips in emerald/gold/coral, fixed §6 fallback cell "Not yet tested — pending hands-on verification." for anything untested. Honesty footer driven by `isIllustrativeSample` (reviewer S2): the three seeded sample reviews say "Illustrative sample data — pending real hands-on verification." rather than claiming logged evidence; a real operator flips to the evidence-logged line automatically. `scripts/seed-claims.ts` seeds mixed verdict states (met/partial/missed) on the 3 published seed reviews, idempotent by slug; crypto reviews (no claims seeded) correctly render the all-Pending state. Reviewer pass applied: S2 sample-footer honesty, S3 symmetric `measured ≤ 0 → untested` guard (+tests), S3 dead exports removed. Gates: typecheck + lint clean, **153/153 tests** (+9), build **40/40 static pages**, live-verified verdict chips/values/sample footer on aurora + ferrous, prod log clean. Decision entries logged 2026-08-08.

- **Phase 2: IA & SEO — category archives, no-wagering hub, top-lists with Schema.org.** `src/lib/marketArchives.ts` + `/markets/[market]` archives (nl/se/de/uk — the honest category axis for licensed reviews, CMS-data-driven from the existing `markets` field, zero migration; deviation from the plan's `/casinos/[category]` documented in DECISION-LOG: Next.js forbids two dynamic segments in one path and `/casinos/[slug]` owns that namespace). Market chips on `/casinos`, review-page "Licensed in" chips, market↔market cross-links. `src/lib/topLists.ts` (3 lists: best-licensed-casinos, best-bonus-transparency [sorts on the promotions rubric category], best-wagering-bonuses [sorts on linked-operator score]) + `/best-casinos` + `/best-casinos/[slug]` (Editor's Choice card, ranked rows, methodology block, `FaqAccordion` with aria-expanded + in-DOM content, Schema.org `ItemList`+`Review` JSON-LD carrying only real rubric scores — `itemReviewed` Organization for casinos / Product for bonuses, `</script>`-escaped). Internal-linking loop: `RelatedBonuses` on review pages (bonus.operator relationship closes the loop back to the operator review), bonus detail pages already link up. No-wagering hub enhanced (0× stat strip, "0× wagering requirement" badge on `BonusListingCard`) + one illustrative sample seeded (`scripts/seed-no-wagering.ts`, `context.disableRevalidate` to avoid the Next 16 revalidatePath-outside-request invariant). Sitemap: `src/app/sitemap.ts` is now the authoritative `/sitemap.xml` (21 URLs, lastModified from updatedAt); next-sitemap still writes robots.txt but its `public/sitemap.xml` index is removed in postbuild so it can't shadow the app route. Redirects: `/best-casino`, `/no-wagering`, `/markets` → canonical targets. Nav: Header/Footer `maxRows` 6→7 (plan's ≤7 limit), "Best of" added, `seed-nav.ts` re-run. Drive-by: homepage `VerifiedOperatorGrid` "Read Review" links pointed at pre-rename slugs (404); now the three real published routes. Gates: typecheck + lint clean, **96/96 tests** (+10 new in `tests/int/ia-seo.int.spec.ts`), build **40/40 static pages**, every new route live-verified (200s, `/markets/fr` 404s, redirects 308, JSON-LD parses with correct rankings, sitemap serves the app route), prod log clean. Code-reviewer pass applied: honest freshness copy (ISR revalidate=600, not "every request"), JSON-LD `</script>` escaping + Product typing for bonus lists, human rubric labels in ranked rows (no raw keys), RelatedBonuses no longer duplicates the featured calculator bonus. Decision entries logged 2026-08-08.

- **Phase 4: Gamification streaks + onboarding.** Streaks are fully derived from the existing append-only ledger (`src/gamification/streaks.ts` — streak day = UTC calendar day with a completed mission, freeze token = completing Tilt Protocol; no new event reason, no new table, no migration). `meFlow`/`missionsFlow` now expose `streak {current, longest, freezesAvailable, protectedDays, lastActiveDay}` + server-computed `onboarding` (first-session mission path: unstarted → offers Paper Trail, started → that mission, complete → done). Two new F4.4 validator kinds: `license_field_match` (answer derived from the LIVE review's compliance field) and `casino_filter_match` (operator attributes from the linked review). `submitStepFlow` dispatches them; unknown kinds reject (no silent XP mint). Seed extended with the three canon missions (Paper Trail / Glass Cannon / Tilt Protocol → `scripts/seed-gamification.ts`, `overrideAccess: true` for the post-FIX-01 `Quests.read = authenticated` lookup). UI: VexDock streak chip + non-blocking onboarding card with explicit dismiss + softer loading gate (post-mission re-pull no longer blanks the dock), MissionsOverview streak card + "Recommended for you" badge, `useGamification`/`useMissions` type contracts extended. vex-ledger SKILL.md implemented/planned lists + streak-freeze RFC status updated. Gates: typecheck + lint clean, **125/125 tests** (+29: streaks suite incl. "freeze protects exactly one day" + two-freeze token case, new-validator unit tests, flow-level onboarding/streak/freeze/leak tests), build ✓, full loop live-verified (onboarding → streak → freeze grant → board state). Decision entries logged 2026-08-08.
- **Phase 3: Search + compare + archive filtering.** **Site search (F3.1):** the template /search (which only searched the Payload-plugin `posts` index and could never find a casino) is rewritten to query the four review/bonus collections directly (`_status: published` + `like` clauses, `src/lib/siteSearch.ts` normalization + ranking, 14 new unit tests) — ranked results with category chips + sample badges, browse mode with no query, honest empty state. Header gains a search icon. **Compare (F3.2):** shareable `/compare?slugs=` (max 4) renders one table per rubric (overall, license, markets, every rubric category with per-row best highlighted, verdict pros/cons) and refuses to mix Traditional/Crypto rubrics — `pickCompareGroup` picks the comparable group and the page says why (mixed + not-found banners). `CompareToggle` on every listing card + floating `CompareBar` (localStorage `playerside.compare`, CustomEvent sync) mounted in the layout; `ReviewListingCard` restructured so the toggle is never nested inside the `<Link>`. **Archive filtering (F3.3):** `SortableReviewGrid` (sort top-score/lowest/A–Z, min-score 7/8/9, market chips on /casinos) wired into /casinos, /markets/[market], /crypto-casinos; pages stay statically generated — page-level Suspense fallback keeps the full default grid in static HTML (SEO intact), filters apply client-side over the fetched docs and sync to the URL (?sort=&min=&market=). Reviewer pass applied: fixed the template Search input wiping `?q=` on shared search links (S2), hydration mismatch on filtered URLs via effect-synced controls (S3), compare table `th scope` a11y (S3). Gates: typecheck + lint clean, **139/139 tests** (+14 in `tests/int/search-compare.int.spec.ts`), build **39/39 static pages**, all routes live-verified (search finds reviews, compare table renders, filters present, header icon, prod log clean). `/search` + `/compare` are force-dynamic + noindex and deliberately excluded from the sitemap (param pages). Decision entries logged 2026-08-08.
- **Phase 5: Admin dashboard + public pipeline overview.** Two read-only Payload admin views registered in `admin.components.views` (client components over authenticated API routes, same pattern as the existing `/api/dashboard/cases`): **`/admin/pipeline`** — kanban of ResearchQueue case files across the seven blueprint stages (queued → monitoring) with per-stage counts + case cards; **`/admin/gamification`** — the mission roster: quests (with step-kind summaries), player profiles (level/rank/total XP), the append-only XP ledger, and user-quest state. New authenticated `/api/dashboard/gamification` route (403 without admin session; `createLocalReq` keeps collection access controls, `depth: 1` so quest relationships resolve to missionIds). The template "welcome + seed" BeforeDashboard block is replaced with a Playerside ops summary linking both views. `src/lib/pipeline.ts` is the shared read-side stage contract (order/labels/counts/summary, unit-tested — `inReview` never counts unknown statuses). Seed `scripts/seed-research-queue.ts` adds 7 illustrative cases (#PS-2026-S04..S10) through the REAL stage-gate contract (resumable, idempotent, poly-relationship-correct, exits cleanly). Public **`/reviews` now shows a live "The review pipeline"** overview — 7-stage count strip + "5 cases under review" / "3 reviews published", rendering only aggregate counts from the admin-only collection via a guarded narrow select (GOVERNANCE GUARDRAIL comment), with `revalidate = 600`. Gates: typecheck + lint clean, **144/144 tests** (+5 pipeline), build **40/40 static pages**, live-verified (/reviews counts correct, admin routes 200, dashboard APIs 403 unauthenticated, prod log clean). Decision entries logged 2026-08-08.
## 2026-08-07

- **`f41bf9b` + review-pass fix — Phase 1: Review page 2.0.** VerdictBox (above-the-fold verdict — weighted score, top-3 "Excels at", "The catch" derived from the weakest rubric category, live license-verified status, commission-blind note + How-we-grade link; every line DERIVED from rubric scores + compliance, no hand-written marketing). ScoreBreakdown upgraded to an accordion (first category open, others collapsed, click-to-expand, narrative + evidence stay in the DOM so SEO content is preserved). BonusValueCalculator — "Bonus reality check" from real wagering-bonuses data (deposit + match slider, required turnover, effective rate, 18+ RG microcopy). StickyCtaBar — honest in-site actions only (verdict/breakdown/bonus-terms anchors; no affiliate CTA while the clicks flow is still planned), zero CLS, clears the Vex dock; review-pass fixes: hidden state now uses `visibility:hidden` THROUGH the transition (removes the bar from keyboard tab order + a11y tree while preserving the fade-out — was an S2 a11y bug: opacity-only hiding left links keyboard-focusable), right clearance widened right-16 → right-24 so the pill never abuts the dock, touch targets bumped to ≥44px. ReviewToc — mobile sticky section pills (touch targets bumped). Both casino + crypto-casino review pages wired (bonus calculator on traditional pages where bonuses link to operators). Pure logic in `src/lib/wagering.ts` + `src/lib/reviewVerdict.ts` with 7 new tests (86/86 green). Gates: typecheck, lint, build 30/30, browser-verified 5/5 (verdict box, accordion expand, calculator, pill bar) with zero console errors.
- **Improvement research + execution plan (plan mode — no code).** Four researchers deployed (competitive UX & journey, education-first gamification, IA/categories/search, Payload admin customization) plus a ui-ux-pro-max design-intelligence query. Synthesis logged in `docs/review-handoffs/2026-08-07-improvement-research.md`; Viktor selected ALL six areas, so the detailed build roadmap is in `docs/review-handoffs/2026-08-07-improvement-execution-plan.md` (6 phases: review page 2.0 + trust UX; IA/categories/no-wagering hub/top-lists; search + compare; gamification streaks + onboarding; Review Ops admin console; analytics/a11y/gates), with guardrails that preserve the audit fixes.
- **Fix-plan executed (audit of same date) — all tranches shipped.** `1ffb004` (Tranche 3, hygiene): `@types/three` pinned to 0.182.0 (kills drift with the pinned `three`), `three` promoted to dependencies, `package-lock.json` removed (pnpm single PM), `engines.node` tightened to >=20.9.0, `.env.example` postgres-first, README local-dev/e2e docs. `037de89` (Tranche 2, spec truth): vex-ledger skill annotated — validator kinds (quiz + wagering_math implemented; casino_filter_match/entity_select/license_field_match/dwell_read planned), the 5 required tests mapped to real test names, clicks/offers API marked planned-not-implemented with the containment gate noted dormant. `66b8da2` (Tranche 1, hardening): in-memory rate limiter (read 30/10s, write 10/10s) on all four `/api/gamification` routes + per-IP profile-creation cap (25/day, counted on real creates only; policy chosen: per-IP over strict-UUID). `e51117a` (Tranche 0, S1s): `/api/quests` answer-key leak closed (`Quests.read: authenticatedOrPublished → authenticated` — live-verified 403 vs 200-with-answers; regression test added) and `PAYLOAD_SECRET` hard-fails outside `NODE_ENV=development`. Gates after every tranche: typecheck, lint, tests (79/79), build (30/30). Decision-log entries appended 2026-08-07 (FIX-04 policy, FIX-13 resolved as documented design decision — zinc noir-ops retained, FIX-14 counters note).
- **Full-codebase audit (no code change — docs only).** Reviewer → QA → fix-planner pipeline over the entire repo (plan, gamification, research, UI, content, admin, tests, deploy): **2 S1, 4 S2, 9 S3** findings. **Headline S1, live-verified:** anonymous `GET /api/quests` (Payload default REST) exposed `correctKey`/`bonusSlug` from mission `steps`, bypassing the sanitized `/api/gamification/*` surface (fix approved: `Quests.read → authenticated` + regression test — FIX-01). Second S1: public `PAYLOAD_SECRET` dev fallback (fix approved: hard-fail outside development — FIX-02). S2s: rate limiting on anonymous gamification endpoints, playerKey row-creation bounds (open decision), unbacked "5 required tests" claim, clicks/offers spec drift (documented deferral). S3s: `@types/three` drift, `three` in devDependencies, dual lockfiles, engines Node 18, `.env.example` sync, e2e CI-ability, zinc/brand token unification, counter note. Known-good reconfirmed under test. Plan + inventory: `docs/review-handoffs/2026-08-07-full-codebase-audit-and-fix-plan.md`; decision-log entry appended 2026-08-07. Execution awaits Viktor's green light, starting with Tranche 0 (both S1s).
- **`f48ea92`** — Build-tooling fix: added `scripts/wait-for-db.mjs` as a `prebuild` guard so `next build` fails with an actionable "start Docker, then rebuild" message instead of the cryptic `cannot connect to Postgres: connect ECONNREFUSED 127.0.0.1:5432` stack trace (root cause: Docker Postgres briefly unreachable while Payload inits to collect `/[slug]` SSG page data; warm pools on the running dev/prod servers masked it). Installed the Vercel CLI (58.7.1, was missing) and linked the repo to the existing `playerside` Vercel project, whose Production/Preview env already carries `DATABASE_URL`, `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET`, and the `BLOB_*` vars. Verified: typecheck clean, build green with the guard running first (30/30 pages).
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
