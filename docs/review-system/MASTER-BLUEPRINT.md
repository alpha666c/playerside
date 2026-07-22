# Playerside Review Intelligence System — Master Blueprint

> **Locked:** 2026-07-22 · Session: Viktor + Perplexity AI  
> **Status:** Planning complete — implementation pending  
> **Supersedes:** nothing (first document of this system)  
> **Do not edit** without updating the version date and logging the change in CHANGELOG.md.

---

## 0. Purpose of This Document

This is the single authoritative specification for how Playerside discovers, researches, scores, publishes, and maintains casino operator reviews. Every agent, every collection, every UI component involved in the review pipeline must be consistent with what is written here. If anything in code, copy, or agent output contradicts this document, this document wins — unless a newer locked version exists.

---

## 1. Source-of-Truth Hierarchy

When any two sources conflict, the higher layer wins. No exceptions.

```
1. src/rubrics/traditional.ts + src/rubrics/crypto.ts   ← weight authority (LOCKED)
2. docs/review-agents/*.md                              ← agent role authority
3. docs/review-system/MASTER-BLUEPRINT.md               ← this file — system authority
4. Payload DB — CaseFile + Operator collections         ← per-operator data authority
5. docs/review-handoffs/                                ← session continuity authority
6. Published review in Payload                          ← public output (derived from all above)
```

No agent may override a higher layer. Editorial copy cannot contradict a score. A score cannot contradict the rubric. The rubric cannot be changed without locking a new version (with migration + tests).

---

## 2. Case Numbering

**Format: `#PS-YYYY-NNN`**

- `PS` — Playerside namespace prefix
- `YYYY` — year the case was *registered* (not reviewed, not published)
- `NNN` — zero-padded sequential integer within that year, starting at `001`

**Seed reviews** (illustrative, not real operators) use the format `#PS-YYYY-SNNN` — the `S` flag marks them as non-live and keeps them out of the real numbering sequence.

| Case | Operator | Type | Status |
|---|---|---|---|
| #PS-2026-S01 | Aurora Bay Casino | Traditional | Seed / published |
| #PS-2026-S02 | Northlight Casino | Traditional | Seed / published |
| #PS-2026-S03 | Ferrous Casino | Traditional | Seed / published |
| #PS-2026-001 | TBD — first real operator | Crypto | Queued |

---

## 3. Review Pipeline — Stage Flow

Every case moves through exactly these stages in order. No skipping.

```
QUEUED → DESK-RESEARCH → HANDS-ON-TESTING → EDITORIAL → INTEGRITY-CHECK → PUBLISHED → MONITORING
```

| Stage | Who acts | What happens | Exit condition |
|---|---|---|---|
| QUEUED | Viktor | Operator added to ResearchQueue collection, case number assigned | Case file created in Payload |
| DESK-RESEARCH | Desk Researcher agent | Licensing, T&C, bonus terms, complaint patterns, ownership research | All desk fields populated; UNVERIFIED fields explicitly flagged |
| HANDS-ON-TESTING | Viktor (with Playwright assist where applicable) | Live account: withdrawal test, support test, KYC test, bonus test, registration test | All test fields populated with real timestamps and evidence |
| EDITORIAL | Editorial Writer agent | Writes public review copy from scored output | Copy draft committed to case file |
| INTEGRITY-CHECK | Integrity Checker agent | Verifies copy ↔ scores ↔ rubric ↔ spec alignment; commission-wall check | Zero conflicts found; signed off |
| PUBLISHED | Viktor (manual publish action in Payload) | `beforeValidate` compliance gate passes; review goes live | Live at `/casinos/[slug]` |
| MONITORING | Monitor agent (periodic) | Watches for licence changes, complaints, press, regulatory actions | Ongoing; flags case for re-review if material change found |

---

## 4. Agent Team — Roles

Five agent role files live at `docs/review-agents/`. Each file is the full system prompt and rules for that role. An agent must read its role file before acting on any review task.

