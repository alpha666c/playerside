# Reconciliation — Downloads Package vs. Committed Repository State

Date: 2026-07-22
Stage completed: Documentation-only reconciliation of `~/Downloads/playerside-phase3-handoff/` against the current `main` branch (HEAD `a291c42` at start of this session)
Next stage: Owner decision on the role-file merge recommended below; no code, schema, or role-file content was changed in this session
Next agent role: n/a — this is a governance/reconciliation handoff, not a case-pipeline handoff

This document does not change which files are authoritative. Per `docs/review-system/SOURCE-OF-TRUTH.md`, the currently **committed** `docs/review-agents/*.md` files remain Layer 3 authority until a human explicitly replaces them. Nothing in `~/Downloads/` is authoritative by virtue of existing.

---

## Part 1 — Role File Diff Summary (5 files)

Method: full-text read of both versions plus cross-check against `src/collections/ResearchQueue/index.ts` (the actual migrated schema — Layer 2, outranks role files per SOURCE-OF-TRUTH.md), `src/rubrics/traditional.ts`, `src/rubrics/crypto.ts`, and confirmation that `docs/FOUNDER-CONTEXT.md`, `docs/review-system/TEST-CASES.md`, and `docs/design-system/CATEGORY-IDENTITY.md` all exist in the current repo (they do — all three were committed same-day, after the Downloads package's own README timestamp, which is consistent with the Downloads versions being a *later* draft than what got committed).

### DESK-RESEARCHER.md
- **Committed:** `docs/review-agents/DESK-RESEARCHER.md`
- **Package:** `~/Downloads/playerside-phase3-handoff/docs/review-agents/DESK-RESEARCHER.md`
- **Differences:**
  - Committed uses a 2-tier confidence label (`VERIFIED` / `UNVERIFIED`). Package uses 3-tier (`VERIFIED` / `CORROBORATED` / `UNVERIFIED`).
  - Package adds a "Required reading" list (Blueprint, `FOUNDER-CONTEXT.md`, current case handoff, self); committed only points to the Blueprint.
  - Package adds "Responsible gambling" as its own checklist heading; committed folds this nowhere explicitly.
  - Committed's output is a flat per-fact JSON shape (`{value, sourceUrl, accessDate, confidence, unverifiedReason}`); package's output is grouped-by-heading JSON with a top-level `unverifiedFields` array and requires a handoff file per Blueprint §11 (committed doesn't mention creating a handoff file from this role, only "confirming one is needed").
  - Package header claims `Authority: Layer 2`.
- **Conflicts found:**
  - **Confirmed conflict with implemented behavior:** the live migrated field `research_queue.evidence_register.verification_status` (`src/collections/ResearchQueue/index.ts`) is an enum of exactly `verified` / `corroborated` / `unverified` — the package's 3-tier scheme, not the committed file's 2-tier scheme. The committed role file is stale against Layer 2 (code/schema), which outranks it.
  - **Confirmed conflict with SOURCE-OF-TRUTH.md:** role files are Layer 3 in the precedence table, not Layer 2. The package's `Authority: Layer 2` self-label is factually wrong per the committed governance doc.
  - Package's required-reading references (`FOUNDER-CONTEXT.md`, current handoff) point to files that genuinely exist in the repo now — not a broken reference, but neither role-file version references the *actual* `evidenceRegister` field names (`claimKey`, `sourceType`, `mediaRef`, `archiveRef`, `contentHash`, `capturedBy`, `isCurrent`, `supersedesEvidenceId`) that were added in a later schema-hardening session than either draft.
- **Recommendation:** **Manually merge.** Take the package's 3-tier labels, required-reading list, and Responsible Gambling checklist item (all closer to current implementation truth). Fix `Authority: Layer 2` → `Layer 3`. Rewrite "Required output" to target the real `evidenceRegister` array shape instead of either version's invented JSON.

### SCORE-ANALYST.md
- **Committed:** `docs/review-agents/SCORE-ANALYST.md`
- **Package:** `~/Downloads/playerside-phase3-handoff/docs/review-agents/SCORE-ANALYST.md`
- **Differences:**
  - Committed's missing-evidence rule: UNVERIFIED/missing hands-on fields score at a conservative midpoint (5.0) with a `conservative: true` flag — the case can still be scored and move forward.
  - Package's missing-evidence rule: `score: null` + `pendingReason`; explicitly **blocks** the case from moving to Editorial until every required score exists. This is a materially different, stricter process rule than the committed version — not a wording tweak.
  - Package enumerates category lists per casino type; committed does not (it only points at the rubric files directly).
  - Package header claims `Authority: Layer 2` (same conflict as above).
- **Conflicts found:**
  - **Package contains a factual error against implementation:** it states "Crypto adds Provably Fair" to the Traditional 8, implying Crypto = Traditional 8 + 1. The actual `src/rubrics/crypto.ts` categories are `licenseLegitimacy, promotions, withdrawals, kycApproach, provablyFair, support, deposits, gameVariety, geoCompliance` — Crypto **drops** `liveCasino` and **adds** both `provablyFair` and `geoCompliance`, it is not a strict superset. The committed file avoids this error by not enumerating categories at all.
  - The scoring-gate policy conflict (conservative-default vs. hard-block) is not resolved by any higher layer — `STAGE_ENTRY_GATES` in `src/collections/ResearchQueue/index.ts` checks `handsOnResults` actuals and `evidenceRegister` population before allowing entry to `editorial`, but does **not** check `computedScores` completeness at any gate. Neither role file's policy is currently enforced in code; this is a live open decision, not something the repo has already settled.
- **Recommendation:** **Manually merge.** Adopt the package's required-reading list, but correct the crypto category description to match `src/rubrics/crypto.ts` exactly rather than copying either draft's prose. The conservative-default vs. hard-block scoring-gate question is a real open policy decision — flagged to `DECISION-LOG.md` rather than resolved here.

### EDITORIAL-WRITER.md
- **Committed:** `docs/review-agents/EDITORIAL-WRITER.md`
- **Package:** `~/Downloads/playerside-phase3-handoff/docs/review-agents/EDITORIAL-WRITER.md`
- **Differences:**
  - Package requires reading `FOUNDER-CONTEXT.md` and `docs/design-system/CATEGORY-IDENTITY.md` (both exist in repo); committed references neither, despite `FOUNDER-CONTEXT.md` containing explicit, non-optional voice/tone instructions ("Viktor doesn't need to hedge about RTP... write accordingly") that the committed file's generic "measured tone" guidance doesn't capture.
  - Package specifies an exact, locked methodology-footer sentence; committed has no equivalent standard footer.
  - Package's structure is 5 sections (Summary/Claims-vs-Reality/Category breakdown/Who is it for/Methodology footer); committed's is Hero/Claims-vs-Reality/Category breakdown/Community Sentiment/Compliance block — different section set, not just reordering.
  - Both agree on the hard rules (no affiliate language, no commission data, copy can't contradict scores).
- **Conflicts found:** No implementation-level conflict (no editorial copy has been generated yet to check against). The package's reference to `FOUNDER-CONTEXT.md` is the stronger fit: that file exists specifically to shape editorial voice and the committed role file is simply silent on a doc that governs its own domain.
- **Recommendation:** **Manually merge**, weighted toward the package (its structure integrates two real, existing docs the committed version ignores). Preserve the committed version's explicit Compliance-block and Community-Sentiment-block requirements, which the package folds less explicitly into "Summary."

### INTEGRITY-CHECKER.md
- **Committed:** `docs/review-agents/INTEGRITY-CHECKER.md`
- **Package:** `~/Downloads/playerside-phase3-handoff/docs/review-agents/INTEGRITY-CHECKER.md`
- **Differences:**
  - Committed has 4 checklist steps (Rubric Integrity / Copy↔Score / Commission Wall / Evidence Chain); package has 5 (adds a distinct Compliance Block check — age notice, licence reference, RG links).
  - Package requires reading `docs/review-system/TEST-CASES.md`, which exists and is directly relevant (compliance/RG language originates there); committed doesn't reference it.
  - Package's commission-wall check lists exact terms to scan for (`commission`, `CPA`, `revshare`, etc.); committed's is more general ("commission, deal-rate, affiliate-rate... data").
- **Conflicts found:** None against implementation — `scripts/verify-commission-wall.ts` exists and is the actual structural check; neither role file conflicts with it, they're describing the same intent at different specificity.
- **Recommendation:** **Adopt package.** Its 5th check (Compliance Block) is a genuine gap in the committed version — nothing else in the committed pipeline documents currently makes the age-notice/licence-reference/RG-links check explicit as a pre-publish gate.

### MONITOR.md
- **Committed:** `docs/review-agents/MONITOR.md`
- **Package:** `~/Downloads/playerside-phase3-handoff/docs/review-agents/MONITOR.md`
- **Differences:**
  - Committed uses 3 severity levels (`INFORMATIONAL` / `REVIEW-RECOMMENDED` / `REVIEW-REQUIRED`); package uses a different 3-tier scheme (`Tier 1` immediate / `Tier 2` significant / `Tier 3` informational) with explicit re-review trigger thresholds (e.g., "two Tier 2 items in one run").
  - Package's trigger thresholds are more actionable and specific than committed's.
- **Conflicts found:** None — no Monitor code exists yet (Phase 5, not started), so there is nothing in the repo for either draft to conflict with.
- **Recommendation:** **Adopt package.** Its explicit numeric re-review thresholds are strictly more useful than committed's unquantified severity labels, with no offsetting downside.

### Overall role-file recommendation
See `docs/review-system/DECISION-LOG.md` for the recorded decision. Summary: **manually merge**, weighted toward the package for DESK-RESEARCHER/EDITORIAL-WRITER/INTEGRITY-CHECKER/MONITOR, with the Score Analyst crypto-category error corrected against source rather than copied from either draft. **No role-file content was edited in this session** — this is a recommendation for a follow-up editing pass, not an executed merge.

---

## Part 2 — Downloads Session Handoff vs. Current Repository State

Source: `~/Downloads/playerside-phase3-handoff/docs/session-handoffs/playerside-platform-before-stake-2026-07-22.md`. Verified against `git log`, `docs/review-system/MASTER-BLUEPRINT.md`, `src/collections/*`, `src/rubrics/*`, and a live read of the `research_queue` / `operators` / `media` tables (the project's Supabase database, via `list_tables` row counts — no write performed).

| Claim | Verdict | Evidence |
|---|---|---|
| Phase 0 foundation complete (rubrics locked, commission wall, AgentLogs, seeds, tests/build) | **Confirmed** | `MASTER-BLUEPRINT.md` §12 all ✅; `scripts/verify-commission-wall.ts` exists; seed reviews live in `trad_casino_reviews` (3 rows) |
| Phase 1 pending: 3D Seal WebGL fallback bug | **Superseded** | Fixed in commit `4679a9e` ("Fix Living Seal: narrow viewport no longer forces flat-SVG fallback"). Root cause was an overly broad `viewport < 380px` low-power heuristic, not the WebGL/SSR/hydration causes the handoff hypothesized as likely — the diagnosis guess in the handoff was **incorrect**, but the bug itself is fixed. |
| Phase 2 pending: `Operator`/`ResearchQueue` collections, migration | **Superseded** | Both collections built and migrated (`a958602`, `7ea6f33`, `7e04319`, `dbb2ef2`); 11 migrations applied. |
| Phase 2 pending: AI chat panel, `/api/review-chat` route, context loader | **Still Pending** | No route, panel, or context-loader code exists anywhere in `src/`. Correctly deferred every time it has come up — not an oversight. |
| Phase 3 blocked from GitHub push; five files supplied in this package | **Superseded, with caveat** | Five role files now exist in `docs/review-agents/` and are committed — Phase 3 is no longer blocked. But they are an **older, less-integrated draft** than the ones in this package (see Part 1). The package's own Phase-3-completion diff (`PHASE-3-UPDATE.md`) was never applied to `MASTER-BLUEPRINT.md` §12, which still shows the five role files as 🔲 despite them existing and being committed — that checklist is now simply wrong and stale, independent of which draft wins. |
| Phase 4: Stake as `#PS-2026-001` after platform operational | **Still Pending** | No row exists in `research_queue` or `operators` (both 0 rows, confirmed live). A **planning-only** handoff (`docs/review-handoffs/PS-2026-001-queued-2026-07-22.md`) and `docs/review-system/CREDENTIAL-LOG.md` describe Stake as case `#PS-2026-001` with pre-research facts to verify — but this was never instantiated as an actual Payload/database CaseFile. The Stake-paused rule is intact in practice: no real case exists to un-pause. |
| Phase 5: public-facing features after first real review | **Still Pending** | None started; correctly gated behind Phase 4. |
| System rule: 7-stage pipeline enforced strictly | **Confirmed** | `STAGES` array and `STAGE_ENTRY_GATES` in `src/collections/ResearchQueue/index.ts` enforce exact order with per-stage exit-condition checks. |
| System rule: rubric > role files, no autonomous publish | **Confirmed** | Rubric weight exception documented in `SOURCE-OF-TRUTH.md`; `integritySignOff` + manual publish gate exist in code; no AI publish path exists. |
| System rule: UNVERIFIED convention for untested facts | **Confirmed, with a labelling drift caveat** | The convention exists and is enforced at the schema level (`evidenceRegister.verificationStatus`), but as 3-tier (matching the package), not 2-tier (matching the committed role file) — see Part 1. |
| System rule: commission data structurally absent | **Confirmed** | `scripts/verify-commission-wall.ts` present and referenced by both Integrity Checker drafts. |
| System rule: every meaningful session ends with a handoff file | **Confirmed** | Multiple handoffs present in `docs/review-handoffs/`. |
| Build Order step 1: commit Phase 3 first | **Superseded** | Files are committed (older draft, per above) — the literal instruction ("commit the package's five files") was not followed, but its intent (role files exist and are committed) is satisfied. |
| Build Order step 3: Payload data model matches §9 spec exactly | **Confirmed, with one gap** | `Operator` and `ResearchQueue` match spec closely. `accountProfile` implements 4 fields (`liveChatAccountLabel`, `emailTestAddress`, `accountStatus`, `notes`) against the handoff's own 11-field spec (label, operator/brand relation, email, username, purpose, jurisdiction, created date, account state, credential-manager reference, KYC status, last-used timestamp, internal notes). **Still Pending** on the full spec. |
| Build Order step 5: "non-admin/public API responses cannot expose... evidence assets" | **Incorrect if read as already-satisfied** | The Payload API layer does gate `visibility:'internal'` media from anonymous reads (`src/collections/Media.ts`), but the **raw static file URL bypasses this entirely** — `upload.staticDir` serves straight out of Next's `public/`, unauthenticated, regardless of the `visibility` field. This is a confirmed architectural gap, not yet exploited in practice only because no evidence upload has ever succeeded in production (see security review). |
| Build Order step 6: AI chat panel | **Still Pending**, correctly deferred | No code exists. |
| Definition of Ready for Stake — evaluated fresh, 2026-07-22 | **Still Pending / Not Ready** | Of 8 checklist criteria: 4 done (3D Seal, data model, audit trail, transitions), 1 explicitly not started (AI panel, correctly deferred), 1 partially done (account metadata — narrower field set), 1 failed (evidence upload — confirmed broken in production), 1 not literally exercised (dry-run via admin UI, only via Local API scripts). **Net: not ready**, independent of the standing owner instruction not to begin Stake work regardless. |
| "Prior Connection Note" — GitHub push blocked, package never landed | **Confirmed** | Consistent with `docs/review-handoffs/PS-review-2026-07-22-repo-security-review.md`'s independent account of the same event from the repo side. |

**Stake-paused rule preserved.** No CaseFile or Operator record was created for Stake or any other operator during this reconciliation. `research_queue` and `operators` remain at 0 rows (confirmed via read-only table listing, not a mutating query).
