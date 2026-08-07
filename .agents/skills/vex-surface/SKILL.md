---
name: vex-surface
description: Use when designing or building the Vex Missions UI — the Vex Dock, mission HUD, quest cards, XP bar, badge toasts, rank titles, or review-page integration on the casino-review site — including tokens, motion, a11y, and mobile/reduced-motion behavior
---

# Skill: vex-surface

Version: 1.0
Project: Vex Missions (casino review Game Master)

## When to use

- React/Next components for dock, HUD, toasts, mission cards
- Tailwind tokens, dark casino aesthetic, layout on review pages
- States: collapsed / offering / in-mission / reward / voice (later)
- Mobile + desktop; reduced-motion; keyboard access
- Review-page integration (where the dock lives, collision with sticky CTAs)

## Design locks

- **Vex Dock:** bottom-right, z-index above content, never covers primary CTA column entirely on mobile (stack / peek)
- **Mission HUD:** objective + progress pips + XP fragment; **one active mission max** in UI (single-objective rule — cockpit not dashboard)
- **Reward:** toast + optional badge modal ≤ 4s; no full-screen hard gate on article body
- **RG micro-link always in dock footer**; 18+ chip visible in dock header region
- **Aesthetic:** noir ops / neon edge — glass panels, sharp type, restrained gold/cyan accents
- **Avatar tiers:** T0 Rive/Lottie bust default; T1/T2 feature-flagged slots only

## Research-backed UX laws

- **Zero dark patterns:** no fake urgency countdowns ("10 seconds to spot the clause!"), no modal-on-every-scroll, no shame states. We are teaching vigilance, not practicing it on the reader.
- **No shaming leaderboards:** rank against *personal bests* and tier-matched cohorts, never a public loser list. Social comparison must not punish learners.
- **Autonomy:** users choose their missions; dock surfaces an offer, never traps the reading flow.
- **Flow over friction:** mission card shows 3 things max (objective, progress, reward) — anything else is a detail expansion.
- **Attention-safe rewards:** celebrate with a quiet toast, not confetti cannons over the article body.
- **Streak UI:** show streak with freeze protection ("freeze earned — no pressure, Scout") — streaks must never create anxiety loops.
- **Level-up moment:** subtle glass-panel rank-up reveal tied to the XP bar, not an interruption.

## Component inventory

- VexDock, VexChatThread, MissionHUD, QuestCard, XpBar, BadgeToast, RankTitle, RgFooterLink, AgeGateBanner
- Age gate is a containment release gate (vex-containment): surface must VERIFY age gating exists before any mission CTA that deep-links an operator — never assume "handled globally" without evidence
- Optional widget tier (feature-flagged): ScratchCard, GiftBox, LevelUp reveal — only if canon + containment approve

## Hook contract

```ts
useGamification() => {
  profile, activeQuest, offers,
  actions: { refresh, startQuest, submitEvidence, dismissOffer },
  ui: { dockOpen, setDockOpen }
}
```

## Output contract

```json
{
  "artifact_type": "component_spec|token_set|figma_like_spec|code_pr_plan",
  "routes_touched": [],
  "components": [{ "name": "", "props": {}, "states": [] }],
  "a11y": ["focus trap notes", "aria live for XP"],
  "analytics_events": ["quest_offer_shown", "dock_open", "quest_step_ui"],
  "files_to_write": []
}
```

## a11y minimums

- Focus trap on dock open; Escape closes; visible focus rings
- XP / level changes announced via aria-live="polite"
- Keyboard-only path to start mission and reach RG link
- Reduced-motion: dock collapses to static panel; no parallax/confetti
- Contrast ≥ WCAG AA on glass panels over dark backgrounds

## Anti-patterns

- Modal on every paragraph scroll
- Auto-playing voice/face without user gesture
- XP numbers editable in client state as source of truth
- Hiding affiliate disclosure near exfil buttons
- Urgency timers, shame states, public loser leaderboards
- Covering the article's primary CTA on mobile

## Common mistakes

| Mistake | Fix |
|---|---|
| XP shown from client state | Render only what the API returns; client is a mirror |
| Dock overlaps sticky CTA on mobile | Peek/stack layout, safe-area aware |
| Reward modal blocks reading | Toast ≤4s + optional badge modal, dismissible |
| Streak shaming ("you'll lose your streak!") | Freeze mechanic + neutral copy |