| Role file | Responsibility | Can it write to Payload? |
|---|---|---|
| `DESK-RESEARCHER.md` | Web research, license verification, T&C extraction | Read-only |
| `SCORE-ANALYST.md` | Apply rubric weights to desk + hands-on data, compute scores | Read-only (outputs JSON for human to apply) |
| `EDITORIAL-WRITER.md` | Write public review copy | Read-only (outputs copy for human review) |
| `INTEGRITY-CHECKER.md` | Cross-check copy ↔ scores ↔ rubric ↔ commission wall | Read-only |
| `MONITOR.md` | Post-publish surveillance, flag for re-review | Creates handoff entry only |

No agent publishes autonomously. All publishing is a deliberate human action through the Payload admin.

---

## 5. Standardised Test Suite (Hands-On Layer)

Every operator receives **the same tests** in the same format. This is what makes comparisons fair and scores meaningful.

### 5.1 Withdrawal Test
- Deposit: €50 equivalent via the operator's most-advertised fiat method
- Request full withdrawal via the same method immediately after any required bonus wagering is waived
- Log: exact timestamp of withdrawal request → exact timestamp of funds received
- Evidence: screenshot of withdrawal request + screenshot of bank/wallet confirmation
- Score input: actual elapsed hours → maps to `Withdrawals` sub-category

### 5.2 Support Test
- Channel: live chat AND email
- Opening message: identical across all operators — a question about a bonus term that requires a real agent to answer (not a bot-scriptable FAQ)
- Timing: initiated on a Tuesday between 14:00–15:00 CET (standardised window)
- Log: timestamp sent → timestamp of first human response (bot responses not counted)
- Evidence: full chat transcript screenshot
- Score input: response time in minutes → maps to `Support` sub-category

### 5.3 KYC Test
- Document package: same file uploaded to every operator (a specific standard test document set — to be defined per jurisdiction)
- Log: timestamp upload submitted → timestamp of approval/rejection, list of any additional docs requested, reason for rejection if applicable
- Evidence: upload confirmation screenshot + outcome screenshot
- Score input: turnaround time + friction level → maps to `KYC` sub-category

### 5.4 Bonus Test
- Claim the primary welcome bonus as advertised
- Wager through at a standardised bet size (1% of bonus amount per spin/hand)
- Log: bonus terms as documented, actual wagering requirement reached, cashout result
- Evidence: bonus activation screenshot + wagering completion screenshot + cashout screenshot
- Score input: bonus fairness and actual cashout outcome → maps to `Promotions` sub-category

### 5.5 Registration Test
- Complete signup from a fresh browser session with no existing account
- Log: fields required at signup, any identity checks at registration, time to complete
- Evidence: signup flow screenshots
- Score input: friction level → secondary input to `KYC` sub-category

---

## 6. Claims vs Reality Table

Every published review page includes a Claims vs Reality table as the **first scored section** — before the category breakdown.

| Claim | What they say | What we measured | Verdict |
|---|---|---|---|
| Withdrawal speed | [operator claim] | [actual elapsed time] | ✅ / ❌ / ⚠️ Partial |
| Support response (live chat) | [operator claim] | [actual minutes] | ✅ / ❌ / ⚠️ Partial |
| KYC turnaround | [operator claim] | [actual days] | ✅ / ❌ / ⚠️ Partial |
| Bonus wagering | [operator claim] | [actual requirement] | ✅ / ❌ / ⚠️ Partial |

If a field has not been tested, the cell reads: **"Not yet tested — pending hands-on verification."** No guessing, no estimating, no sourcing from other sites.

---

## 7. Scoring — Seal Rating

Public score = **Seal Rating**, expressed as `X.X / 10` (e.g. 9.1 / 10).  
Sub-categories are scored individually on the same 0–10 scale, weighted per the locked rubric.  
The overall Seal Rating is `computeOverallScore()` applied against the locked rubric weights — never hand-calculated.

**Traditional Casino rubric** (8 categories): see `src/rubrics/traditional.ts`  
**Crypto Casino rubric** (9 categories): see `src/rubrics/crypto.ts`  
Community Sentiment: display-only context, structurally excluded from `overallScore`.

