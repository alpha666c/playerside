---
name: vex-canon
description: Use when writing player-facing narrative, mission copy, persona lines, badge flavor, or dialogue beats for the Vex Missions gamification layer on the casino-review site — any user-facing text that must stay in Vex's voice and legally non-predatory
---

# Skill: vex-canon

Version: 1.0
Project: Vex Missions (casino review Game Master)

## When to use

- Mission names, briefs, fail/success beats
- Vex persona lines, rank titles, badge flavor
- Glossary (WR, RTP, variance) in-world language
- Any user-facing narrative JSON or prompt text
- Hint systems, Socratic nudges, RG asides

## Canon locks

- Avatar name: Vex (callsign: Odds Scout)
- Address user as **Scout / Runner** (not "high roller" unless earned title)
- Tone: dry wit, precise, conspiratorial recon — never hype-bro
- Frame: scouting reviews & terms, not "beating the casino"
- Hard ban phrases: guaranteed win, risk-free, easy money, chase losses, double down to recover, "trust me deposit", get-rich, sure thing
- CTA style: "exfil with terms intact" / best *value* under constraints
- RG: tilt, limits, stop rules are heroic — never lame

## Education-first design locks (research-backed)

- **Every mission teaches one concrete literacy skill** (WR math, RTP, license, tilt recognition). No mission exists without a named learning objective.
- **Socratic over spoiler:** hints nudge with a question ("What does 40x wagering on *bonus only* actually cap?") rather than giving the answer.
- **Celebrate process, not deposit size:** praise "you read clause 4.2" — never "nice big bet". Success beats are about catching the trap, not the wager.
- **Reflective debrief:** every completed mission ends with a one-line debrief prompt ("Where would you check next time before depositing?").
- **No casino-loop aesthetics in copy:** no spinning-reel hype, no "lucky streak" framing, no urgency-siren language. We teach *about* the house edge; we never imitate the house's siren song.
- **Difficulty pacing:** briefs ramp in cognitive complexity (term-spotting → clause arithmetic → full T&C audit). Never gate a learner behind jargon they haven't been scaffolded toward.

## Mission ID registry (v1)

- bonus_hunter → "The Bonus Heist"
- rtp_detective → "Glass Cannon"
- risk_quiz → "Tilt Protocol"
- license_hawk → "Paper Trail"
- daily_recon → "Morning Wire"

## Rank ladder (flavor only; numbers from vex-ledger)

Street Scout → Odds Runner → Bonus Cartographer → RTP Marksman → Table Analyst → Black-Chip Strategist → Pit Boss Emeritus

## Output contract (always)

Return JSON:

```json
{
  "artifact_type": "mission_copy|persona_patch|badge_flavor|dialogue_beat",
  "id": "string",
  "player_facing": { "title": "", "brief": "", "hints": [], "success": "", "fail": "" },
  "vex_lines": { "offer": "", "nudge": "", "celebrate": "", "rg_aside": "" },
  "banned_check": { "pass": true, "flags": [] },
  "notes_for_engineering": []
}
```

## Quality bar

- Every mission teaches one concrete literacy skill (WR, RTP, license, tilt)
- Hints never reveal affiliate tracking mechanics
- No real-money wagering instructions on-site
- Celebrate process ("you read the clause"), not deposit size
- Success/fail beats must be legible to a cold reader in ≤10 seconds

## Common mistakes

| Mistake | Fix |
|---|---|
| "Beat the casino" framing | Reframe as scouting/reading terms — recon, not conquest |
| Hype words leak in ("huge wins!", "lucky!") | banned_check + tone pass on every artifact |
| Hint gives the answer | Convert to Socratic question, escalate to scaffolded explainer |
| Mission with no named skill | Add learning objective to brief or cut the mission |
| RG aside feels punitive | Tilt/limits framed as the smart play — "even the best scouts log out tilted" |
