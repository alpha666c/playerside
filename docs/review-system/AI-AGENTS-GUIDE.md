# Playerside AI Agents — Developer Guide

> **Status:** Reference guide for building the AI chat route. Supersedes `docs/review-handoffs/2026-07-23-ai-route-agent-roles-build-spec.md` as the day-to-day reference for this work — that file remains the historical record of how this design was reached; this file is what you actually read before writing code.
> **Do not edit** without updating the version date and logging the change in `CHANGELOG.md`, per this project's own convention for its locked system docs.

---

## 0. Before You Write Any Code

Two things must be true first. Neither is code work — both are quick, and skipping them ships a broken or unauthorized system.

1. **Execute the role-file merge.** The five files in `docs/review-agents/` are still the pre-merge draft. `docs/review-system/DECISION-LOG.md`'s "Role-file version decision" entry already tells you exactly what to change in each file — this is five markdown edits, no code, already fully specified. Building against the current files ships a Desk Researcher with a confidence scheme (`VERIFIED`/`UNVERIFIED`) that doesn't match the live database schema (`verified`/`corroborated`/`unverified`) — a confirmed defect, not a theoretical one.
2. **Get the RLS/grants decision from Viktor.** `DECISION-LOG.md` classifies this **Critical**. This route is the first thing that would put real operator data behind tables Supabase currently exposes to any anonymous request. Do not start the route until this is resolved one way or the other.

Everything else below assumes both are done.

---

## 1. System Overview

Five specialized agents, each bound to one stage of the review pipeline (`docs/review-system/MASTER-BLUEPRINT.md` §3). One shared chat interface loads the correct agent for whatever stage a case is currently in. **No agent publishes or writes autonomously** — every agent is either strictly read-only or produces a draft that a human explicitly applies. This is not a minor detail to preserve when convenient; it's the single thing that makes this whole system trustworthy, and it should be the first thing you defend if a future feature request tries to shortcut it ("just let it auto-apply if confidence is high" is exactly the kind of request to push back on).

```
Case status          →  Agent loaded          →  Can it write to Payload?
─────────────────────────────────────────────────────────────────────────
queued                → (none — Viktor's own action)
desk-research          → Desk Researcher       → No. Draft only.
hands-on-testing       → (none — see §2.2)
editorial (no scores)  → Score Analyst         → No. Draft only.
editorial (scored)     → Editorial Writer      → No. Draft only.
integrity-check        → Integrity Checker     → No. Verdict only.
published              → (none)
monitoring             → Monitor               → Appends to monitorLog only, still draft-and-apply.
```

The route derives the agent strictly from the case's own `status` field (plus, at `editorial`, whether `computedScores` is populated) — **never from anything the client sends.** A request that asks to load the Editorial Writer for a case still at `desk-research` gets rejected server-side.

### 1.1 Recommended model per role

Not fixed by any prior decision — a sensible default to start from, easy to change per-role later since each agent is invoked independently:

| Role | Recommended model | Why |
|---|---|---|
| Desk Researcher | Claude Sonnet 5 | Needs real research/tool-use quality and long-context synthesis across many sources; Sonnet is the right cost/quality point for this volume of work per case. |
| Score Analyst | Claude Sonnet 5 | Mechanical rubric application, but scoring correctness matters enough that the faster/cheaper tier isn't worth the risk. |
| Editorial Writer | Claude Opus 4.8 | The one role where prose quality and voice consistency (`docs/FOUNDER-CONTEXT.md`) are the actual product — worth the extra cost per case. |
| Integrity Checker | Claude Opus 4.8 | The final gate before a review goes live. Favor maximum care over speed here. |
| Monitor | Claude Haiku 4.5 | Runs frequently, per published case, on a comparatively narrow task (diffing current state against a baseline) — fast and cheap is the right trade-off. |

---

## 2. Shared Infrastructure

Build these once; every role depends on them.

### 2.1 `/api/review-chat` route

New file: `src/app/(payload)/api/review-chat/route.ts`. Follow the exact pattern already established in this repo's one existing custom route, `src/app/(frontend)/next/seed/route.ts` — don't invent a new auth pattern:

