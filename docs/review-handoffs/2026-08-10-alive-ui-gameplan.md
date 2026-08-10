# The Alive Gameplan — Making Playerside Breathe

> **Date:** 2026-08-10
> **Mode:** Research + plan (no code changed yet)
> **Pipeline:** 6 web researchers deployed in parallel (Awwwards/trend · iGaming affiliate UX · gamification science · motion tech stack · AI character/voice/video · color/typography/microcopy) + `ui-ux-pro-max` design-intelligence queries (design-system, product, color, typography, gsap domains) + local audit of `DESIGN-SYSTEM.md`, `persona/vex.json`, prior improvement research.
> **Deliverable:** this gameplan. Execution proceeds phase-by-phase (H1→H6) with browser verification, reviewer pass, DECISION-LOG/CHANGELOG, commit per phase — per our house rules.

---

## 0. Executive summary

Playerside already has a **strong noir-ops HUD foundation** (Phase A–G shipped): Fraunces display, coral/evidence/gold discipline, hairlines, film grain, GSAP+Lenis+R3F, and the Vex Missions gamification core. The gap is **aliveness, not architecture**:

1. **Dead pixels** — fragments of the old zinc/amber palette still live in the 3D hero shader (amber/emerald), admin components (zinc-950/amber-400), and the static evidence field. Subpages read "out of colour" precisely because of these stragglers.
2. **Motion is present but not choreographed** — reveals exist, but there is no page-load ceremony, no route transition, no magnetic/kinetic micro-interaction system, no scroll-velocity-reactive atmosphere.
3. **Vex is a UI dock, not a character** — the single biggest "wow" available to us is making Vex actually exist (animated bust, voice, expressions reacting to gamification state).
4. **No celebration moments** — XP/streaks/badges exist as data; they don't yet explode as ceremonies the way Duolingo-style milestones do (+1.7% 7-day retention from rare high-production feedback).

**The creative direction: "The Wire Room."** The whole site is one live intelligence operation. Vex is the scout feeding you intel. Every review is a case file, every number is telemetry, every transition is a screen change in the ops room. Nothing is static because the operation is always running.

---

## 1. Layer 1 — Web-wide trend research (what makes award sites feel alive)

Researchers surveyed Awwwards SOTD, FWA, CSS Design Awards winners (2025–26) — 15 reference sites incl. By-Kin, Iventions, Mat Voyce, Oryzo (Lusion), IVRESS (WebGPU/TSL), Shopify Editions Spring '26, Lacoste Ace Breaker, Cartier Watches & Wonders, Aboutluca, Vectr.

**Trending UP:** scroll-driven cinematic pacing (scrollytelling as structured chapters) · WebGPU + TSL shaders (Safari support shipped) · refined asymmetric bento grids · physics-based inertia (mass/spring, not tween) · magnetic buttons + DOM-aware cursors · view transitions between routes · single-object 3D + PBR · particle flow fields.

**Stale/overdone:** blanket glassmorphism · gratuitous spinning 3D drops without art direction · hyper-sterile minimal sans · 2018 crypto-neon glow stacks.

**Performance discipline of winners:** LCP is always lightweight SSR HTML before any WebGL initializes; locked 60fps on mid mobile via instancing, DPR caps, dynamic resolution during fast scroll; `prefers-reduced-motion` = full static fallback, not a token gesture.

**Noir-ops playbook suggested by research:** review cards as classified dossiers (redaction bars slide away on hover) · CRT scanline/terminal shader background that reacts to cursor · chip/stack physics · audio "wiretap" cues · iris/zoom view transitions into case deep-dives.

## 2. Layer 2 — Niche research (iGaming affiliate UX + compliance)

- **Trust theater wins:** Casino Guru Safety Index-style verdict badge + component breakdown; pros/cons with *specific* technical caveats; license badges that link to the regulator register; *empirical* payout timestamps ("avg 4.2h via e-wallet, Jan 2026"); RG widgets embedded in review summaries.
- **Dark vs light:** dark global shell + **modular light/neutral data cards** for heavy comparison tables (hybrid). Editorial long-form gets lighter canvases. Our all-dark approach is fine for the shell; data tables may earn a lighter card treatment.
- **Bonus honesty:** wagering multiplier front-and-center, interactive bonus calculators, sticky-vs-non-sticky clarity, max-cashout and excluded payment methods adjacent to the CTA — never in tiny print.
- **Sticky CTA bars** are standard and lift CTR (+22–35% cited), but must be dismissible.
- **Compliance shapes UI:** RG links prime real estate (header/footer persistent), T&C adjacency to CTAs, geo-filtered bonus rendering, age gates in regulated GEOs.
- **Color language:** excitement (coral/gold/amber) reserved for action; trust (deep navy/blue/green) for data/verification; caution (red/amber) only for negative flags. Our coral/evidence discipline already follows this — good.

