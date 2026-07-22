# Handoff — Repository & Deployment Security Review

Date: 2026-07-22 ~04:32 UTC (~06:32 CEST)
Stage completed: Read-only evidence-led review of commit `dbb2ef204f1b847e8dc985516704a4122fe9a317` (Phase 2A.2) against its parent baseline, plus a Haiku adversarial pass
Next stage: Owner decisions on the items below; no code was changed in this review
Next agent role: n/a — this is a review handoff, not a case-pipeline handoff

---

## What Was Done

Full evidence-led review: git reconciliation, live production testing (REST/GraphQL/anonymous PostgREST/media upload), Vercel build+runtime log inspection, source-level tracing of the concurrency mechanism, a Haiku subagent adversarial pass over the diff, and cross-checks against Vercel's and Supabase's own current documentation (Context7 was not available as an MCP tool this session; platform-native doc search was used instead). No code, schema, config, dependency, or deployment changes were made. Full findings are in this session's chat transcript; this file exists to make the single most important discovery durable across sessions.

## The Most Important Finding: An Undelivered Package

**`~/Downloads/playerside-phase3-handoff/` contains a complete, never-committed package from a prior "Viktor + Perplexity" session that could not push to GitHub.** It includes:

- `docs/session-handoffs/playerside-platform-before-stake-2026-07-22.md` — the exact file this entire session's first message asked to be read, correctly reported missing at the time (it was genuinely absent from the repo), but sitting uncommitted one directory over the whole time.
- Newer versions of all 5 `docs/review-agents/*.md` files — introduces a VERIFIED/CORROBORATED/UNVERIFIED labelling convention (which this session's schema work on `evidenceRegister.verificationStatus` independently converged on), explicit "required reading" lists per role, and more detailed research checklists than what's currently committed.
- `docs/review-system/PHASE-3-UPDATE.md` — a trivial checklist-completion diff for MASTER-BLUEPRINT.md §12 (already effectively true in the current committed blueprint).
- An explicit **"Definition of Ready for Stake"** checklist and a **north-star instruction not to begin Stake work** until the internal dashboard/queue/evidence/chat workflow is functional — consistent with, and predating, every "do not begin Stake work" instruction given directly in this session.

There is also a separate, real `~/Downloads/vertix-affiliating/` git repo containing the actual `ORG.md` that 18 code comments in `playerside` cite by section number, never linked into this repository.

## Current State Against the Downloads Package's Own "Definition of Ready for Stake"

| Criterion | Status |
|---|---|
| Role docs committed + Phase 3 marked done | Committed, but **stale** relative to the newer package versions |
| 3D Seal fixed | ✅ Done this session |
| Operator + CaseFile model deployed/migrated | ✅ Done this session |
| Account metadata access-controlled | ✅ yes, but implemented field set is narrower than the package's own spec (4 fields vs. 11 specified) |
| CaseFile transitions with audit trail | ✅ Done and heavily tested this session |
| AI panel | ❌ Not built (correctly deferred) |
| Evidence media upload/access rules tested | ⚠️ Tested — and found **completely broken in production** (every upload 500s; Vercel's serverless filesystem cannot be written to; no storage adapter is configured) |
| Dry-run case through two stages without manual DB intervention | ⚠️ Only exercised via Local API scripts, not a literal admin-UI dry run |

**Net assessment: not ready for Stake**, independent of and in addition to the standing instruction not to begin it.

## Other Findings From This Review (summary — see chat transcript for full evidence)

- Media evidence uploads return HTTP 500 in production (`ENOENT: mkdir '/var/task/public'`) — Vercel's serverless filesystem has no writable `public/`, and no storage adapter (e.g. Vercel Blob) is installed. This is the top-priority functional blocker, ahead of any security concern about the same subsystem.
- Concurrent writes to different fields on the same `research-queue` document lose data (last-writer-wins on the whole row) — reproduced 4 times across two sessions. Root cause traced to Payload's `updateByID` reading a non-locking snapshot before hooks run. A zero-migration fix (a `where`-based compare-and-swap using the existing `updatedAt` field) was identified but not implemented.
- Supabase RLS is disabled and `anon` has full default CRUD grants on `research_queue`/`agent_logs`/`operators`/`media` — confirmed live via an anonymous, read-only PostgREST request (200 OK on all four, currently empty tables). This is Supabase's own documented default behavior, not a project-specific misconfiguration; no Supabase key was found exposed anywhere in this application's code or built client bundle.
- `CHANGELOG.md` and `ORG.md` are referenced as if they exist in this repo (22 total comment references) but neither is present here.
- `.claude/` is untracked but not `.gitignore`d — latent risk of accidental commit.

## Next Action

Owner decision required on all "needs owner decision" items before further implementation work: whether/how to reconcile the Downloads package, the media storage fix, the concurrency-guard fix, and the RLS posture. None of these were implemented in this review by design — this handoff exists so the next session (whoever runs it) does not have to rediscover any of the above from scratch.