```ts
import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  const { caseId, message } = await request.json()
  const payloadReq = await createLocalReq({ user }, payload)

  // 1. Load the case, derive the role from its status (§1, §2.2) — server-side, ignore any role the client claims.
  // 2. loadCaseContext(caseId, role, payloadReq) — §2.2.
  // 3. Load the merged role file as the system prompt — §2.3.
  // 4. Call the model (§1.1), stream or return the response.
  // 5. Log the invocation via logEvent() — §2.4.
}
```

`maxDuration` will likely need raising (the seed route sets `60`; a research-heavy Desk Researcher call may need more — check actual latencies once built rather than guessing a number now).

### 2.2 Context loader — the security-critical piece

New file: `src/lib/reviewChat/loadCaseContext.ts`.

```ts
type AgentRole = 'desk-researcher' | 'score-analyst' | 'editorial-writer' | 'integrity-checker' | 'monitor'

async function loadCaseContext(caseId: string | number, role: AgentRole, req: PayloadRequest): Promise<CaseContext>
```

Rules, in order of importance:

1. **Allowlist, never denylist.** Each role's returned context is an explicit list of fields to *include* (§3's per-role tables). A new field added to `ResearchQueue` later is excluded from every role's context by default, until someone deliberately adds it. Never implement this as "return everything except X."
2. **Read via normal access control** (`payload.findByID`, not `overrideAccess: true`) — the calling user's own permissions gate this exactly like any other read.
3. **`accountProfile` and `internalNotes` are never in any role's allowlist.** No exceptions without a deliberate, separate decision.
4. **Log every invocation** via the existing `logEvent()` path (role, case ID, calling user, timestamp) to `agent-logs` — this route is a new actor touching this collection, and the audit trail should record every *read* here the same way it already records every write elsewhere.
5. **Derive the role from case `status` server-side** (§1) — this function's caller, not this function itself, should already have done that derivation; don't accept `role` as untrusted client input anywhere upstream of this call either.

### 2.3 Role-file loader

Reads the merged (§0.1) `docs/review-agents/*.md` content server-side and uses it as the system prompt. Simple file read, cacheable — the only real requirement is that it runs *after* the merge, not before.

### 2.4 Write path — how a human "Apply" action actually writes

Every field an agent proposes stays a draft until a human clicks "Apply" in the chat panel. That action calls `payload.update()` through the concurrency contract from `docs/review-handoffs/2026-07-23-research-queue-concurrency-implementation.md`:

```ts
await payload.update({
  id: caseId,
  collection: 'research-queue',
  context: {
    expectedVersion: currentVersionThePanelLoaded, // required
    changedFields: ['deskResearchOutput', 'evidenceRegister'], // required, exact list
  },
  data: { deskResearchOutput, evidenceRegister },
})
```

Both `context` keys are **required together** — omit either and the write is rejected with a 400 before anything is touched. This is not optional plumbing to skip for a first version; it's the entire reason the concurrency fix was built before this route.

### 2.5 `aiRuns` — already exists, this route is what finally writes to it

`src/collections/ResearchQueue/index.ts`'s `aiRuns` array (`runId`, `agentRole`, `version`, `status`, `startedAt`/`completedAt`, `input`/`output` JSON, `messages`) is currently `readOnly: true` with nothing writing to it. Each chat turn should append one entry here — this is the system's own record of "what did the AI actually say," independent of whatever a human chose to Apply.

### 2.6 Chat panel (admin UI)

A custom Payload admin sidebar component on the `research-queue` collection's edit view. Confirm the exact insertion API (`admin.components.edit.*`) against the installed Payload 3.86 docs when you get here — this has changed across Payload major versions and isn't worth fixing in a doc that predates writing the component. Functionally it needs to: show the loaded role, render the conversation, show the agent's structured output distinctly from prose, and expose one clear "Apply" action per field/section (not one big "apply everything" button — a human should be able to accept the desk research but not the (not-yet-relevant) evidence register entry, for example).

### 2.7 Things nobody has specified yet — decide before shipping