## 3. Layer 3 — Behavioral science (gamification that works)

- **Streaks:** Duolingo's streak loop raised next-day retention 12% → 55%. Rare, high-production milestone animations (+1.7% 7-day retention for new users). Freezes deploy **silently and automatically** (+0.38% across millions). Broken streak → recovery quest, never a dead-end. We already planned Control Streaks + Focus Freezes — the science validates it.
- **FTUE:** commitment before registration; a single low-friction foundational quest; explicit progress bar; returning users should see "what is my next 3-minute win?" daily.
- **Companion characters:** users bond with characters that have flaws, distinct tones, and relational stakes (Duo vs Lily). Static tutorial pop-ups have zero resonance. Vex's dry conspiratorial wit is exactly the right archetype — we must give it presence.
- **Intrinsic vs extrinsic:** extrinsic hooks (XP, badges, cosmetics) must bridge to intrinsic payoff ("I just spotted a predatory rollover clause"). Quest = detective game on real T&C. Celebrate process, never deposit size — already canon.
- **Anti-patterns (must avoid):** XP farms → diminishing returns on repeated easy content; guilt-spam notifications → tone settings; pay-to-win → never.
- **Duolingo/Khan/Revolut data point:** gamified fintech shows ~47% higher 90-day retention than plain UIs.

## 4. Layer 4 — Current-state audit (what's alive, what's dead)

**Strong (keep):** token system + gold-as-seal discipline · Fraunces/Instrument Sans/IBM Plex Mono · `.panel`/`.hud-chip`/`.hud-rule` recipes · noise overlay · reduced-motion global · Lenis+GSAP motion provider · ProtocolScrub, LivePayoutLeaderboard, ClaimVsReality, MachinedSeal, StickyCtaBar · VexDock + missions core · entire Phase G AI pipeline.

**Dead pixels / cohesion bugs (fix first — these are why subpages feel "out of colour"):**
1. `HeroField.tsx` shader still uses `FIELD_AMBER #fbbf24` / `FIELD_EMERALD #34d399` (old palette) — must become coral/evidence on ink.
2. `StaticEvidenceField.tsx` docstring + colors reference "amber-ledger-with-rare-emerald".
3. `TeamDashboardClient.tsx` uses `zinc-950/zinc-800/amber-400` (old zinc/amber world, FIX-13 never converged).
4. Any residual `animate-ping`-as-default patterns (ping is fine for live-dot semantics only).

**Missing (the aliveness stack):** page-load ceremony · route transitions · kinetic hover system · scroll-velocity atmosphere · Vex character presence · celebration/ceremony sequences · ambient audio · telemetry-grade data visualization on scores/payouts.

## 5. The creative direction — "The Wire Room"

One sentence: **Playerside is a live intelligence operation; you are a Scout on the wire; Vex is your handler; every page is a screen in the room.**

- **Homepage** = the ops room: live telemetry (leaderboard, protocol steps streaming), the HeroField as the "signal wall" (ink field, coral/evidence ripples reacting to pointer + scroll velocity).
- **Review page** = case file/dossier: verdict box = mission brief; score accordion = classified breakdown; Claims-vs-Reality = exhibit table; redaction bars slide away on hover.
- **Missions** = operations with ceremonies: offer → engage → debrief → rank-up stamp.
- **Navigation/transitions** = screen changes in the room (View Transitions iris/scan).
- **Vex** = the handler with presence: Rive bust, expression state machine, voice on key beats.
- **Words** stay in canon: "recon", "exfil with terms intact", "morning wire", "glass cannon", "tilt protocol", "paper trail" — every UI string is an intel artifact.

## 6. Design decisions (locked for this program)

