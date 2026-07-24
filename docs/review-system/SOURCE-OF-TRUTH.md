# Source-of-Truth Hierarchy — Governance Guide

> **Locked:** 2026-07-22 · Playerside Review Intelligence System  
> **Status:** Active — conflict-resolution authority  
> **Supersedes:** MASTER-BLUEPRINT.md §1 (expanded and formalized)  
> **Do not edit** without updating the version date and logging the change in CHANGELOG.md.

---

## Purpose

When any two sources of documentation or authority conflict (e.g., code and MASTER-BLUEPRINT.md disagree about a field structure, or a role file contradicts the blueprint), this document specifies which source wins. No ambiguity; no interpretation.

**In one line:** Git/schema/migrations are **implementation truth** (what actually exists and runs). MASTER-BLUEPRINT.md is the **system spec** (what the system is designed to do). Role files are **agent authority** (what a given agent is bound to). Handoffs are **historical operating records** — they document what happened in a session; they never override a committed spec, migration, or role file, no matter how recent.

---

## Exception: Rubric Weights Outrank Everything

`src/rubrics/traditional.ts` and `src/rubrics/crypto.ts` are the **weight authority, LOCKED** (MASTER-BLUEPRINT.md §1) — they outrank every layer below, including migrations and schema, for scoring-weight questions specifically. Weights aren't stored in the database; `computeOverallScore()` reads these files directly at runtime. Changing a weight requires locking a new rubric version, with a migration and tests, not just a schema change. If any other layer states a weight that disagrees with these two files, the files win, full stop.

This exception applies only to category weights. For everything else (field structure, validation, hooks, access control), the precedence order below applies as normal.

## Precedence Order (Highest to Lowest)

| Layer | Authority | Justification |
|-------|-----------|---|
| **1. Applied migrations + live Postgres schema** | Actual current state: what fields, tables, and types *really exist right now* per `src/migrations/index.ts` and the live database | If a migration never created a field, it does not exist — no matter what the code or blueprint says. Migration-applied state is ground truth. |
| **1a. (Sub-layer) Live database schema beats code** | Schema is physical reality; source code is aspirational | A field in `src/collections/*.ts` that has no corresponding migration is a plan, not a fact. The migration status is what's real. |
| **2. Collection source files** (`src/collections/*`) | Authoritative code that *generates* migrations and defines validation, hooks, access control | One level below applied migrations (code can describe fields not yet migrated); governs behavior for fields that do exist. Does not include the rubric files — see the exception above. |
| **3. Role files** (`docs/review-agents/*.md`) | Agent-specific system prompts and behavioral rules; outrank the blueprint for agent-specific decisions | Each agent's constraints and responsibilities are defined by its role file. If an agent role contradicts the blueprint, the role file wins. |
| **4. MASTER-BLUEPRINT.md** | System/process authority: review pipeline stages, scoring rules, test standards, naming conventions, and methodology | Governs anything not covered by schema, code, or role files. Never overrides any higher layer. |
| **5. Handoff files** (`docs/review-handoffs/*.md`, `docs/session-handoff-*.md`) | Session continuity snapshots; "what happened" in a point-in-time record | Useful for understanding prior context and open issues, but snapshots go stale fast. Never authoritative for "what should happen" or "what currently exists." Use for history, not policy. |
| **6. Published review in Payload** | Derived output; authoritative for what is live on the public site, never for methodology or schema design | Reflects the state of layers 1–4 as applied. Never override any layer to change what is published — change the layer instead. |

---

## How to Use This

**Scenario A:** Code says field X is required; MASTER-BLUEPRINT.md says it's optional.  
→ Check the live migration and schema first. If the migration created field X with `required: true`, the code and schema agree — code wins. If the migration hasn't been applied yet, the code is a plan; the schema (if it exists at all) is the fact.

**Scenario B:** A role file says "the agent cannot write to Payload"; the blueprint says "the agent outputs JSON for human application."  
→ The role file wins. It is the agent's binding instruction.

**Scenario C:** A session handoff says "field Y was marked UNVERIFIED"; but the latest role file says "field Y must be VERIFIED before proceeding."  
→ The role file (layer 3) is current authority. The handoff recorded a point-in-time state; verify field Y now against the current role file's standard.

**Scenario D:** The blueprint and migration disagree on scoring weights.  
→ The migration is the truth. Run `computeOverallScore()` against the live schema to verify which weights are actually applied.

---

## This Document Is Not Authority

This file is a **navigation guide**, not a new top-level authority. It does not outrank the schema, migrations, or code. If you find an error in this hierarchy (e.g., a layer is documented wrong), fix this document — never use it to overrule what the schema or code actually says.

---

## Release Gate & Production Alias Verification Checklist

Before any release is marked ready or deployed to production, the following automated release verification checklist must be executed and confirmed:

1. **Pre-Deploy Verification**:
   - `pnpm run typecheck` (Must complete with 0 errors)
   - `pnpm run typecheck:scripts` (Must complete with 0 errors)
   - `pnpm run lint` (Must complete with 0 errors and 0 warnings)
   - `pnpm run test:int` (All Vitest integration tests must pass)

2. **Post-Deploy Live Alias Verification Command**:
   ```bash
   pnpm run verify:live
   # Or explicitly:
   # npx tsx scripts/verify-live-alias.ts
   ```

3. **Mandatory Post-Deploy Assertion Rules**:
   - **Build Marker Match**: `data-build-sha` extracted from the live response HTML **MUST EQUAL** expected `git rev-parse --short HEAD` (or `VERCEL_GIT_COMMIT_SHA`).
   - **Banned Strings Zero Tolerance**: Verification MUST fail with non-zero exit code if any prohibited marketing/unapproved operator string (`Stake.com`, `BitStarz`, `BC.Game`, `Roobet`, `EV-PAYOUT-`, `EV-SUPPORT-`, `EV-BONUS-`, `Real Tested Payouts`, `Live Verified Intel`, `Updated Today`) is present in the response body.
   - **Sample Marker Requirement**: Verification MUST fail if sample markers (`Aurora Bay`, `[Sample]`, `Illustrative`, `Not Measured`, `SAMPLE-REF`) are missing.
   - **Body Hashing**: The script MUST record and print the raw HTTP response body SHA256 hash alongside headers (`x-vercel-id`, `x-vercel-cache`, `x-matched-path`).

