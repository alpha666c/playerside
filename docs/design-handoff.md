# Playerside homepage — design-engineering handoff (The Blind)

## Creative thesis

**The Blind**: commercial influence is rendered as real, legible deal-flow that
visibly arrives, is refused at a physical boundary, and is logged as refused —
while the scoring instrument on the other side never moves. The homepage is an
evidence archive (numbered exhibits) with one signature interaction proving the
commission-blind wall (ORG.md §3.2) instead of claiming it.

Chosen over an editorial "Ledger" direction and an instrument "Test Bench"
direction because it is the only mechanism where the visitor *performs the
attack the industry is accused of* ("pay more, rank higher" —
competitive-landscape.md §2) and watches it fail.

## The visual grammar

- **Exhibits**: sections carry mono folio lines (`Exhibit 01 — Scoring sheet`,
  `Exhibit 02 — The wall, tested`, `Exhibit 03 — Filed findings`) via
  `SectionHead`'s `folio` prop.
- **Strike + seal**: a denied figure gets a coral strike-through
  (`.offer-struck`) and a gold `SEALED` chip. This pair is the boundary verb.
- **Redaction** (`.redaction`): a value that physically cannot render — only
  its shape. Activating a redacted field reveals the *rule*, never the number.
- **Stillness as argument**: the grading-side panel in the Pressure Test has no
  animation of any kind, deliberately. Do not "polish" motion onto it.
- **Gold is verification only**: seal, SEALED chips, sealed score, the wall
  line. Never wayfinding, never decoration (interface affordances use
  `--evidence` or `--paper-dim`).

## Components

| Path | Status |
| --- | --- |
| `src/components/homepage/PressureTest/{PressureTest.tsx,tiers.ts}` | new — signature mechanism |
| `src/components/homepage/Hero/HeroBlind.tsx` | new — hero artifact (replaces `HeroCardStack.tsx`, deleted) |
| `src/components/homepage/Wall/TheWallSection.tsx` | rewritten around the Pressure Test (`WallDivider.tsx` deleted) |
| `src/components/homepage/CtaBand/CtaBand.tsx` | rewritten as sealed-document close |
| `src/components/homepage/SampleReviews/SampleReviewCard.tsx` | + Redacted Field interaction |
| `src/components/homepage/shared/SectionHead.tsx` | + `folio` prop |
| `src/app/(frontend)/globals.css` | card-stack CSS replaced by Blind grammar (`.blind-*`, `.offer-*`, `.redaction`, `.pressure-slider`) |

Preserved untouched: `VerificationSeal`, `Reveal`, `Eyebrow`, `Glow`,
`GrainOverlay`, `MethodologySection`/`MethodologyRow` (folio added only),
Header/Footer, all CMS fields (no `Homepage` global schema change, no
migration).

## Motion & 3D system

- All motion is **causal and one-shot**: arrive → struck → sealed, scroll
  reveals via `Reveal`, seal stamps. Nothing loops; nothing runs offscreen
  (IntersectionObserver-gated).
- 3D is **CSS perspective only** (`.blind-stage`/`.blind-plane`, hero tilt on
  `pointer: fine` only). **No WebGL anywhere** — the no-WebGL fallback is the
  page itself.
- Durations: entrances 450–500 ms, strikes 350 ms, seal 700 ms; easing curves
  in `globals.css`.
- Reduced motion: JS gate (`useReducedMotion`) renders final states directly,
  plus a CSS `prefers-reduced-motion` safety net. The narrative survives fully
  static: struck offers render pre-struck, the slider still works.

## Signature interaction contract (Pressure Test)

Native `<input type="range">` — drag, tap, arrow keys; no hover needed.
`aria-valuetext` narrates tier + blocked count; a polite live region announces
totals. The score constant lives in `PressureTest/tiers.ts` (`SEALED_SCORE`);
offers are fictional and visibly labelled `Simulation`. E2e-protected in
`tests/e2e/frontend.e2e.spec.ts`: max pressure ⇒ 4 offers blocked, score
`8.2` unmoved.

## QA evidence (2026-07-21, local dev + system Chrome via Playwright)

- Widths 320/375/390/768/1024/1280/1440: no horizontal overflow, zero console
  errors, full-page screenshots reviewed.
- Keyboard-only: slider reachable (8 tab stops), operable; redacted field
  activatable via Enter; global gold focus ring visible.
- Reduced-motion sweep at 1280: hero static, mechanism functional.
- `npm run build` ✓ · `test:int` 1/1 ✓ · `test:e2e` 6/6 ✓ (run with
  `PW_CHROMIUM_CHANNEL=chrome`; the Playwright chromium CDN download stalled on
  this network — config now accepts the env override, CI default unchanged).
- `npm run lint`: pre-existing, unchanged failure — `@eslint/eslintrc`
  config-validator crashes ("Converting circular structure to JSON") while
  loading the flat-config compat layer. Not introduced by this work; tracked
  separately.

## Known limitations

- Pressure Test copy (tiers, evidence lines) is a code constant, not CMS —
  intentional, same policy as the methodology rubric.
- Playwright chromium binary still not downloaded locally (stalled CDN);
  e2e runs against system Chrome via the env override.
- Hero stats row wraps at wide widths with long labels (pre-existing).

## Extending without going generic

Every new element must answer "what does this communicate about independent
evaluation?" Reuse the boundary verbs (strike+seal, redaction, exhibit folio,
stillness) rather than inventing new ornament. If a proposed section is a
card grid with no evidence content, it does not belong on this page. Gold
stays verification-only. No WebGL unless a moment genuinely needs it — and
never for atmosphere.
