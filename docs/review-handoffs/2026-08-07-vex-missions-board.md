# Handoff — Vex Missions: Ledger, Dock and Missions Board (Implementation)

Date: 2026-08-07
Stage completed: Implemented, tested, and verified live — the Vex Missions vertical slice (ledger, dock, mission flow) plus the `/missions` board (rank ladder, badges, mission roster). Two commits landed on `main`: `c4dfb74` (gamification) and `70e3807` (homepage/3D rebuild that review pages now sit on).
Next stage: Owner review of copy/UX tone on the board; seeding additional missions (`rtp_detective`, `license_hawk`, `daily_recon`) from the mission registry in `docs/persona/vex.json`; optional badge-XP minting via the ledger's `badge_granted` reason.
Next agent role: n/a — implementation handoff, not a case-pipeline handoff.

---

## What Was Done

### vex-ledger — server-authoritative progression

- **Collections** (commit `c4dfb74`): `quests` (mission definitions with JSON steps), `gamification-profiles` (anonymous player rows keyed by `playerKey`), `user-quests` (per-player state, unique `(playerKey, quest)` index, `lastEvidenceId` idempotency key), `xp-events` (append-only ledger, unique `(playerKey, evidenceId)` index, `reason` enum incl. `badge_granted`). Migration `20260806_225622` applied.
- **Flows** (`src/gamification/flows.ts`): `meFlow`, `missionsFlow`, `startQuestFlow`, `submitStepFlow` — the only XP-minting path. Laws enforced: append-only ledger, dedup-before-status idempotency, server-derived answers (`wagering_math` computes turnover from the **live** bonus doc at submit time), anti-cheat step gating (client may only answer the current step), daily XP cap, and a real DB transaction around completion so concurrent submits cannot both mint.
- **API** (`src/app/(payload)/api/gamification/`): `GET me`, `GET missions`, `POST quests/start`, `POST quests/submit`. Thin adapters over flows; `isValidPlayerKey` gate; answer-bearing fields (`correctKey`, `bonusSlug`, `rgExplain`, `hint`) are stripped by `sanitizeQuestForClient` and verified absent in tests and live.
- **Badges** (`src/gamification/badges.ts`): derived, display-only catalog (8 badges, bronze→platinum). No badge table, no minting — predicates over ledger state computed server-side on read.

### vex-surface — dock + board

- **Dock** (`src/components/vex/`): `VexDock`, `QuestCard`, `MissionHUD`, `XpBar`, `BadgeToast`, `VexMissionLayer`, mounted on both casino and crypto review pages. Focus trap, Esc-close, aria-live XP, reduced-motion via `motion-reduce:` variants, RG link + 18+ chip always present.
- **Board** (`src/app/(frontend)/missions/` + `MissionsOverview`): dossier strip (XpBar + counts), 7-rung rank ladder with XP thresholds and "You are here", badge grid (earned glow vs locked), mission roster with per-player status (`not_started` / `in_progress` / `completed`), step progress bars, Start / Continue CTAs, RG adjacency block.
- **Hooks**: `useGamification` (dock) and `useMissions` (board) share identity via `src/gamification/playerKey.ts` (anonymous localStorage UUID — the site has no public auth). All XP/rank/badge state is a client mirror of the server.

### vex-containment — safety rails

- 18+ chip + GambleAware link on the dock and the board; canon-audited copy (banned-phrase gate in the seed script); anti-cheat step gating blocks skip-ahead exploits; no client-side XP authority; unique indexes + transaction backstops; containment tests (tamper denial, replay idempotency, answer leak, skip exploit, completed-state HUD crash) in `tests/int/`.

## Evidence

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `pnpm lint` | clean |
| `pnpm test:int` (13 files) | 74/74 pass (incl. badge catalog, missions board, HUD component tests) |
| `pnpm build` | clean (Compiled successfully) |
| Live API (`:3001`) | full mission flow: wrong answer → 0 XP + teaching beat; server-derived €14,000 math; +60 XP on completion; replay idempotent; skip exploit → 0 XP; `correctKey`/`bonusSlug`/`rgExplain`/`hint` absent from all client payloads |
| `/missions` page | 200 on dev and prod; board renders ladder/badges/roster with zero console errors (browser-verified) |
| Migration | applied cleanly with unique indexes; `scripts/seed-gamification.ts` reseeds "The Bonus Heist" |

## Known Notes / Next Safe Action

- The board lists missions across **all** page targets; offers inside the dock remain per-page (`pageTarget`). Starting a mission from the board flips its status to `in_progress` and the dock picks it up on the relevant review page.
- Badges are currently derived and read-only. Minting XP on badge earn would use the existing `badge_granted` ledger reason — deliberate, deferred.
- `skills-lock.json` was not regenerated for the four repo-local `vex-*` skills (they are authored in-repo, not marketplace-installed). Regenerate with the skills CLI only if the lock is expected to track them.