- **Rate limiting.** Per-case, per-role cap so a client bug can't loop into runaway API spend.
- **Context size cap.** Desk research output and evidence registers grow over a case's life; cap what gets sent per call.
- **AI SDK dependency.** Nothing is installed yet (`@anthropic-ai/sdk` or a higher-level wrapper) — pick one when you actually start, don't guess a version now.

---

## 3. The Five Roles

### 3.1 Desk Researcher

**Trigger:** `status === 'desk-research'`.

**Reads:** `caseNumber`, `operatorName`, `operatorUrl`, `casinoType`, `licenseJurisdiction`, `licenseNumber` (as claims to verify, not facts), `parentCompany` (populated), existing `evidenceRegister` entries, `assignedReviewer`.
**Never reads:** `computedScores`, `editorialDraft`, `internalNotes`, `accountProfile`, `handsOnResults`.

**Output:** `deskResearchOutput` summary + `evidenceRegister` entries matching the **real** field shape already in the schema — `label`, `claimKey`, `claimSummary`, `sourceType`, `mediaRef`, `sourceUrl`, `archiveRef`, `contentHash`, `accessDate`, `verificationStatus` (`verified`/`corroborated`/`unverified`). Every claim needs a `verificationStatus` and a source — no exceptions, no inferred facts.