---

## 8. Operator Profiles and Parent Companies

### 8.1 Operator Collection (Payload)
Every operator (brand) has a CaseFile entry. Every parent company (Dama N.V., Direx N.V., White Hat Gaming, etc.) has an `Operator` collection entry. Brands link to their parent via a relationship field.

This enables:
- Automatic grouping of all brands under one operator
- Cross-brand comparison (same parent, different support quality?)
- Parent company scandal/regulatory tracking independent of individual brand reviews

### 8.2 Internal Operator Profile (Post-Publish)
Once a review is published, the CaseFile becomes a permanent internal profile with:
- Full version history of all review iterations
- Internal notes: scandals, legal actions, press coverage (date-stamped, never published automatically)
- Regulatory watch flags
- Re-review trigger log (Monitor agent entries)
- All evidence uploads retained indefinitely

---

## 9. Collections To Build (Payload)

These collections do not yet exist and must be created by a coding agent:

### 9.1 `Operator` (Parent Company)
```
Fields:
  name: text (required)
  slug: text (required, unique)
  jurisdiction: text
  incorporationCountry: text
  knownBrands: relationship → CaseFile[] (has-many)
  internalNotes: richText (internal only, never auto-published)
  regulatoryWatchFlag: checkbox
  createdAt: date (auto)
```

### 9.2 `ResearchQueue` (Case File)
```
Fields:
  caseNumber: text (required, unique) — format #PS-YYYY-NNN
  operatorName: text (required)
  operatorUrl: text
  casinoType: select [Traditional, Crypto]
  parentCompany: relationship → Operator
  licenseJurisdiction: text
  licenseNumber: text
  status: select [queued, desk-research, hands-on-testing, editorial, integrity-check, published, monitoring]
  assignedReviewer: text (default: Viktor)
  deskResearchOutput: json (populated by Desk Researcher agent)
  handsOnResults: group
    withdrawalClaimedHours: number
    withdrawalActualHours: number
    withdrawalEvidenceRef: relationship → Media
    supportClaimedMinutes: number
    supportActualMinutes: number
    supportEvidenceRef: relationship → Media
    kycClaimedDays: number
    kycActualDays: number
    kycEvidenceRef: relationship → Media
    bonusClaimedWager: number
    bonusActualWager: number
    bonusEvidenceRef: relationship → Media
  computedScores: json (populated by Score Analyst agent)
  editorialDraft: richText (populated by Editorial Writer agent)
  integritySignOff: checkbox (set by Integrity Checker agent output, confirmed by Viktor)
  publishedReviewId: relationship → TraditionalCasinoReview | CryptoCasinoReview
  internalNotes: richText (never published)
  monitorLog: array of { date, flagType, summary, agentRef }
  createdAt: date (auto)
  updatedAt: date (auto)
```

---

## 10. AI Chat Interface (Payload Admin)

A custom Payload admin component embedded in the CaseFile detail view:
- Renders as a chat panel in the right sidebar of any CaseFile entry
- On open, loads full case context: caseNumber, operator name, casinoType, rubric, deskResearchOutput, handsOnResults, computedScores, status, monitorLog
- Routes to Claude (default) via a `/api/review-chat` Next.js API route
- System prompt pre-loaded with the relevant agent role (determined by current `status` field)
- Viktor types; the agent responds with full case context without needing re-briefing
- Chat history stored in the CaseFile for continuity across sessions

---

## 11. Handoff File Standard

Every review session that makes progress on a case must end with a handoff file committed to `docs/review-handoffs/`.

**Filename format:** `PS-YYYY-NNN-[stage]-YYYY-MM-DD.md`  
**Example:** `PS-2026-001-desk-research-2026-07-22.md`

**Required sections:**
```
# Handoff — [Case Number] [Operator Name]

Date: YYYY-MM-DD HH:MM CEST  
Stage completed: [stage name]  
Next stage: [stage name]  
Next agent role: [role file name]  

## What Was Done
[Factual summary — no interpretation]

## Current State of UNVERIFIED Fields
[List every field still marked UNVERIFIED with the reason]

## Conflicts Surfaced
[Any discrepancy between claimed and measured — or NONE]

## Evidence References
[File paths or Payload Media IDs for all evidence uploaded this session]

## Next Action
[Exact first step the next agent/session should take]
```