**Color** (extend, don't replace — the current system is on-trend):
- Keep ink/dusk/paper/coral/evidence/gold-as-seal. Add: `--ink-deep #0e0a12` (hero + overscroll canvas), `--evidence-glow rgba(110,168,216,.18)` (verified highlights), `--coral-glow rgba(255,93,69,.16)` (action focus). Strict 60-30-10: 60% ink, 30% dusk surfaces + hairlines, 10% accent.
- Data cards may earn a slightly lighter surface (`--dusk-2` + paper text at 4.5:1) for comparison tables per niche research.
- No saturated neon floods; glow is a **stroke**, never a fill.

**Type** (already strong — two additions):
- Keep Fraunces display (hero statements), Instrument Sans body, IBM Plex Mono data.
- Add: tabular-nums everywhere numbers align (already `.t-data`), and `letter-spacing` on mono eyebrows stays `.18em`.
- Headline reveal: Fraunces italic accents for single key words (e.g., "the *catch*", "the *wire*") — editorial serif contrast is the current trend and fits noir.

**Words (microcopy) — formulas from research, in canon:**
- Verdicts: "Verified Operator Audit · 9.4/10 Gold Tier · RNG certified · 24h crypto payouts" (specific > superlative).
- Wagering translation pill: "35× bonus → to withdraw $100 bonus you must wager $3,500".
- RG framing as discipline: "Play with edge, not emotion. Set limits before you start. 18+ · Play responsibly."
- Hard ban list stays enforced (no "guaranteed win", "risk-free", etc.).

**Motion system (4 families, per research + existing tokens):**
1. **Page-load ceremony** — eyebrows first, then titles (Fraunces fade+rise with blur, `--ease-out-expo`), then content stagger; 150/260/520ms token durations.
2. **Scroll choreography** — ProtocolScrub live step readout; section reveals with directional blur-fade; scroll-velocity-reactive hero (existing `useScrollVelocity` store, extend to atmosphere).
3. **Micro-interactions** — magnetic buttons (desktop), 1px gold-tint border + 2px lift on cards, active scale .98, focus rings gold 2px offset. Hover kinetics on dossier cards: redaction bars slide.
4. **Ceremonies** — XP burst, badge seal-stamp (MachinedSeal already exists — wire it), rank-up screen, streak flame; these are the rare high-production moments (the +1.7% lever). Cap: **4 families only**, everything routes through tokens, reduced-motion collapses all to instant.

**Audio (Phase H5, optional-first):** muted-by-default toggle in the dock; wiretap static + key-clack SFX on transitions; Vex voice lines (ElevenLabs) on mission beats; no autoplay ever; persisted preference; respects reduced-motion/audio.

## 7. Vex character strategy (the differentiator)

**Now (cheap, near-zero cost):**
- Rive-animated Vex bust in the dock (or corner of missions board): vector noir scout portrait; state machine with inputs = `idle | speaking | celebrate | rank_up | warn`; driven by gamification state (mission offer → speaking; XP grant → celebrate; 18+/RG moment → warn/steady).
- ElevenLabs **Voice Design** → craft Vex's gravelly mid-Atlantic drawl once; **TTS on demand** for key beats (mission offer, debrief, rank-up). Muted default.
- No lip-sync needed initially — mouth states driven by Web Audio `AnalyserNode` when voice plays.

**Later (Phase 2 of character, gated on usage):**
- ElevenLabs **Conversational Voice Agent** widget ("talk to Vex") — ~200–300ms Flash latency; cost ~$300+/mo at 300 sessions/day → gate behind traction; text chat (already built in admin) can serve the public first.
- Veo 3 / Imagen 3 for pre-rendered marketing loops (Vex reacts to a bonus drop), social/YouTube assets — not realtime.

**Tooling verdict (from research):** Rive (state machines, `.riv` binary, Cadet $9/seat/mo for commercial export) beats Live2D/Lottie/HeyGen for a stylized 2D noir character in-browser. Lottie stays for static badge icons. Three.js stays for 3D scenes (MachinedSeal, HeroField). No new motion libraries needed.

## 8. Third-party toolchain + realistic costs

| Tool | Use | Cost path |
|---|---|---|
| **Rive** | Vex character animation + interactive badges | Free tier to prototype; Cadet ~$9/mo when shipping |
| **ElevenLabs** | Vex voice (Voice Design + TTS; later voice agent) | Free tier (10k credits/mo) now; Starter $5/mo for commercial license + instant cloning; voice agent ~$300+/mo at scale — gate later |
| **Google AI Studio** | Imagen 3 (Vex concept art, portraits), Veo 3 (marketing loops) | Free tier to start; ~$0.07–0.15/image, ~$0.10–0.40/sec video when paid |
| **Adobe Creative Cloud (yours)** | Asset cleanup, banners, Firefly variations, Express templates | Owned |
| **GSAP / Lenis / R3F / Motion / three** | Motion system | Installed, free tiers |
| **PostHog or Vercel Analytics** | Funnels (verdict-seen → bonus-click, mission starts, streak retention) | Existing stack — decide in H6 |

**Realistic budget: Phase H1–H4 ≈ $0–15/mo** (Rive free + ElevenLabs free tiers). Voice agent + heavy Veo only after traction proves it.

## 9. Performance & compliance guardrails (non-negotiable)

- Budgets: LCP ≤ 1.8s · CLS 0.00 · INP ≤ 100ms · 60fps on mid mobile. Hero + Rive + voice all `next/dynamic` + `ssr:false`, `Suspense` fallbacks, IntersectionObserver lazy-init, DPR cap [1, 1.5], pause loops when out of view.
- `prefers-reduced-motion: reduce` → static hero frame, no parallax, instant ceremonies (already global — every new feature must route through it).
- Audio: no autoplay, global mute toggle, persisted.
- Compliance: RG link always in dock footer; 18+ chip visible; banned phrases enforced (Vex canon); no urgency dark patterns; T&C adjacency on CTAs; geo awareness on bonus offers. Gamification: XP from validated state transitions only (vex-ledger law), daily caps, no pay-to-win, freezes earned not sold.

## 10. Phased roadmap (what / when / where)

| Phase | Name | What | Effort |
|---|---|---|---|
| **H1** | Kill the dead pixels | Palette convergence (HeroField shader → coral/evidence ink field, StaticEvidenceField, TeamDashboard zinc→brand); global alive-layer: page-load ceremony, kinetic hover system, upgraded Reveal (directional blur-fade + stagger), focus rings | 1–2 sessions |
| **H2** | The Wire Room hero | HeroField 2.0 (pointer-reactive flow + scroll velocity + scanline texture + static reduced-motion frame); ambient gradient-mesh atmosphere; View Transitions API route transitions (iris/scan); magnetic cursor system (desktop, feature-flagged) | 2–3 sessions |
| **H3** | Vex breathes | Rive Vex bust + state machine wired to gamification events; ElevenLabs Voice Design + TTS beats (muted default); mission ceremonies: XP burst, badge seal-stamp, rank-up screen, streak flame | 2–3 sessions + assets |
| **H4** | Telemetry theater | Review page dossier upgrades: animated score rings, payout-speed bars, RTP sparklines; redaction-bar reveals on dossier cards; wagering translation pills; bonus calculator polish; verdict box microcopy refresh | 1–2 sessions |
| **H5** | Moments & sound | Ambient wiretap audio (opt-in), transition SFX, celebration sequences everywhere; final polish + a11y pass + Lighthouse gates | 1 session |
| **H6** | Measure | Analytics funnels (verdict-seen → bonus-click; mission-start; streak retention), A/B sticky CTA, iterate on weak funnels | ongoing |

**Dependencies:** H1 before anything (everything else inherits the palette). H3 needs user assets/keys (see §11). H2 and H4 are parallelizable after H1. Each phase: implement → tsc/lint/tests → build → browser verify → reviewer pass → DECISION-LOG + CHANGELOG → commit/push.

## 11. What you need to do (accounts, keys, assets)

1. **ElevenLabs** — create account, grab API key (free tier is enough for H3). Optional: $5/mo Starter for commercial license + instant voice cloning when we ship voice publicly. → paste key into admin System Settings (like Exa/OpenRouter).
2. **Google AI Studio / Gemini API key** — free tier; enables Imagen 3 (Vex concept art) + Veo 3 (marketing loops) → same admin settings flow.
3. **Rive account** — free tier to prototype the Vex rig; Cadet $9/seat/mo only when we ship the `.riv` commercially.
4. **Vex visual direction** — approve an AI-generated concept (I'll generate 3–5 noir scout portraits with your keys) or send 1–3 reference images you love (style, mood, palette).
5. **Voice direction** — after the portrait: approve a Voice Design sample (gravelly noir drawl) from 2–3 options I generate.
6. **Decide the voice policy** — (a) silent-first: Vex animates + text only, voice later; (b) voice-on-beats: TTS on mission moments, muted default; (c) full voice agent later, gated on traction. (a)/(b) cost ~$0 now.
7. **Adobe (yours)** — ready for asset cleanup/banner work; nothing to set up now.

## 12. Success metrics

- Cohesion: zero old-palette hexes in public surfaces (grep gate).
- Performance: LCP ≤ 1.8s, CLS 0, INP ≤ 100ms on the hero homepage (Lighthouse CI).
- Engagement: mission-start rate, streak D7/D30 retention, dock-open rate, verdict-seen → bonus-click funnel ≥ benchmark.
- Craft: reduced-motion = fully static equivalents; a11y contrast 4.5:1; keyboard path to start a mission intact.
- Feel: the site reads as one continuous operation — a user who lands on `/casinos/stake` cannot tell which page is "the homepage".

---

*Sources: 6 parallel web research briefs (Awwwards/FWA 2025–26 winners; iGaming affiliate teardowns AskGamblers/Casino Guru/industry playbooks; Duolingo/Khan/Revolut retention data; GSAP/Motion/Rive/R3F/View-Transitions engineering review; ElevenLabs/Veo/Imagen/Live2D/D-ID cost & capability review; dark-UI color/type/microcopy trend analysis) + ui-ux-pro-max design-intelligence DB + local DESIGN-SYSTEM.md & persona audit.*