**Build checklist:**
- [ ] Role file merged (§0.1)
- [ ] Context loader branch (fields above only)
- [ ] Output → `evidenceRegister` array mapping (the agent's JSON and Payload's array-field shape are not the same thing — write the actual translation, don't assume `data: agentOutput` works)
- [ ] "Apply Desk Research" panel action → `changedFields: ['deskResearchOutput', 'evidenceRegister']`

### 3.2 Score Analyst

**Trigger:** `status === 'editorial'` AND `computedScores` is empty.

**Reads:** `casinoType`, `deskResearchOutput`, `evidenceRegister`, all `handsOnResults` claimed/actual pairs.
**Never reads:** `editorialDraft`, `internalNotes`, `accountProfile`.

**Rubric authority:** read `src/rubrics/traditional.ts` / `src/rubrics/crypto.ts` directly at request time — **never hardcode category weights into a prompt.** These files are Layer 1/LOCKED per `docs/review-system/SOURCE-OF-TRUTH.md`; they can only change via their own locked-version process, and a stale copy in a prompt would silently drift from them.

**Output:** per-category scores, `pendingReason` for anything not yet backed by hands-on evidence.

**⚠️ Open decision, not yours to make silently:** the two prior drafts of this role disagree on what happens when evidence is incomplete — score conservatively at a midpoint and let the case proceed, or hard-block progress to Editorial until every category has real evidence. `STAGE_ENTRY_GATES` in code enforces neither today. **Ask Viktor before building this, don't pick one.**

**Build checklist:**
- [ ] Role file merged, describing categories by reading the rubric files, not by restating them in prose (a prior draft's prose description of the crypto rubric was already found factually wrong once checked)
- [ ] The conservative-vs-block policy question answered
- [ ] Context loader branch
- [ ] "Apply Computed Scores" panel action → `changedFields: ['computedScores']`

### 3.3 Editorial Writer

**Trigger:** `status === 'editorial'` AND `computedScores` is populated.

**Reads:** `computedScores`, `deskResearchOutput`, `evidenceRegister`, `handsOnResults`, `casinoType` (selects the right section of `docs/design-system/CATEGORY-IDENTITY.md`). Also load `docs/FOUNDER-CONTEXT.md` in full alongside case data — it's what makes the voice actually sound like Viktor rather than generic review copy.
**Never reads:** `internalNotes`, `accountProfile`, `monitorLog`.

**Output:** richText draft — Hero / Claims-vs-Reality / Category breakdown / Community Sentiment / Compliance block, plus a "Who is it for?" section and the locked methodology-footer sentence.

**Build checklist:**
- [ ] Role file merged
- [ ] Context loader includes `FOUNDER-CONTEXT.md` and `CATEGORY-IDENTITY.md` content, not just database fields
- [ ] Output → richText/Lexical conversion (another real translation step — the agent's plain text isn't Payload's richText JSON shape)
- [ ] "Apply Editorial Draft" panel action → `changedFields: ['editorialDraft']`

### 3.4 Integrity Checker

**Trigger:** `status === 'integrity-check'`.

**Reads:** everything the Editorial Writer had, plus `editorialDraft` and the current `integritySignOff` value.

**Output:** PASS or BLOCKED, with the specific check(s) that failed. Five checks: rubric integrity, copy↔score alignment, claims↔evidence traceability, commission wall, compliance block (age notice, licence reference, RG links).

**Commission-wall check should reuse the same term list `scripts/verify-commission-wall.ts` already uses** (`commission`, `CPA`, `revshare`, etc.) — don't maintain two independently-drifting copies of the same list.

**`integritySignOff` is set by Viktor's own action in the admin, never by this agent** — its verdict is a message a human reads, full stop.

**Build checklist:**
- [ ] Role file merged (adopt the more detailed compliance-block check)
- [ ] Context loader branch
- [ ] Commission-wall term list shared with/kept in sync with the existing script

### 3.5 Monitor

**Trigger:** runs against **published** cases, periodically — not on-demand from an open admin panel like the other four.

**Reads:** the published review, the original desk-research baseline, existing `monitorLog` entries (don't re-flag something already logged).

**Output:** Tier 1 (immediate)/Tier 2 (significant)/Tier 3 (informational) findings with numeric re-review thresholds, appended to `monitorLog`.

**Higher trust boundary than the other four** — it touches live public pages. Re-confirm `status === 'monitoring'` before loading anything, even though every role already does this per §1 — worth double-checking here specifically because a mistake has real-world consequences, not just an internal-workflow one.

**Build checklist:**
- [ ] Role file merged
- [ ] A real trigger mechanism — this is the one role that needs a Vercel Cron Function, not just a chat panel button. `src/payload.config.ts` already has a `jobs.access` check gated on `CRON_SECRET`, built for exactly this. **This is its own, separate design — don't bolt it on as an afterthought once the other four are working.**
- [ ] "Apply Monitor Flag" panel action → `changedFields: ['monitorLog']`

---

## 4. Build Order

1. Role-file merge (§0.1) — no code, do this first, independent of everything else.
2. RLS/grants decision (§0.2) — Viktor's call, not code either, but a hard gate.
3. Context loader (§2.2) — the security chokepoint; build and review it before anything can call it.
4. `/api/review-chat` route (§2.1) + role-file loader (§2.3).
5. Desk Researcher end-to-end (simplest role, no rubric/richText translation complexity) — prove the whole pipeline (route → loader → model → draft → Apply) on one role before building the rest.
6. Score Analyst, Editorial Writer, Integrity Checker (in pipeline order).
7. Monitor + its cron trigger, last — genuinely separate infrastructure from everything above.

---

## Where Things Live

| What | File |
|---|---|
| This guide | `docs/review-system/AI-AGENTS-GUIDE.md` |
| Historical design record (superseded by this guide for reference, kept for history) | `docs/review-handoffs/2026-07-23-ai-route-agent-roles-build-spec.md` |
| Pipeline stages, rubric/scoring rules | `docs/review-system/MASTER-BLUEPRINT.md` §3, §7 |
| Precedence between layers when docs disagree | `docs/review-system/SOURCE-OF-TRUTH.md` |
| Standing owner decisions (RLS, concurrency, role-file merge) | `docs/review-system/DECISION-LOG.md` |
| The five role prompts (system prompts) | `docs/review-agents/*.md` |
| Founder voice/tone context (Editorial Writer) | `docs/FOUNDER-CONTEXT.md` |
| Per-category design language | `docs/design-system/CATEGORY-IDENTITY.md` |
| Locked rubric weights | `src/rubrics/traditional.ts`, `src/rubrics/crypto.ts` |
| The collection this all reads/writes | `src/collections/ResearchQueue/index.ts` |
| Concurrency-safe write contract | `docs/review-handoffs/2026-07-23-research-queue-concurrency-implementation.md` |
| Existing custom-route pattern to copy | `src/app/(frontend)/next/seed/route.ts` |
