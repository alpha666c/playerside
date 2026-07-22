# Playerside Interactive UX Features Blueprint

> **Locked:** 2026-07-22 ~02:25 CEST · Session: Viktor + Perplexity AI  
> **Status:** All 5 features specified — implementation phased (see backlog below)  
> **Depends on:** `docs/design-system/CATEGORY-IDENTITY.md`, `docs/review-system/MASTER-BLUEPRINT.md`

These are the features that make someone say “wait, what is this site” and send the URL to a friend. Every one of them serves a functional purpose — they are not animations for the sake of animations.

---

## Feature 1: The Living Seal

**Priority:** CRITICAL — fix existing WebGL fallback first, then enhance  
**Implementation:** React Three Fiber + `@react-spring/three` + `useSpring`  
**Dependency:** 3D Seal WebGL fix (Phase 1, see MASTER-BLUEPRINT.md)

### Behaviour
- **Idle:** Seal rotates slowly (0.3°/frame) on its Y axis. Subtle ambient occlusion shadow beneath.
- **Cursor proximity (desktop):** When the cursor is within ~150px of the Seal, it tilts toward the cursor. Uses `mousemove` event → normalised vector → `useSpring` rotation. Spring config: `{ stiffness: 120, damping: 14 }` (soft follow, not jittery).
- **Cursor leaves:** Seal drifts back to neutral rotation with same spring.
- **Casino card hover (listing pages):** The mini Seal on the hovered card spins once (360° Y axis, 600ms ease-out) and locks back to face-forward. Signals “this has been evaluated”.
- **Score reveal scroll trigger:** When the review page score section enters viewport, the Seal does a single 720° spin (two full rotations, 1200ms) and then settles. The score number counts up simultaneously.
- **Mobile:** Gyroscope tilt via `DeviceOrientationEvent` if permission granted. Falls back to static if not.

### Implementation notes
- `prefers-reduced-motion` must disable all rotation and return a static Seal at the same visual quality (WebGL render, just no motion).
- SSR: R3F canvas must mount client-side only (`'use client'` + dynamic import with `ssr: false`).
- The current bug (WebGL falling back to flat SVG) is almost certainly an SSR hydration issue or a missing `canvas` mount guard. Fix this in Phase 1 before building any of the above behaviour.

---

## Feature 2: Claim Collapse (Claims vs Reality Table)

**Priority:** HIGH — ship with first real review  
**Implementation:** Framer Motion `AnimatePresence` + `motion.div` height animation  
**Depends on:** `ResearchQueue` collection + hands-on test results

### Behaviour
- The Claims vs Reality table (see MASTER-BLUEPRINT.md §6) renders each row in **collapsed state** by default.
- Collapsed row shows: field name + verdict icon only (✅ / ❌ / ⚠️ Partial).
- Expanded row (on click/tap) reveals: operator claim → what we measured → timestamp → evidence screenshot (thumbnail, opens lightbox).
- Only one row can be expanded at a time (accordion behaviour). Expanding a new row collapses the previous.
- Row background: green tint for ✅, red tint for ❌, amber tint for ⚠️. Background fades in with the expansion.
- **Why this matters:** Transforms a static comparison table into an investigation. The player sees the verdict instantly, drills into the evidence if they want it.

### Accessibility
- Each row is a `<button>` or has `role="button"` with `aria-expanded` state.
- Keyboard navigable (Tab + Enter/Space).
- Expansion animation respects `prefers-reduced-motion` (instant expand/collapse, no animation).

---

## Feature 3: Score Reveal on Scroll

**Priority:** HIGH — ship with first real review  
**Implementation:** Intersection Observer API + CSS counter animation or `framer-motion` `useMotionValue`  
**Page:** Every review page, every category

### Behaviour
- The Seal Rating number displays as `0.0` until the score section enters the viewport (75% threshold).
- On enter: number animates from `0.0` to the actual score over 1200ms with a cubic-ease-out curve.
- Sub-category bars (Traditional: 8 bars, Crypto: 9 bars) animate left-to-right with a stagger of 80ms between each bar.
- Bar fill colour: green for score ≥8.0, amber for 6.0–7.9, red for <6.0.
- The bar animation and number animation are synchronised (both start on the same frame).
- The 3D Seal does its 720° spin at the same moment the number starts counting.

