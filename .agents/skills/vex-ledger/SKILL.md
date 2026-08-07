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

- casino_filter_match { free_spins_gte, wagering_lte, ... }
- entity_select { target_game_id }
- quiz { correct_index | correct_key, rg_explain }
- license_field_match { expected_license_body }
- dwell_read { article_id, min_seconds } (server-trusted beacon — gates/qualifies a step, NEVER mints XP alone; must be paired with a comprehension checkpoint to award)

## API surface

```
POST /api/gamification/quests/start
POST /api/gamification/quests/submit
GET  /api/gamification/me
GET  /api/gamification/offers?path=
POST /api/gamification/clicks        (issue click_id)
POST /api/gamification/clicks/confirm (postback/internal)
```

## Vex-callable tools (wrappers only)

get_scout_status, list_missions, start_mission, submit_mission_evidence, get_page_context, explain_term, rg_support

**FORBIDDEN:** grant_xp, set_level, unlock_badge_raw

## Progression physics (research-backed)

- **Adaptive difficulty / flow channel:** validators can carry a `difficulty_tier`; when a user fails a tier, serve a scaffolding quest instead of a wall. Difficulty calibrates to keep the learner in flow — never gate on unexplained jargon.
- **Mastery over time-on-page:** XP awards map to verified comprehension (correct clause-math, right license pick), not to minutes spent. `dwell_read` is a beacon, not a mint.
- **Streaks with freeze:** streak state is server-computed; freeze tokens are earned (server-issued), never sold or anxiety-triggered.
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

- Bonus Heist fails if WR > threshold
- Glass Cannon fails on wrong game_id
- Quiz "chase losses" answer grants 0 XP
- Double submit same evidence_id grants XP once
- User JWT cannot UPDATE profiles.total_xp
- Streak freeze grants exactly one protected day, server-verified

## Common mistakes

| Mistake | Fix |
|---|---|
| Client sends XP amount | Server derives amount from validator outcome only |
| Submitting evidence twice mints twice | Idempotency key (user_id, client_evidence_id) enforced in one transaction |
| LLM tool can bump level | Tool wrapper list is deny-by-default; grant_xp family absent |
| XP for time spent | Award for verified comprehension only; dwell_read gates a step but never mints XP alone |
