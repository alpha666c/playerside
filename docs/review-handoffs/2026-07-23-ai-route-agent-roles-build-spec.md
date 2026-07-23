# Spec — AI Chat Route & Agent Roles: Detailed Build Definition

Date: 2026-07-23
Stage completed: Detailed design spec only — no code, no route, no UI component, no role-file edits
Next stage: Owner decision on the still-open precondition (RLS/grants) and the still-pending role-file merge, both required before implementation begins
Next agent role: n/a — this is a design/governance handoff, not a case-pipeline handoff

This expands `docs/review-system/MASTER-BLUEPRINT.md` §10 ("AI Chat Interface") from a one-paragraph sketch into an implementation-ready definition of each of the five agent roles and the shared infrastructure they all depend on — answering "what do we actually build, and what does each role need to do in the repo."

---

## 1. Where This Stands Today (status check before reading further)

`docs/review-system/DECISION-LOG.md`'s "AI route/UI remains deferred" entry (2026-07-22) names three preconditions. As of this spec:

| Precondition | Status |
|---|---|
| Private evidence storage | ✅ Done (`docs/review-handoffs/2026-07-22-private-evidence-storage.md`) |
| ResearchQueue optimistic concurrency | ✅ Done (`docs/review-handoffs/2026-07-23-research-queue-concurrency-implementation.md`) |
| Explicit RLS/grants decision | ❌ **Still open** — "Critical, pending a deliberate decision" per DECISION-LOG.md |

**Two of three are now resolved. The AI route is still correctly blocked on the third.** This document is a detailed *design* — it does not authorize starting the build. A second, separate open item also blocks a clean start: the **role-file version decision** (DECISION-LOG.md, "manually merge") has been decided but **not executed** — the committed `docs/review-agents/*.md` files are still the older, pre-merge draft. Building the AI route today would load stale role prompts. Both gates are restated as explicit non-goals in §7.

---

## 2. Overall Architecture

Four pieces, all named in `MASTER-BLUEPRINT.md` §10 but none built yet:

1. **`/api/review-chat`** — a Next.js route handler (not a Payload collection `endpoints` config; this repo has no precedent for that pattern — the existing custom route, `src/app/(frontend)/next/seed/route.ts`, is a plain Next.js `route.ts`, and `/api/review-chat` should follow the identical shape: `payload.auth({headers})` to authenticate, 403 if no user, `createLocalReq({user}, payload)` for any Local API calls it makes).
2. **A context loader** — a plain function, not a route: given a `research-queue` document ID, returns the exact allowlisted fields a given role is permitted to see (see §4's per-role table). This is the single chokepoint that prevents commission-shaped or credential-shaped data from ever reaching a prompt — it must be built as an explicit allowlist (list the fields that ARE included), never a denylist (list the fields that are excluded), so that a future field added to `ResearchQueue` is excluded by default until someone deliberately adds it to a role's allowlist.
3. **A chat panel admin component** — a custom Payload admin UI component rendered in the `research-queue` collection's edit view sidebar (Payload 3.x supports this via the collection's `admin.components.edit.SidebarTopComponent` or similar sidebar Slot — the exact insertion point is an implementation detail to confirm against the installed Payload version's docs when this is actually built, not fixed here).
4. **The `aiRuns` array field** — already exists on `ResearchQueue` (`src/collections/ResearchQueue/index.ts`), `readOnly: true` in the admin, explicitly built as "data-model foundation only... nothing writes here" — this spec is what would finally write to it.

### 2.1 Provider

Claude, per `MASTER-BLUEPRINT.md` §10 ("Routes to Claude (default)"). No AI SDK dependency is installed yet (`@anthropic-ai/sdk` or equivalent) — this is a new dependency an implementation phase would add, not something to guess a version for now.

### 2.2 The role-to-status mapping (unchanged from the Blueprint, restated for completeness)

| Case `status` | Role loaded | Notes |
|---|---|---|
| `desk-research` | Desk Researcher | |
| `hands-on-testing` | *(none — this stage is Viktor doing live account testing, not an AI role)* | The Downloads-package session handoff (`docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md` Part 1) suggested a lighter-weight "checklist/evidence-logging assistant" here instead of a full agent — worth deciding explicitly when this is built, not assumed. |
| `editorial`, `computedScores` not yet populated | Score Analyst | |
| `editorial`, `computedScores` populated | Editorial Writer | |
| `integrity-check` | Integrity Checker | |
| `monitoring` | Monitor | |

**The route must derive the role strictly from the case's current `status` (plus, for the `editorial` stage, whether `computedScores` is populated) — never from client-supplied input.** A request that claims "load the Editorial Writer" for a case still in `desk-research` must be rejected server-side, not merely hidden client-side, since the whole point of role-gating is that a compromised or buggy client can't make an agent act outside its authority.

---

## 3. Shared Infrastructure (needed by every role, built once)

### 3.1 Context loader — the security-critical piece

A single function, e.g. `src/lib/reviewChat/loadCaseContext.ts`, signature roughly:

```ts
async function loadCaseContext(caseId: string | number, role: AgentRole, req: PayloadRequest): Promise<CaseContext>
```

It must:
- Fetch the `research-queue` document via Local API (`payload.findByID`), respecting normal access control (not `overrideAccess: true` — the calling user's own permissions should gate this exactly as any other read would).
- Return **only** the fields that role's allowlist names (§4's per-role table) — never the full document. This is the single mechanism that keeps commission-shaped data (which shouldn't exist in this schema at all, per the commission wall, but the allowlist is a second, independent layer of defense) and `accountProfile`/credential-adjacent fields out of every prompt except where a role genuinely needs them.
- Never include `internalNotes` for any role unless a specific role is later decided to need it (none currently are — it's marked "never published" in the Blueprint, and "never sent to an AI prompt" should be the same default until a deliberate exception is made).
- Log its own invocation (role, case ID, calling user, timestamp) to `agent-logs` via the existing `logEvent()` path — the AI route is a new *actor* touching this collection, and the append-only audit trail (`docs/review-system/DECISION-LOG.md`'s governance model) should record every context load exactly as it already records every case update, not just every write.

### 3.2 Role-file loader

A function that reads the correct `docs/review-agents/*.md` file's content (server-side, at request time or cached at build time — either is fine) and uses it as the system prompt. **This depends on the role-file merge (§7) having actually happened** — loading a stale, pre-merge role file would mean, concretely, the Desk Researcher would use the 2-tier `VERIFIED`/`UNVERIFIED` confidence scheme instead of the 3-tier scheme the live `evidenceRegister.verificationStatus` schema actually uses (`docs/review-system/DECISION-LOG.md`, "Role-file version decision") — a real, demonstrated mismatch between prompt and schema, not a hypothetical one.

### 3.3 The write path — now unblocked, with a specific contract to follow

Any role whose output gets applied back to the CaseFile (see each role's "Can it write?" column in §4) must write through `payload.update()` using the concurrency contract established in `docs/review-handoffs/2026-07-23-research-queue-concurrency-implementation.md`: **both** `req.context.expectedVersion` (the version the panel most recently loaded) **and** `req.context.changedFields` (the exact top-level fields being written) are required together, or the write is rejected with a 400 before it can touch anything. This is not optional plumbing — it is the specific reason the concurrency fix was prioritized ahead of this route (DECISION-LOG.md: "the first planned workflow that would introduce a second writer against a CaseFile concurrently with a human editing the same document").

Every role remains, per `MASTER-BLUEPRINT.md` §4, either fully read-only or "outputs JSON for Viktor to apply" — **no role writes to Payload autonomously via this route in its first version.** The chat panel's job is to show the agent's output as a draft; a human clicking an explicit "Apply" action is what triggers the `payload.update()` call, carrying the version/changedFields the panel already has loaded. This preserves "No agent publishes autonomously... a deliberate human action" (`MASTER-BLUEPRINT.md` §4, §13) exactly, rather than quietly weakening it because a chat UI makes "just let the AI apply it" tempting to wire up first.

### 3.4 Rate/abuse considerations

Not addressed in the original Blueprint at all — worth deciding before implementation, not after: a per-case, per-role rate limit (e.g. N requests/minute) to avoid an accidental client-side loop burning API spend, and a maximum context size cap (desk research output and evidence registers can grow large over a case's lifetime) so a single request can't silently balloon into an expensive or slow call. Neither is a hard blocker for this spec, but both should be explicit implementation-phase decisions, not omissions.

---

## 4. The Five Roles, In Detail

For each: responsibility, exact context to load, output contract, whether/how it writes, and what concretely needs to exist in the repo.

### 4.1 Desk Researcher

**Responsibility** (`docs/review-agents/DESK-RESEARCHER.md`, and the Downloads-package draft slated to replace it per the merge decision): web-based research on licensing, ownership, bonus terms, complaint patterns — populates `deskResearchOutput` and, per the merge decision, should populate the `evidenceRegister` array using its real field shape (`claimKey`, `sourceType`, `mediaRef`, `sourceUrl`, `archiveRef`, `contentHash`, `accessDate`, `verificationStatus` with the 3-tier scheme) rather than either draft's invented flat JSON shape — this exact correction is called out in `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md` Part 1 as something *neither* existing draft actually does correctly, so the merged role file itself needs new "Required output" language, not just a copy-paste of the better draft.

**Context to load:** `caseNumber`, `operatorName`, `operatorUrl`, `casinoType`, `licenseJurisdiction`, `licenseNumber` (as already-known/claimed values to verify, not trusted facts), `parentCompany` (populated, for cross-brand research), existing `evidenceRegister` entries (so it doesn't re-research something already verified), and `assignedReviewer`. **Never:** `computedScores`, `editorialDraft`, `internalNotes`, `accountProfile`, `handsOnResults` (this role runs *before* hands-on testing; giving it hands-on data it shouldn't have yet would blur the pipeline's stage separation).

**Output contract:** JSON matching the actual `evidenceRegister` field shape (not the role file's current invented shape) plus a `deskResearchOutput` summary blob. Every claim carries `verificationStatus` (verified/corroborated/unverified) and a source.

**Can it write?** No — `MASTER-BLUEPRINT.md` §4: "Read-only, outputs JSON for Viktor to apply." The panel shows the output; Viktor's own "Apply" action performs the actual `payload.update()` (with `changedFields: ['deskResearchOutput', 'evidenceRegister']`).

**What needs to exist in the repo:** the merged role file (§7); the context loader's Desk Researcher allowlist branch; an "Apply Desk Research Output" panel action that maps the agent's JSON onto the real `evidenceRegister` array shape (this mapping step is real work — the agent's JSON and Payload's array-field shape are not identical, and someone has to write the translation, not just `data: agentOutput`).

### 4.2 Score Analyst

**Responsibility:** apply the locked rubric (`src/rubrics/traditional.ts` / `src/rubrics/crypto.ts` — **read directly from these files at request time, never hardcoded into a prompt**, since the rubric is Layer 1/LOCKED authority per `SOURCE-OF-TRUTH.md` and can only change via its own locked-version process) to desk + hands-on data, computing per-category scores.

**Context to load:** `casinoType` (selects which rubric file to read), `deskResearchOutput`, `evidenceRegister`, all of `handsOnResults`' claimed/actual pairs. **Never:** `editorialDraft`, `internalNotes`, `accountProfile`.

**Output contract:** per-category scores with `pendingReason` for anything not yet backed by hands-on evidence — **and this is the one place the two role drafts genuinely disagree and the merge decision explicitly left open** (`docs/review-system/DECISION-LOG.md`: committed draft scores incomplete categories at a conservative midpoint; the package draft hard-blocks progression to Editorial until every category has real evidence). **This spec does not resolve that disagreement — it is a real product decision for Viktor, and the merged role file cannot silently pick one without that decision being made first.** Additionally, per the same DECISION-LOG entry, the merged role file must describe categories by reading `src/rubrics/*.ts` directly rather than restating them in prose (the package draft's prose claim about the crypto rubric was already found factually wrong once checked against the real file).

**Can it write?** No — read-only, JSON output for Viktor to apply to `computedScores`.

**What needs to exist in the repo:** the merged role file, *with the conservative-vs-block policy question flagged as unresolved* rather than silently decided one way; a small rubric-file reader utility (already trivial — the files are plain TS exports) wired into the context loader so the prompt always reflects the current locked weights, never a stale copy; an "Apply Computed Scores" panel action.

### 4.3 Editorial Writer

**Responsibility:** write public review copy from confirmed scores — voice/tone grounded in `docs/FOUNDER-CONTEXT.md` (the package draft references this; the committed draft doesn't, and per the merge decision this is a real, not cosmetic, gap since that file exists specifically to shape editorial voice).

**Context to load:** `computedScores` (must be non-null — see §2.2's gating), `deskResearchOutput`, `evidenceRegister`, `handsOnResults`, `casinoType` (selects `docs/design-system/CATEGORY-IDENTITY.md`'s relevant category voice, per the package draft). **Never:** `internalNotes`, `accountProfile`, `monitorLog`.

**Output contract:** the copy structure from the merged role file (Hero/Claims-vs-Reality/Category-breakdown/Community-Sentiment/Compliance per the committed draft, folded together with the package draft's explicit methodology-footer sentence and "Who is it for?" section — per the merge decision's recommendation to weight toward the package here but keep the committed version's explicit Compliance/Community-Sentiment block requirements).

**Can it write?** No — read-only, drafts `editorialDraft` for Viktor to review and apply.

**What needs to exist in the repo:** the merged role file; context loader branch including `FOUNDER-CONTEXT.md` and `CATEGORY-IDENTITY.md` content (these are markdown files — the loader needs to read and include them alongside the case data, not just case fields); an "Apply Editorial Draft" panel action (richText field — the agent's plain-text/markdown output needs a real conversion step into Payload's richText/Lexical JSON shape, another translation step that has to actually be written, not assumed).

### 4.4 Integrity Checker

**Responsibility:** the final pre-publish gate — cross-checks copy↔scores↔rubric↔commission-wall. The package draft's 5th check (Compliance Block: age notice, licence reference, RG links) is a genuine addition the committed draft lacks, per the merge decision ("Adopt package").

**Context to load:** everything the Editorial Writer had, plus `editorialDraft` itself and `integritySignOff`'s current value. This is the one role that plausibly needs the *most* context of the five, since its whole job is cross-referencing everything else.

**Can it write?** No — read-only. Its PASS/BLOCKED verdict is a message Viktor reads; `integritySignOff` is set by Viktor's own action in the admin, never by the agent (per `MASTER-BLUEPRINT.md`: "confirmed by Viktor").

**What needs to exist in the repo:** the merged role file (adopt package version per the decision); the commission-wall term list from the package draft (`commission`, `CPA`, `revshare`, etc.) should be reused from — or kept in sync with — `scripts/verify-commission-wall.ts`'s own logic, so the agent's manual text-scan check and the repo's own automated structural check aren't two independently-maintained, potentially-drifting lists of the same thing.

### 4.5 Monitor

**Responsibility:** post-publish surveillance — the package draft's numeric Tier 1/2/3 re-review thresholds are strictly more actionable than the committed draft's unquantified severity labels (per the merge decision, "Adopt package").

**Context to load:** the published review's data, the original desk-research baseline, and `monitorLog`'s existing entries (so it doesn't re-flag something already logged). This role runs against **published, live cases** — a materially different trust boundary than the other four, which all run pre-publish on cases Viktor is actively working. A monitor-role invocation touching a *live public review* deserves its own, explicit access check (confirm the case's `status` is genuinely `monitoring` before loading anything) even though the other roles already do this per §2.2 — worth calling out here because getting this one wrong has real-world consequences (a live page), not just an internal-workflow inconvenience.

**Can it write?** "Creates handoff entry only" per `MASTER-BLUEPRINT.md` §4 — meaning its one write path is appending to `monitorLog` (an array field, not free-form document mutation), still via a human "Apply" action, still through the version-checked write path.

**What needs to exist in the repo:** the merged role file (adopt package version); since this role is meant to run **periodically**, not just on-demand from an open admin panel, an actual trigger mechanism (a Vercel Cron Function, most likely, given `payload.config.ts` already has a `jobs.access` check gated on `CRON_SECRET` for exactly this kind of use) is a real, separate piece of infrastructure this role needs that the other four don't — **not specified further here, since scheduling a cron job is explicitly a non-goal of this spec** (see §7) and deserves its own dedicated design once the on-demand chat panel exists and works.

---

## 5. Security/Governance Considerations Specific to This Route

- **Commission wall applies to prompts too, not just to Payload writes.** `scripts/verify-commission-wall.ts` verifies commission-shaped fields don't exist in the schema and don't persist if spiked into a write — but it says nothing about what gets sent *to* an LLM prompt. The context loader's allowlist (§3.1) is the actual enforcement point for this route specifically; it should be reviewed against the commission wall's own test list when built, not assumed to be equivalent by construction.
- **The AI route is the first surface reading from tables with RLS disabled** (per DECISION-LOG.md's own reasoning for deferring it) — this isn't about the Payload API layer (which already has access control), it's about the fact that once this route exists, `research-queue`/`operators`/`agent-logs` data is being actively used in a new way, making "we haven't decided the RLS posture yet" a materially higher-stakes gap to leave open than it is today, when nothing reads that data except the admin panel itself.
- **`accountProfile` must never reach any role's context**, full stop — none of the five roles' responsibilities require it, and it's the field closest to credential-adjacent (even though it's documented as labels-only, never secrets).

---

## 6. What This Spec Deliberately Does Not Decide

- The exact React/Payload admin API for inserting a sidebar component (Payload's admin-component API has changed across major versions; confirm against the installed 3.86 docs when this is actually built rather than guessing a specific hook name now).
- The Score Analyst conservative-vs-hard-block policy question (§4.2) — a real, still-open decision for Viktor.
- The Monitor cron/scheduling mechanism (§4.5) — separate design, separate phase.
- Rate limiting specifics and context-size caps (§3.4) — flagged, not specified.
- The AI SDK dependency choice/version (`@anthropic-ai/sdk` vs. a higher-level framework) — an implementation-phase decision.

---

## 7. Non-Goals / Why This Is Still a Spec, Not a Green Light

- **No code, route, component, or dependency was added in this session.** This is a definition document only, per the user's request ("what do we build... make a definition... if there is, make it more detailed").
- **The RLS/grants decision remains open and Critical** (`docs/review-system/DECISION-LOG.md`) — building any part of this route before that lands would contradict the standing rationale for deferring it in the first place, which this spec does not attempt to override.
- **The role-file merge remains decided-but-not-executed.** Building against the currently-committed role files would mean shipping a Desk Researcher whose confidence scheme doesn't match the live schema (§3.2) — a concrete, already-identified defect, not a theoretical risk. The merge itself is a small, self-contained follow-up (five markdown files, no code) that could reasonably be done as its own narrow phase before or alongside the RLS decision, independent of it.
- No Stake work, no changes to `media`/Blob, no changes to RLS/grants themselves, no scheduling/cron work.

## Recommended Sequencing (not authorized here, just laid out)

1. Execute the role-file merge (docs-only, five files, already fully specified in `docs/review-system/DECISION-LOG.md` and `docs/review-handoffs/2026-07-22-platform-before-stake-reconciliation.md`) — no code dependency on RLS at all.
2. Resolve the RLS/grants decision (Viktor's call — enable-with-policies or accept-with-documented-reason).
3. Only then: build the context loader + `/api/review-chat` route + chat panel, in that order, since the loader is where the security-critical allowlisting lives and should exist and be reviewable before any UI can call it.

## Stop Point

Stopping here: detailed spec written and to be committed in one docs-only commit. No implementation begun. No RLS/grants change. No role-file edits. No Stake work.
