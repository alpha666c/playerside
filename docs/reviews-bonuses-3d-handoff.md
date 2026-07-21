# Reviews, bonuses, and the machined seal — handoff (2026-07-21)

Builds on `docs/design-handoff.md` (homepage "The Blind"). This covers everything added since: real routing, the two review collections, the two bonus collections, the compliance hard-gate, and the signature 3D moment.

## Routing (real pages, not anchors)

- `/reviews` — hub presenting Traditional and Crypto Casino as two separated entry points (never a merged list, per brand-spec.md).
- `/casinos` (index) + `/casinos/[slug]` (detail) — Traditional Casino.
- `/crypto-casinos` (index) + `/crypto-casinos/[slug]` (detail) — Crypto Casino. Ships with an honest empty-state index (no operators onboarded yet) rather than fabricated crypto content — Phase A content scope was Traditional only.
- `/bonuses` (hub) + `/bonuses/wagering` + `/bonuses/wagering/[slug]` + `/bonuses/no-wagering` + `/bonuses/no-wagering/[slug]`.

Traditional and Crypto Casino stay on genuinely separate URL namespaces (`/casinos/*` vs `/crypto-casinos/*`), separate Payload collections, separate rubrics (`src/rubrics/traditional.ts`, `src/rubrics/crypto.ts`), and a persistent `CategoryMarker` badge everywhere either appears — per ORG.md §3.4, enforced structurally, not just visually.

Header/footer nav (`scripts/seed-nav.ts`, folded into `scripts/seed-content.ts`) now points at these real routes; only "The wall" stays a homepage anchor since the Pressure Test is a homepage-only showcase, not duplicated elsewhere.

## Collections

