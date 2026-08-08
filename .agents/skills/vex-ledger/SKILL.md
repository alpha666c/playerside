---
name: vex-ledger
description: Use when designing or implementing the Vex Missions progression system — XP ledger, levels, quests, badges, validators, gamification API routes, anti-cheat, or Vex-callable tool schemas on the casino-review site
---

# Skill: vex-ledger

Version: 1.0
Project: Vex Missions (casino review Game Master)

## When to use

- Payload CMS + Postgres: collections, access control, migrations, seeds (this repo is Next.js 16 + Payload; the original blueprint assumed Supabase — port the intent, not the platform)
- `/api/gamification/*` and validation pure functions
- XP curve, badges, idempotent submits, rate limits
- Tool interfaces the LLM may call (no grant_xp)

## Core principle

**The model narrates; the ledger pays.** XP is a conservation-law physical system: energy is emitted only by validated state transitions, never by dialogue.

## Hard laws

1. Append-only `xp_events`; never UPDATE amount
2. LLM/Vex MUST NOT write XP directly
3. `submitEvidence` is idempotent on (user_id, client_evidence_id)
4. Outbound XP only after verified click_id; daily cap
5. Service role for writes; users SELECT own rows only (Payload: enforce via collection access-control / read-access, the RLS-equivalent)
6. Feature flags: vex_enabled, outbound_xp, vex_voice, vex_face

## Level curve

```
xp_required(L) = floor(100 * L^1.5)
```

Rank-ladder names are canon flavor (vex-canon); the mapping of ladder titles to XP level thresholds is owned by this ledger skill — define it in the levels seed/collection as a later ledger RFC before ladder titles are surfaced in UI.

## Tables (minimum)

profiles, levels, xp_events, quests, quest_steps, user_quests, badges, user_badges, casinos, games, outbound_clicks

## Validator kinds

Implementation status (audit FIX-05, 2026-08-07 + Phase 4, 2026-08-08 — `src/gamification/validators.ts`):

- **IMPLEMENTED:** `quiz` (`validateQuizStep`), `wagering_math` (`validateWageringMathematics` — answer derived from the LIVE bonus doc via `bonusSlug`; this kind is what the Bonus Heist wagering step uses), `license_field_match` (`validateLicenseFieldMatch` — answer derived from the LIVE review's compliance field via `reviewSlug` + `expectedField`; Paper Trail), `casino_filter_match` (`validateCasinoFilterMatch` — answer derived from whether the LIVE bonus doc satisfies a `filter` (e.g. `wageringLte`); correct key = computed passKey/failKey, never stored; Glass Cannon).
- **PLANNED (future missions — not a bug; no mission uses them yet):** `entity_select`, `dwell_read` (server-trusted beacon — gates/qualifies a step, NEVER mints XP alone; must be paired with a comprehension checkpoint to award).

## API surface

Implementation status (audit FIX-06, 2026-08-07):

- **IMPLEMENTED:** `POST /api/gamification/quests/start`, `POST /api/gamification/quests/submit`, `GET /api/gamification/me` (accepts `?path=`), `GET /api/gamification/missions` (the missions-board payload; the original `offers?path=` was superseded by `me?path=`)
- **PLANNED, NOT IMPLEMENTED:** `POST /api/gamification/clicks` and `POST /api/gamification/clicks/confirm`. The containment gate "outbound XP only after verified click_id" is DORMANT until this flow ships — any future outbound-XP work MUST implement the clicks flow first (see `docs/review-system/DECISION-LOG.md` 2026-08-07).

```
POST /api/gamification/quests/start
POST /api/gamification/quests/submit
GET  /api/gamification/me?path=
GET  /api/gamification/missions
# Planned (not implemented):
POST /api/gamification/clicks        (issue click_id)
POST /api/gamification/clicks/confirm (postback/internal)
```

## Vex-callable tools (wrappers only)

get_scout_status, list_missions, start_mission, submit_mission_evidence, get_page_context, explain_term, rg_support

**FORBIDDEN:** grant_xp, set_level, unlock_badge_raw

## Progression physics (research-backed)

- **Adaptive difficulty / flow channel:** validators can carry a `difficulty_tier`; when a user fails a tier, serve a scaffolding quest instead of a wall. Difficulty calibrates to keep the learner in flow — never gate on unexplained jargon.
- **Mastery over time-on-page:** XP awards map to verified comprehension (correct clause-math, right license pick), not to minutes spent. `dwell_read` is a beacon, not a mint.
- **Streaks with freeze (IMPLEMENTED — Phase 4, 2026-08-08, `src/gamification/streaks.ts`):** streak state is server-computed and fully DERIVED from the append-only ledger — a streak day is a calendar day with a completed mission; a Focus Freeze is granted by completing `risk_quiz` (Tilt Protocol, `FREEZE_GRANT_MISSION_IDS`). A freeze protects EXACTLY one missed calendar day, consumed in chronological order, never retroactive. No `streak_day` event and no new table/reason were needed (DECISION-LOG 2026-08-08) — deriving avoids a Postgres enum migration (push is disabled) and mirrors the badge pattern. Freeze tokens are earned, never sold; UI frames it as consistency, not anxiety chains.
- **XP scales with cognitive complexity:** quick quiz = base XP; full T&C audit that catches a hidden trap = Analyst-tier XP (validator-weighted).

## Output contract

```json
{
  "artifact_type": "migration|validator|api_route|test|tool_schema",
  "sql": "optional",
  "ts_modules": [],
  "tests": [{ "name": "", "given": {}, "expect": {} }],
  "threat_notes": ["prompt injection path X blocked because..."]
}
```

## Required tests before merge

All applicable tests pass in `tests/int/*.spec.ts` (audit FIX-05, 2026-08-07 — 79 green):

- Bonus Heist fails if WR > threshold → `gamification-unit.int.spec.ts` "wagering_math: wrong answer fails and cites the expected value" (35× bonus+deposit on €200 ⇒ €14,000; wrong answer fails, 0 XP)
- Glass Cannon fails on wrong game_id → "wagering_math: fails closed when mission config drifts from bonus data" + integration "submit: wagering_math fails closed when the bonus doc is missing"
- Quiz "chase losses" answer grants 0 XP → `gamification-unit.int.spec.ts` "quiz: \"chase losses\" answer style (a) grants 0 XP — pass is never implied"
- Double submit same evidence_id grants XP once → `gamification.int.spec.ts` "submit: full correct run mints XP exactly once (idempotent evidenceId)"
- User JWT cannot UPDATE profiles.total_xp → `update: () => false` on all ledger collections + "containment: direct writes without service role are denied"
- Streak freeze: covered by `streaks.int.spec.ts` (F4.2) — "a freeze grants exactly one protected day" (one grant covers one missed day; a second consecutive missed day breaks), one freeze cannot protect two days, two freezes protect two days, grants are never retroactive, longest tracked across breaks

## Common mistakes

| Mistake | Fix |
|---|---|
| Client sends XP amount | Server derives amount from validator outcome only |
| Submitting evidence twice mints twice | Idempotency key (user_id, client_evidence_id) enforced in one transaction |
| LLM tool can bump level | Tool wrapper list is deny-by-default; grant_xp family absent |
| XP for time spent | Award for verified comprehension only; dwell_read gates a step but never mints XP alone |
