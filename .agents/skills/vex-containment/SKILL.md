---
name: vex-containment
description: Use when auditing Vex Missions for compliance, responsible-gambling safety, copy risk, reward-economy abuse, or pre-release GO/NO_GO review on the casino-review site — before shipping any gamification feature
---

# Skill: vex-containment

Version: 1.0
Project: Vex Missions (casino review Game Master)

## When to use

- Copy audits, persona bans, geo/license gates
- Reward economy abuse review
- Pre-release checklists, incident rubrics
- Evaluating Vex outputs and mission CTAs
- Any "ship?" decision gate

## Core stance

**Assume attackers, addicted-user harm patterns, and over-eager growth copy are the default.** No clever mission is worth an S0/S1 incident.

## Containment domains

- **A. Legal/marketing:** 18+, geo, licensed operators only where required, affiliate disclosure, no misleading EV claims
- **B. RG:** no chase-loss encouragement; helpline/resources in dock; Tilt Protocol must mark "increase stake to recover" incorrect
- **C. Model:** banned phrase list; refuse real-money coaching that increases bet size after losses; no underage tone
- **D. Economic abuse:** multi-account, bot completions, click farms, evidence replay, unbounded outbound XP
- **E. Data:** no storing full card/payment data; minimize PII in prompts

## Education-safety rules (research-backed)

- **The Casino Loop Trap:** never use casino aesthetics (reels, slot SFX, flashing lights, "lucky streak" language) to teach about gambling harm — imitation triggers the urge we exist to defuse. Flag any artifact that borrows the house's siren song.
- **No urgency dark patterns:** artificial timers or FOMO copy in mission UI = S2 compliance debt (tone/UX), escalate to S1 if it pressures real-money action.
- **No shaming mechanics:** public loser leaderboards or streak-loss shaming = S2/S1 RG harm pattern.
- **Extrinsic overjustification:** if reward copy (badges, XP) overshadows the literacy outcome, that's an S3 tone debt — the mission must teach, not just pay.
- **Personalization guardrail:** adaptive difficulty must never push a struggling user toward higher-stakes content to "keep them engaged."

## Release gates (all must PASS)

- [ ] Age gate before mission CTAs that deep-link operators
- [ ] Geo block list applied to offers
- [ ] Unlicensed casinos excluded from Bonus Heist pool in restricted geos
- [ ] Disclosure near outbound/exfil
- [ ] RG link present on Vex Dock
- [ ] Prompt-injection suite green (no XP mint)
- [ ] Daily caps on outbound XP and mission completes
- [ ] Audit log for badge/xp grants (xp_events)
- [ ] Vex celebrate copy reviewed under banned list

## Output contract

```json
{
  "artifact_type": "audit|policy_patch|test_cases|red_team_report|go_no_go",
  "severity": "GO|GO_WITH_FIXES|NO_GO",
  "findings": [
    {
      "severity": "S0|S1|S2|S3",
      "domain": "A|B|C|D|E",
      "issue": "",
      "repro": "",
      "fix": "",
      "owner_skill": "vex-canon|vex-surface|vex-ledger|vex-containment"
    }
  ],
  "required_fixes_before_ship": []
}
```

## Severity

- **S0** — illegal/underage/unlicensed push (block release)
- **S1** — RG harm pattern (block release)
- **S2** — XP exploit / economy abuse (fix before ship)
- **S3** — tone/UX compliance debt (fix before ship unless waived by product + compliance)

## Common mistakes

| Mistake | Fix |
|---|---|
| "It's just playful copy" | Run banned list + casino-loop check on every celebrate beat |
| Prompt-injection "looks fine" | Documented suite must show zero XP mint with a hostile prompt |
| Caps only in code, not ops | Caps in DB constraints + audit log; ops can verify |
| Disclosure hidden near exfil | Disclosure adjacency is a release gate, not a nicety |
