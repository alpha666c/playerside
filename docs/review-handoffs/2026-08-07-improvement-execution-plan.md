# Improvement Execution Plan — 2026-08-07 (plan mode)

> **Scope:** all six areas selected by Viktor from `2026-08-07-improvement-research.md`. No code changed yet — this is the build roadmap for execution.
> **Flow per phase:** implement → gate (`npx tsc --noEmit`, `pnpm lint`, `pnpm test:int`, `pnpm build`) → browser-verify → commit + push + CHANGELOG.
> **Guards to preserve:** audit fixes (answer-key isolation, rate limiter, per-IP cap, deny-write ledger access, PAYLOAD_SECRET hard-fail) must not regress.

---

## PHASE 1 — Review page 2.0 + trust UX (Area A)

**F1.1 Verdict box component** — new `src/components/public/VerdictBox.tsx`; mount above fold on `src/app/(frontend)/casinos/[slug]/page.tsx` + `crypto-casinos/[slug]/page.tsx`. Inputs from the review doc + rubrics (`src/rubrics/traditional.ts`/`crypto.ts`): best-for (1 line), the catch (1 line), license-verified status, overall verdict. Tests: render test asserting verdict fields present; rubric-derived summary score matches `overallScore`.
**F1.2 Pros/cons grid** — new `src/components/public/ProsConsGrid.tsx` from review fields; adjacent to VerdictBox.
**F1.3 Score-breakdown accordion** — new `src/components/public/ScoreBreakdownAccordion.tsx`; renders each rubric sub-category + weight + score (data already in the review doc). Accessible (buttons + aria-expanded).
**F1.4 Sticky CTA bar** — new `src/components/public/StickyCtaBar.tsx`; appears after hero (IntersectionObserver), desktop top + mobile bottom-anchored; affiliate link + RG/18+ micro-copy (containment: disclosure adjacency required). Zero CLS (reserved space).
**F1.5 Bonus deep-dive "real value" calc** — new `src/components/public/BonusValueCalculator.tsx`; reads `wagering-bonuses` fields (multiplier, applies-to, cap, time limit, contributing games) and computes effective value + wagering reality; mission-adjacent (Bonus Heist uses the same data — keep single source).
**F1.6 Mobile ToC + methodology link** — ToC pill bar (sticky, horizontal scroll) on mobile; "How we grade" link inside every review near the score; evidence refs adjacent to claims.

## PHASE 2 — IA, categories, SEO pages (Area B1/B2/B6 + B5)

**F2.1 Category archives** — new `src/app/(frontend)/casinos/[category]/page.tsx` + `/bonuses/[type]/page.tsx`; `Categories` collection (exists) linked via relationship fields on reviews/bonuses; seed categories + wire in `scripts/seed-nav.ts` nav (keep ≤6–7 top-level; categories live under "Casino reviews"/"Bonuses").
**F2.2 No-wagering bonus hub** — new `/bonuses/no-wagering/page.tsx` listing `no-wagering-bonuses` with wagering-free badges + T&Cs-at-a-glance cards (0x tag, min deposit, max bet, restricted payment methods).
**F2.3 Internal linking loop** — "Related bonuses" widget on reviews (relationship-driven); category ↔ top-5 list in category pages; contextual anchors. 
**F2.4 Top-lists / best-of** — new `src/app/(frontend)/best-casinos/[slug]/page.tsx` template: Editor's Choice card, ranked #2–10, methodology block, FAQ accordion, Schema.org `ItemList`/`Review` JSON-LD (via `src/lib/seo` or inline script). Content seeded for 2–3 lists.
**F2.5 Sitemap/redirects** — extend `next-sitemap.config.cjs` + `redirects.ts` for new routes.

## PHASE 3 — Search + compare (Area B3/B4)

**F3.1 Global search** — `Cmd+K` command menu (new `src/components/public/CommandMenu.tsx`); client index or `src/search/` API route over casino titles/providers/bonus keywords; debounced results; keyboard nav + focus trap.
**F3.2 Faceted filters** — casino index page with URL-state facets (crypto/fiat, license, payment, bonus type, payout speed) + count badges; mobile bottom drawer.
**F3.3 Compare** — checkbox on review/list cards → floating compare drawer → `/compare?ids=a,b,c` page; highlight differences; sticky compare CTA.

## PHASE 4 — Gamification (Area C)

**F4.1 Onboarding path** — server-side "recommended first mission" (Paper Trail) in `meFlow`/dock when a player has 0 completed missions; dock highlights next step. Tests: fresh player gets onboarding mission surfaced.
**F4.2 Control Streaks + Focus Freezes** — `xp-events` reason `streak_day`; new `streaks` state (playerKey, current, longest, lastDay, frozen) — append-only events + derived state (mirror ledger pattern); freeze tokens EARNED via mission completion (e.g., Tilt Protocol); UI in dock (consistency days, not anxiety chains). Implements the vex-ledger streak-freeze RFC — update skill + add the required "streak freeze grants exactly one protected day" test.
**F4.3 Seasonal prestige (deferrable)** — `prestige_era` field on profiles + Hall of Fame snapshot collection; freeze top ranks as commemorative badges at era end. RFC first, build after streaks land.
**F4.4 New mission types** — implement `license_field_match` + `casino_filter_match` validators (`src/gamification/validators.ts`) + 1–2 new missions (e.g., Paper Trail → license check). Tests per vex-ledger output contract; update skill implemented/planned list.

## PHASE 5 — Review Ops admin console (Area D)

**F5.1 Custom admin view** — `admin.components.views` in `src/payload.config.ts` + importMap: `/admin/review-ops` pipeline board (cases by stage, evidence status, agent logs, audit trail). Built on `@payloadcms/ui` + local API (`payload.find`).
**F5.2 Dashboard widgets** — BeforeDashboard stats: queue depth, cases per stage, XP minted (from `xp-events`), missions completed, daily active scouts.
**F5.3 Stats endpoints** — `endpoints: []` (admin-authed, reuse `authenticated` access) feeding widgets.
**F5.4 Admin CSS + brand** — `admin.css` override; ink/paper/amber.

## PHASE 6 — Analytics, a11y, gates

**F6.1 Funnel events** — verdict-seen, sticky-CTA-shown, sticky-CTA-click, search-used, compare-opened, compare-clickout; document in the vex-surface analytics_events list.
**F6.2 A11y pass** — contrast 4.5:1, 44px targets, focus rings, no hover-only (ui-ux-pro-max + web-design-guidelines checklist on changed components).
**F6.3 Full gates + release** — typecheck, lint, `test:int`, `test:e2e`, build; browser-verify each new surface; CHANGELOG + decision-log entries per phase.

---

## Guardrails & cross-cutting rules
- Every new public route must be CMS-relationship-driven where sensible (Payload collections), not hardcoded.
- New mission XP stays ledger-authoritative, idempotent, daily-capped, rate-limited (extend the FIX-03/04 patterns).
- No financial inducement in gamification copy (vex-canon banned list applies to all new copy).
- Schema changes go through `payload migrate:create` (push is disabled).
- Preserve answer-key isolation: any new quest field with answer data must be stripped in `sanitizeQuestForClient` and `Quests.read` stays admin-only.

## Suggested order
Phase 1 → Phase 2 → Phase 4 (streaks) → Phase 3 → Phase 5 → Phase 6. Phases 1–2 are the highest trust/SEO payoff for least risk; Phase 4.2 is the highest-retention gamification item.
