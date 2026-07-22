# Playerside Category Identity System

> **Locked:** 2026-07-22 ~02:25 CEST · Session: Viktor + Perplexity AI  
> **Status:** Decisions locked — implementation Phase 2+  
> **Feeds into:** `docs/design-system/UX-FEATURES.md`, `docs/review-system/MASTER-BLUEPRINT.md`

Each content category on Playerside has a distinct visual language. Not just a different accent colour — a different *feeling*. The same player who needs a crypto no-deposit bonus is not the same player browsing a UK-licensed traditional casino. The design must reflect that.

This document is the authoritative reference for colour, typography, texture, mood, and key visual differentiators per category. Every component, every page template, every hero must be consistent with the identity defined here.

---

## 1. Crypto Casinos

**URL pattern:** `/crypto-casinos/[slug]`  
**Payload collection:** `CryptoCasinoReviews`

### Visual Language
- **Palette:** Near-black base (`#0A0A0F`), neon green primary accent (`#00FF94`), electric purple secondary (`#9945FF`), muted cyan tertiary (`#00D4FF`)
- **Typography:** Display: geometric mono (e.g. JetBrains Mono or Space Mono for headings). Body: clean sans (Inter). The mono display signals transparency, code, auditability.
- **Texture:** Subtle hex grid pattern (`opacity: 0.04`) on dark backgrounds. Grid lines only — no fills. Signals blockchain, structure, provable fairness.
- **Motion:** Fast. Snap transitions (200ms). Score bars fill instantly with a brief flash rather than a slow ease. Neon glow pulses on hover (CSS box-shadow animation, not JS).
- **Mood:** Edgy, fast, anonymous, technical. This player doesn’t need hand-holding.

### Key Visual Differentiators (UI elements unique to this category)
- **Provably Fair badge** — displayed above the Seal Rating if verified. Animated chain-link icon.
- **Crypto icons** in the payment method strip (BTC, ETH, SOL, USDT, etc.) — coloured SVGs, not generic grey icons.
- **Blockchain confirmation time** shown as a score input label next to the withdrawal row ("Avg blockchain confirmation: X min" pulled from desk research output).
- **`notLicensedInRegulatedMarkets` disclosure** rendered as a prominent amber callout box before the score breakdown, not buried in a footer.
- **CategoryMarker** colour: coral/amber per brand-spec §3.4.

---

## 2. Traditional Casinos

**URL pattern:** `/casinos/[slug]`  
**Payload collection:** `TraditionalCasinoReviews`

### Visual Language
- **Palette:** Deep navy (`#0D1B2A`), rich gold accent (`#C9A84C`), off-white text (`#F5F0E8`), dark forest green secondary (`#1A3A2A`)
- **Typography:** Display: a refined serif (e.g. Playfair Display or DM Serif Display) for the casino name and Seal Rating number. Body: Inter. The serif signals establishment, history, trust.
- **Texture:** Faint felt/fabric texture (CSS noise filter or SVG feTurbulence, very subtle, `opacity: 0.03`). Reminiscent of a casino table surface without being literal.
- **Motion:** Measured. Slow eases (400–600ms). The score reveal is a deliberate, weighty animation — not a flash. Things arrive with gravity.
- **Mood:** Established, trusted, premium. This player is comparing regulated options carefully.

### Key Visual Differentiators
- **Regulatory badge** — front and centre above the fold. Jurisdiction flag + licence number + verification date. Clicking it opens the regulator’s public register in a new tab.
- **Market access chip strip** — horizontal row of country flags showing where the casino is legally available.
- **Seal Rating dominates** — the 3D Seal is larger here than on any other category page. This is where trust is the product.
- **Responsible gambling links** rendered via `ComplianceBlock` with visible prominence, not hidden in footer.
- **CategoryMarker** colour: deep blue per brand-spec §3.4.

---

## 3. No Deposit Bonuses

**URL pattern:** `/bonuses/no-wagering/[slug]` (or `/bonuses/no-deposit/[slug]` — TBD routing decision)  
**Payload collection:** `NoWageringBonuses`

### Visual Language
- **Palette:** Pure black (`#000000`), sharp white (`#FFFFFF`), single signal red accent (`#FF3B3B`) for "real value" callouts. No gradients.
- **Typography:** Display: heavy grotesque (e.g. Space Grotesk Bold or Syne ExtraBold). Oversized. Numbers are the hero — the real value figure should be the biggest thing on the page.
- **Texture:** None. Stripped bare. The brutalist clarity *is* the design statement.
- **Motion:** Minimal. The value number counts up on scroll-enter (that’s it). No decorative motion.
- **Mood:** Direct, no-nonsense, value-first. This player has seen a hundred bonus offers and been burned. They want the real number, not the marketing number.