### Notes
- This replaces static display of scores everywhere.
- The number animation must be a pure CSS counter where possible (better performance) — fall back to JS only if the CSS approach can’t handle decimal places.
- `prefers-reduced-motion`: show final score immediately, no animation, no spin.

---

## Feature 4: Bonus Value Calculator

**Priority:** HIGH — ship on No Deposit and Deposit Bonus category pages  
**Implementation:** Client-side React with `useState` — no API calls needed (pure maths)  
**Page:** `/bonuses/no-wagering/[slug]` and `/bonuses/wagering/[slug]`

### The maths
For a bonus with wagering requirement `W` and a target RTP `R` (default: 96%):

- Expected loss to clear = `bonusAmount × wageringMultiplier × (1 - R)`
- Example: €50 bonus × 35 × (1 - 0.96) = €70 expected loss
- Expected remaining balance = `bonusAmount - expectedLoss` (floored at 0)
- Spins to clear (at user’s bet size) = `(bonusAmount × wageringMultiplier) / betSize`
- Estimated time to clear (at 6 seconds/spin) = `spinsToCleared × 6 / 60` minutes

### UI
- Input 1: “Your typical bet size per spin / hand” (slider + number input, range: €0.10 → €10.00)
- Input 2: “Assumed RTP” (advanced toggle, hidden by default, default 96%, range 94–99%)
- Output row 1: “Spins to clear: X,XXX”
- Output row 2: “Estimated time at average pace: X hours Y minutes”
- Output row 3: “Expected balance after clearing: €X.XX” (in green if positive, red if 0)
- Output row 4: “Expected loss trying to clear: €X.XX” (always red)
- **Disclaimer line** (required): “This is a statistical expectation based on RTP averages. Individual results vary. Gambling carries risk. Play responsibly.”

### Notes
- This is the most user-useful feature on the entire site for a player who is actually evaluating whether to claim a bonus.
- No other casino review site does this with real maths. They all just display the multiplier.
- The maths is simple enough to unit-test trivially — add a `calculateBonusValue.test.ts` in `/tests`.

---

## Feature 5: Operator Network Map

**Priority:** MEDIUM — Phase 5, after first real review is live  
**Implementation:** React Flow (node-based graph) or D3 force graph  
**Page:** `/operators` (new page) and embedded widget on each review page

### Behaviour
- A visual graph showing parent companies as large nodes, their brands as smaller connected nodes.
- Each brand node displays: casino logo thumbnail + Seal Rating badge.
- Parent node displays: company name + total brands reviewed.
- Clicking a brand node navigates to the review page.
- Clicking a parent node filters the graph to show only that company’s brands.
- Zoom and pan enabled (mouse wheel / pinch).
- Force-directed layout: parent nodes repel each other, brand nodes cluster around their parent.

### Embedded widget (review pages)
- A small version of the graph (no pan/zoom, 3–4 nodes max) shows in the sidebar of a review page.
- Displays: the reviewed casino + its parent + the other known brands under the same parent.
- Caption: “Other casinos by [Parent Company]”
- Tapping any sibling node navigates to that review.

### Notes
- This is genuinely novel in the casino review space. No one has built this.
- The data feeds directly from the `Operator` (parent company) Payload collection spec in MASTER-BLUEPRINT.md §9.1.
- Do not build until Phase 2 (`Operator` collection) is live.

---

## Implementation Backlog

| Feature | Phase | Depends on | Status |
|---|---|---|---|
| Living Seal — WebGL fix | Phase 1 | 3D Seal debug | 🔲 Not started |
| Living Seal — cursor follow + card spin | Phase 2 | WebGL fix | 🔲 Not started |
| Score Reveal on Scroll | Phase 2 | First real review | 🔲 Not started |
| Claim Collapse | Phase 2 | ResearchQueue collection | 🔲 Not started |
| Bonus Value Calculator | Phase 3 | No/deposit bonus pages exist | 🔲 Not started |
| Operator Network Map (full page) | Phase 5 | Operator collection + ≥1 review | 🔲 Not started |
| Operator Network Map (embedded) | Phase 5 | Full page map | 🔲 Not started |
