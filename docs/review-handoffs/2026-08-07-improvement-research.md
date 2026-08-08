# Improvement Research — 2026-08-07

> **Pipeline:** 4 researchers deployed in parallel (competitive UX & journey · education-first gamification · IA/categories/search · Payload admin customization) + `ui-ux-pro-max` design-intelligence query. Skills applied: ui-ux-pro-max, web-design-guidelines. Plan mode — no code changed.
> **Companion:** `docs/review-handoffs/2026-08-07-improvement-execution-plan.md` (the prioritized build plan). User selected ALL six areas for planning.

---

## A. User journey & review-page UX

**Today:** reviews render rubric scores, evidence drawer, Vex dock — no verdict box, no comparison, no scroll CTA.

Ranked additions (trust impact first):
1. **Verdict box above the fold** — "Best for… / The catch / License verified?" readable in ~15s. Every top review site leads with this.
2. **Pros/cons split grid + score-breakdown accordion** — the rubric sub-scores (`src/rubrics/*`) already exist; surface them as an expandable audit trail.
3. **Sticky CTA bar on scroll** (desktop top, mobile bottom-anchored) — research cites +22–35% CTR on review pages.
4. **Bonus deep-dive with "real value" calculation** — `wagering-bonuses` already holds exact multiplier/applies-to/cap/games data; render an interactive breakdown instead of a static line.
5. **Methodology + evidence adjacency** — link "How we grade" inside every review near the score; evidence refs next to claims (E-E-A-T).
6. **Mobile ToC pills + zero CLS** on CTA/compare injection (70%+ mobile traffic on review sites).

**Design system (ui-ux-pro-max, query "casino review trust editorial dark premium fintech"):**
- Pattern: Product Review/Ratings Focused. Style: **Exaggerated Minimalism** (dark ✓, WCAG AA ✓, excellent perf).
- Colors: trust gold primary `#F59E0B` (≈ current amber accents), dark background `#0F172A`, hairline borders, muted slate. Headings **Inter**.
- Anti-patterns to avoid: playful design, unclear fees, AI purple/pink gradients.
- Pre-delivery checklist: SVG icons (lucide — already used), hover 150–300ms, focus rings, reduced-motion (already strong), responsive 375/768/1024/1440.

## B. IA, categories, search, comparison

**Today:** 6 nav items; no category pages, no site search, no compare.

1. **Category/tag archive pages** — `/casinos/[category]` + `/bonuses/[type]`, modeled as Payload relationships (casino type, region, license jurisdiction, payment methods, game providers, bonus type). Highest long-tail SEO unlock; effort L–M.
2. **No-wagering bonus hub** `/bonuses/no-wagering` — the brand differentiator; small effort, high SEO + conversion.
3. **Search + faceted filters** — global `Cmd+K` command menu + faceted filter sidebar (URL-param state, count badges, mobile bottom drawer). Essential as the catalog scales past ~50 entries.
4. **`/compare` side-by-side** — checkbox on cards → floating "N selected [Compare]" drawer → comparison page (ids in URL). Highest EPC surface in the industry.
5. **Best-of / top-list pages** — `/best-casinos/...` with Schema.org `ItemList`/`Review` markup, Editor's Choice card, ranked #2–10, buyer's guide/methodology block, FAQ accordion.
6. **Internal linking loop** — review ↔ bonus ↔ category ↔ top-list via Payload relationships; contextual anchor text; "Related bonuses" widget at review foot.

## C. Gamification (Vex Missions)

**Today:** 5 missions (Bonus Heist, Glass Cannon, Tilt Protocol, Paper Trail, Morning Wire), XP curve `floor(100·L^1.5)`, 8 ranks Street Scout → Pit Boss Emeritus, badges, 200 XP/day cap, dock + missions board.

Ranked by retention impact × cost:
1. **Onboarding mission path** — first session: Paper Trail (low friction, instant XP) → Bonus Heist (analytical). Zeigarnik activation.
2. **Control Streaks + Focus Freezes** — daily "consistency" streak tied to reading/reviewing; freezes EARNED via educational achievements (never sold, never anxiety-triggered). Matches the planned streak-freeze RFC already in `.agents/skills/vex-ledger/SKILL.md`. RG-safe framing over loss-aversion chains.
3. **Seasonal prestige eras / Hall of Fame** — quarterly ladder reset; top ranks freeze into permanent commemorative badges. Solves the L^1.5 wall / achievement fatigue.
4. **New mission types** via the PLANNED validators (`license_field_match`, `casino_filter_match`, `dwell_read`) — content depth without new systems.
5. **RG guardrails (policy)** — zero financial inducement in missions, caps visible/transparent, suppress mission triggers for at-risk users. Non-negotiable in this vertical.

## D. Admin dashboard → Review Ops Console

**Today:** Payload 3.86 admin with `research-queue`/`operator`/`agent-logs`/`gamification-*` collections; beforeLogin/beforeDashboard hooks; live preview configured; default list views only.

1. **Custom admin view `/admin/review-ops`** — `admin.components.views` + importMap registration; pipeline board: cases by stage gate, evidence status, agent logs, audit trail, gamification stats.
2. **BeforeDashboard stat widgets** — queue depth, cases per stage, XP minted (append-only ledger), missions completed, daily active scouts.
3. **Custom stats endpoints** — `endpoints: []` in `payload.config.ts` (admin-authed) feeding the widgets.
4. **Admin CSS override** (`admin.css`) — brand the panel ink/paper/amber.
5. Pattern reference: local API (`payload.find`) + `@payloadcms/ui` hooks in custom view components.

## E. Cross-cutting
- **Analytics funnels** — existing events (`quest_offer_shown`, `dock_open`, `quest_step_ui`) + new: verdict-seen → bonus-click; A/B the sticky CTA.
- **Accessibility** (ui-ux-pro-max priority 1–2): contrast 4.5:1, 44px touch targets, visible focus, no hover-only affordances.
- **FIX-13 (zinc vs brand)** now has a design rationale for future convergence — revisit under a design-led pass.

## Sources
- iGaming affiliate/UX teardowns (iRev, Track360, Voluum iGaming playbooks), CCN crypto-casino review benchmarks
- Growth.Design Duolingo retention case study; Xtremepush gamification + RG compliance frameworks (ETHIC)
- AskGamblers / Casino.org / Casino Guru IA patterns (categories, top-lists, bonus hubs)
- Payload CMS 3 admin customization APIs (views, importMap, endpoints, admin.css)
- ui-ux-pro-max design-intelligence DB (design-system query)