### Key Visual Differentiators
- **Real Value Calculator** (see `docs/design-system/UX-FEATURES.md` §3) — the centrepiece of this page. Enter your typical bet size → get the realistic expected return and estimated time to clear, with actual probability maths.
- **Wagering requirement displayed as a real-money cost** — not just “x35”. E.g. “€35 bonus × 35 = €1,225 you must wager. At a 96% RTP slot, you’ll lose an average of €49 trying to clear this.”
- **T&C plain-English summary** — the critical clauses pulled out and rewritten in one sentence each (max bet, game restrictions, expiry, cashout cap).
- **CategoryMarker** colour: TBD — suggest signal red to match palette.

---

## 4. Deposit Bonuses

**URL pattern:** `/bonuses/wagering/[slug]`  
**Payload collection:** `WageringBonuses`

### Visual Language
- **Palette:** Warm dark (`#1A1208`), amber (`#F5A623`), soft cream (`#FFF8F0`), forest brown secondary (`#3D2B1F`)
- **Typography:** Display: rounded sans (e.g. Plus Jakarta Sans Bold). Approachable but not infantile. Body: Inter.
- **Texture:** Subtle warm grain (CSS noise, `opacity: 0.02`). Warmer and more mainstream than the brutalist no-deposit pages.
- **Motion:** Medium pace (300ms eases). Smooth and helpful-feeling.
- **Mood:** Helpful, comparative, mainstream. This player wants to find the best deal and needs help understanding what “best” actually means.

### Key Visual Differentiators
- **Side-by-side comparison slot** — a persistent comparison bar at the bottom of the screen. Add up to 2 bonuses, see them compared live (real value, wagering cost, game restrictions, expiry). Nobody else has this.
- **Match percentage + real-value split** — “100% up to €200” displayed alongside “Real value after wagering: ~€12” in the same visual hierarchy.
- **Game contribution callout** — if table games contribute 10% or slots only, this is shown prominently, not in a tooltip.
- **CategoryMarker** colour: amber to match palette.

---

## 5. Industry News

**URL pattern:** `/news/[slug]` (listing: `/news`)  
**Payload collection:** `NewsArticles` (to be created — see `docs/review-system/MASTER-BLUEPRINT.md` Phase 5)

### Visual Language
- **Palette:** Off-white (`#F8F6F2`) background, near-black (`#111111`) text, single deep red accent (`#C0392B`) for breaking/urgent flags. Clean.
- **Typography:** Display: a editorial serif for article headlines (DM Serif Display or similar). Body: Georgia or a high-legibility serif at 18px. This is a publication, not a product page.
- **Texture:** None. White space is the texture.
- **Motion:** None beyond standard link underline transitions. The editorial credibility comes from restraint.
- **Mood:** Credible journalism. Broadsheet-clean. Dense with information but not cluttered.

### Key Visual Differentiators
- **BREAKING flag** — a red pill label, animated entrance on articles tagged `breaking: true`.
- **Operator name auto-links to their review** — every mention of a casino name on a news article is automatically linked to their Playerside review page (or a “not yet reviewed” stub).
- **Timeline view** — the `/news` listing page has a dual mode: grid (default) and timeline (chronological list with date markers). Useful for tracking a story across multiple articles.
- **Article types:** `regulatory-action`, `new-license`, `operator-news`, `industry-update`, `breaking`. Each type has a small coloured tag.
- **Author byline:** Viktor (with a brief bio on the author page that establishes his Betsson/PiratePay/Evolution credentials — see founder context in `docs/FOUNDER-CONTEXT.md`).

---

## Cross-Category Rules

These apply to every category page without exception:

1. **The 3D Seal must render via WebGL.** If it falls back to flat SVG, it is a bug. Fix before shipping any category page.
2. **The commission wall is structural across all categories.** No category page, card, or listing may surface commission, CPA, or revenue-share data.
3. **CategoryMarker colour is set by the collection type**, not by the editorial team. It is a data-driven UI element.
4. **Untested claims are always labelled.** No category is exempt from the UNVERIFIED / pending hands-on labelling rules.
5. **Responsible gambling compliance block is mandatory** on all casino review pages (Traditional and Crypto). Optional on bonus pages but recommended.