- `TraditionalCasinoReviews` (`src/collections/TraditionalCasinoReviews`) — 9-category scores (`src/rubrics/traditional.ts`), evidence + narrative per category, verdict (what's good/bad + narrative), compliance group (license number + authority, markets).
- `CryptoCasinoReviews` — 10-category rubric, compliance group swaps market-license fields for `notLicensedInRegulatedMarkets` (hard-required checkbox) + `provablyFairInfo`.
- `WageringBonuses` / `NoWageringBonuses` — exact multiplier/applies-to/cap/time-limit/contributing-games (wagering) or exact amount/eligibility/expiry/withdrawal-conditions (no-wagering). Both link to an operator via relationship.
- Shared field factories in `src/collections/shared/` (`reviewFields.ts`, `bonusFields.ts`) — shared *shape*, not a shared collection; each collection stays independently registered with its own slug/table/URL namespace.
- `overallScore` is always computed server-side from category scores × rubric weights (`computeOverallScore` beforeChange hook) — never hand-entered, so it can't drift from the rubric.

## Compliance is a real publish gate, not just required fields

`src/collections/shared/publishGate.ts` — a `beforeValidate` hook (`enforcePublishCompliance`) that explicitly blocks the publish transition (not drafts) unless the ORG.md-mandated paths are present: markets/license info for Traditional, the not-directed-at-regulated-markets checkbox for Crypto, and the exact-terms fields for both bonus types. This was flagged as unverified in the prior session's handoff; it's now a real, tested gate — verified by attempting to publish a review missing compliance fields via the Local API and confirming Payload rejects it with an attributable error, not just a generic required-field message. Field-level `required: true` was already correct (Payload skips required-validation for drafts by design, and runs it in full on publish); this hook makes that guarantee explicit and centrally reviewable rather than implicit in field config.

Page templates (`ComplianceBlock` component) render the 18+ notice, affiliate disclosure, license number + authority, and self-exclusion links (CRUKS/Spelpaus/OASIS/GAMSTOP) unconditionally — structural, not editorial, per ORG.md §3.3.

## Phase A content

Three illustrative Traditional Casino reviews (Aurora Bay, Northlight, Ferrous — matching the homepage's existing sample-operator names/scores for continuity) with full, differentiated 9-category write-ups: real specific evidence citations and a genuine mix of praise and criticism per operator, including for the top-scored one (per the brief's "god-honest-truth" instruction — even Aurora Bay's review leads with a real weak spot, thin live-casino tables and a logged 40-minute outage). Two bonus pages linked to Aurora Bay. Every seeded document is `isIllustrativeSample: true`, which renders a dashed, unmissable banner — never presented as a real operator. Seed script: `scripts/seed-content.ts` (idempotent — safe to re-run, updates by slug rather than duplicating).

No crypto casino content was fabricated — the empty state on `/crypto-casinos` is honest about first reviews being in progress, consistent with not inventing content the brief didn't ask for.

## Signature 3D moment — "The Seal, machined"

Presented three directions (The Seal machined / The Wall volumetric / The Archive) via a design-decision checkpoint; "The Seal, machined" was chosen as the most ownable and lowest-risk — it's built directly from the already-locked Verification Seal rather than a new visual language, needs no downloaded 3D models, and the "drag to inspect the machined object" interaction reads immediately without requiring the user to understand a new metaphor. This is the *one* true signature 3D moment — it is not on the homepage (which stays exactly as shipped) but on every review page (`/casinos/[slug]`, `/crypto-casinos/[slug]`), replacing the flat SVG seal specifically in that hero spot.

**Files:** `src/components/MachinedSeal/{MachinedSeal.tsx, MachinedSealLazy.tsx, SealScene.tsx}`.

**How it works:** on load, a gold plunger descends and strikes the seal (an extruded torus + engraved tick collar + dark inset face + a checkmark built from two oriented capsule meshes, mirroring the flat seal's SVG path), bounces once, and retracts — a single causal, one-shot animation, never a loop. After it settles, the seal can be dragged (pointer events, mouse and touch) or nudged with arrow keys (when focused) to inspect it from other angles. It never auto-rotates or moves on its own afterward — matching the brand's "orchestrated, not scattered" motion rule.

**Fallback behavior:**
- **No WebGL / `prefers-reduced-motion` / low-power device** (≤2 cores or <380px viewport, coarse heuristics): renders the existing flat `VerificationSeal` SVG — already accessible, already reduced-motion safe, zero new risk. Verified: with `reducedMotion: 'reduce'` in a real browser context, zero `<canvas>` elements render and the SVG fallback is present instead.
- **Accessibility:** the canvas is enhancement-only — the score and "verified" state are always ordinary DOM text right next to it, never only inside the canvas. The container carries `role="img"` + `aria-label`; it's keyboard-focusable with an optional arrow-key nudge, never a keyboard trap (nothing else on the page requires interacting with it).
- **Performance:** `frameloop="demand"` (React Three Fiber's on-demand rendering) once the intro animation settles — the scene does zero GPU work at rest until dragged. Paused entirely (`frameloop="never"`) when the tab is hidden (`visibilitychange`) or the component scrolls out of view (`IntersectionObserver`). `dpr` capped at `[1, 1.5]`. Code-split via `next/dynamic({ ssr: false })` — three.js and `@react-three/fiber` never enter the server bundle or a page's initial JS.
- **Lighting/material:** no downloaded HDRI — uses three's bundled `RoomEnvironment` + `PMREMGenerator` (part of the `three` package itself, not a new asset or dependency) so the gold `MeshStandardMaterial` gets real reflections without a network fetch.

**Dependencies added (approval given in-conversation before installing):** `three` (0.185.1), `@react-three/fiber` (9.6.1, peer-compatible with React 19.2.6), `@types/three` (dev-only, version-matched). No `@react-three/drei` — orbit/drag and lighting were hand-built to keep the dependency surface minimal.

**Bundle cost:** the largest single chunk for a review page is ~870KB raw (uncompressed) in this local build; total page JS ~1.4MB raw. This is pre-compression — `next start` here doesn't apply gzip/brotli itself, and Vercel's edge does that automatically on deploy, so real transferred bytes will be meaningfully smaller. **Not yet verified against the live Vercel deployment** — recommend checking real transferred size (Vercel Analytics or a Lighthouse pass against the production URL) as a first follow-up; if it's not comfortably under ~250KB gzipped, the next lever is trimming unused three.js modules via a narrower import path rather than `import * as THREE`.

## Fixed along the way (pre-existing, unrelated to this feature)

- `src/components/Media/index.tsx` and `src/components/Reveal/index.tsx` both used a dynamic-`React.ElementType` JSX pattern (`<Tag>`) that fails TypeScript under this project's React 19.2 types ("children prop expects type 'never'"). This blocked `npm run build` entirely and predates this session — the prior handoff's build failure was masked by the (also real, separately fixed) missing-migration error, so this never surfaced until the DB was in sync. Fixed by switching both to `React.createElement(Tag, props, children)`, which sidesteps the ambiguous JSX overload resolution without changing behavior.
- `npm run lint` still fails on a pre-existing, unrelated `@eslint/eslintrc` circular-JSON crash while loading Next's flat-config compat layer — unchanged from the prior session, not touched here.

## Commands run

`npm run build` ✓ (all new routes statically prerendered, including the three seeded review pages and two bonus pages) · `npm run test:int` 1/1 ✓ · `npm run test:e2e` 6/6 ✓ (`PW_CHROMIUM_CHANNEL=chrome`) · manual publish-gate test via Local API (blocked as expected) · full responsive/console-error sweep across 12 routes × 7 breakpoints (320/375/390/768/1024/1280/1440px) — zero horizontal overflow, zero console errors anywhere.

## Known limitations / next steps

- Crypto Casino has no content yet (by design — not fabricated for this phase). Building it out is the natural next content pass once Traditional's format is signed off.
- 3D bundle's real (compressed) transfer size unverified against production — see above.
- A second running agent session was adding `AgentLogs` (agent activity/audit-trail logging, per `logging-spec.md`) concurrently in this same working tree during this session — its migration was applied so the local DB stays in sync with `payload.config.ts`, but its source files are that session's work, not this one's.
