# Session Handoff — UX & Category Planning Session (Part 2)

Date: 2026-07-22 ~02:15–02:30 CEST  
Session type: UX design decisions + category identity system  
Participants: Viktor Hedklint + Perplexity AI  
Next stage: Implement (Claude Code — after 3D seal fix)  
Next agent role: Coding agent — read MASTER-BLUEPRINT.md + CATEGORY-IDENTITY.md + UX-FEATURES.md  

---

## What Was Decided This Session

### Category Identity System
Full visual language locked for all 5 content categories. See `docs/design-system/CATEGORY-IDENTITY.md`.

| Category | Base | Accent | Mood | Key UI differentiator |
|---|---|---|---|---|
| Crypto Casinos | `#0A0A0F` | `#00FF94` neon green | Edgy, fast, technical | Provably Fair badge, hex grid texture, mono display font |
| Traditional Casinos | `#0D1B2A` deep navy | `#C9A84C` gold | Established, trusted | Serif display, regulatory badge above fold, larger 3D Seal |
| No Deposit Bonuses | `#000000` | `#FF3B3B` signal red | Brutalist, direct | Real value calculator, wagering cost in € not ×multiplier |
| Deposit Bonuses | `#1A1208` warm dark | `#F5A623` amber | Helpful, comparative | Side-by-side comparison bar, match% + real value split |
| Industry News | `#F8F6F2` off-white | `#C0392B` editorial red | Credible journalism | Editorial serif, BREAKING flag, operator name auto-links |

### Interactive UX Features
All 5 features specified in full. See `docs/design-system/UX-FEATURES.md`.

1. **The Living Seal** — cursor follow, card hover spin, score reveal 720° spin, gyroscope on mobile
2. **Claim Collapse** — Claims vs Reality table rows collapsed by default, expand to reveal evidence
3. **Score Reveal on Scroll** — counter animation + staggered bar fill + Seal spin on viewport enter
4. **Bonus Value Calculator** — real maths (expected loss, spins to clear, time to clear) — no other review site does this
5. **Operator Network Map** — React Flow graph of parent companies + their brands, Seal Rating on each node

### Industry News Section Confirmed
- URL: `/news` (listing) + `/news/[slug]` (article)
- Collection: `NewsArticles` (Phase 5)
- Article types: `regulatory-action`, `new-license`, `operator-news`, `industry-update`, `breaking`
- Operator names auto-link to Playerside reviews
- Timeline view mode on listing page
- Author byline: Viktor (public bio in FOUNDER-CONTEXT.md)

### Game Intelligence — Logged as Phase 6 (Future)
Same review pipeline as casino reviews, scoped to:
- Game providers (RTP verification, mechanic transparency, jackpot audit)
- Individual games (measured vs stated RTP, volatility verification)
- Live casino tables (studio quality, dealer professionalism, multi-camera)
- Game shows (mechanic transparency, house edge calculation)

New Payload collections needed: `GameProviderReview`, `GameReview`.  
**Not in Phase 1–5. Do not implement until after the first real casino review is live and traffic is established.**

### Founder Context Locked
`docs/FOUNDER-CONTEXT.md` created. Viktor’s professional background documented for use by all editorial agents and coding agents to understand the editorial voice and domain expertise.

---

## Full Document Map (as of this session)

```
docs/
  FOUNDER-CONTEXT.md                          ← editorial voice + credentials (NEW)
  design-system/
    CATEGORY-IDENTITY.md                      ← visual language per category (NEW)
    UX-FEATURES.md                            ← 5 interactive features spec (NEW)
  review-system/
    MASTER-BLUEPRINT.md                       ← review pipeline + agent system
  review-agents/
    DESK-RESEARCHER.md
    SCORE-ANALYST.md
    EDITORIAL-WRITER.md
    INTEGRITY-CHECKER.md
    MONITOR.md
  review-handoffs/
    session-2026-07-22-planning.md            ← Part 1 handoff
    session-2026-07-22-part2-ux-planning.md   ← This file (Part 2)
  design-handoff.md                           ← homepage design (pre-existing)
  reviews-bonuses-3d-handoff.md               ← reviews/bonuses + 3D seal (pre-existing)
  session-handoff-2026-07-21-status.md        ← last Claude Code session state (pre-existing)
```

---

## Priority Order (Next Claude Code Session)

1. **Fix 3D Seal WebGL fallback** — check R3F SSR issue, `'use client'` guard, Vercel runtime logs
2. **Implement Operator + ResearchQueue Payload collections** (MASTER-BLUEPRINT.md §9)
3. **Score Reveal on Scroll** (UX-FEATURES.md Feature 3) — first visible UX win after seal fix
4. **Claim Collapse component** (UX-FEATURES.md Feature 2) — ready to wire when first real review lands
5. **Living Seal enhancements** (UX-FEATURES.md Feature 1) — cursor follow + card hover
6. **Bonus Value Calculator** (UX-FEATURES.md Feature 4) — after bonus pages confirmed working
7. **Category identity implementation** — apply CATEGORY-IDENTITY.md palettes + typography per route

## What Can Be Done Now (No Code Required)

- [ ] Pick first real Crypto Casino operator for #PS-2026-001
- [ ] Decide standard support test question (see MASTER-BLUEPRINT.md §5.2)
- [ ] Confirm withdrawal test deposit amount (€50 proposed)
- [ ] Set Monitor agent re-check frequency (monthly proposed)

---

## Current Repo State at End of This Session

- Main branch: commit `63a8e45` (part 1 planning docs) + this commit
- Build: was passing as of session-handoff-2026-07-21 — no code changes this session
- 3D Seal: WebGL fallback issue unresolved — awaiting Claude Code session
- All decisions from both sessions tonight are now committed to the repo