---

## 12. Open Task Backlog

Status key: ✅ Done · 🔲 Not started · 🚧 In progress

### Phase 0 — Foundation (COMPLETE)
- ✅ Rubric locked: 8 Traditional / 9 Crypto categories, weights sum to 100%
- ✅ Community sentiment: display-only, structurally excluded from overallScore
- ✅ AgentLogs collection + logEvent.ts with evidenceRef enforcement
- ✅ Commission-blind wall structurally verified (scripts/verify-commission-wall.ts)
- ✅ Seed reviews: Aurora Bay #PS-2026-S01 (9.1), Northlight #PS-2026-S02 (8.7), Ferrous #PS-2026-S03 (7.4)
- ✅ 10/10 int tests, 6/6 e2e, build clean

### Phase 1 — 3D Seal Fix (URGENT — next Claude Code session)
- 🔲 Debug why WebGL/R3F is falling back to flat SVG on production
  - Check: is the three.js canvas mounting before hydration?
  - Check: is `prefers-reduced-motion` set in test browser?
  - Check: any R3F SSR error in Vercel runtime logs?
  - Fix: ensure WebGL path renders correctly on Vercel edge

### Phase 2 — Review Intelligence System (next Claude Code session, after Phase 1)
- 🔲 Create `Operator` Payload collection (parent company) — spec in §9.1
- 🔲 Create `ResearchQueue` Payload collection (case file) — spec in §9.2
- 🔲 Write Payload migration for both collections
- 🔲 Verify migration: weights still sum 100%, commission wall still clean
- 🔲 Add AI chat panel component to CaseFile admin view
- 🔲 Create `/api/review-chat` Next.js API route (Claude default)
- 🔲 Wire chat context loader (reads case fields → builds system prompt)

### Phase 3 — Agent Role Files (can be done now — no code required)
- ✅ MASTER-BLUEPRINT.md (this file)
- 🔲 docs/review-agents/DESK-RESEARCHER.md
- 🔲 docs/review-agents/SCORE-ANALYST.md
- 🔲 docs/review-agents/EDITORIAL-WRITER.md
- 🔲 docs/review-agents/INTEGRITY-CHECKER.md
- 🔲 docs/review-agents/MONITOR.md

### Phase 4 — First Real Review (#PS-2026-001)
- 🔲 Pick Crypto Casino operator (legitimately licensed, not scandal-heavy)
- 🔲 Create CaseFile #PS-2026-001 in Payload
- 🔲 Run Desk Researcher agent (DESK-RESEARCHER.md prompt)
- 🔲 Viktor: hands-on test suite (§5)
- 🔲 Run Score Analyst agent on combined output
- 🔲 Run Editorial Writer agent
- 🔲 Run Integrity Checker agent
- 🔲 Viktor: manual publish via Payload admin
- 🔲 Commit handoff: `docs/review-handoffs/PS-2026-001-published-YYYY-MM-DD.md`

### Phase 5 — Public-Facing Features (post first real review)
- 🔲 Claims vs Reality table component on review pages
- 🔲 Operator Profile public page (parent company view with all brands)
- 🔲 Review queue public-facing teaser ("X operators under review")
- 🔲 Monitor agent: periodic re-check cron job

---

## 13. What Makes Playerside Different (Keep This In Sight)

- **No affiliate deals, no partnerships, no bought scores.** Ever. The commission-blind wall is structural, not policy.
- **Every claim is tested or explicitly marked untested.** No estimates, no inferences.
- **The methodology is public.** The rubric weights are in the codebase. Anyone can audit them.
- **Slow and deliberate beats fast and compromised.** One rigorous review outweighs ten lightweight ones.
- **The AI team assists — Viktor decides.** No autonomous publishing. No agent overrides the operator.
