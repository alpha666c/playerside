# Playerside Design System — Noir-Ops HUD Language

> **Status:** Phase A (foundation) shipped 2026-08-08. This document is the working
> language for the Tactical 2.0 UI pass — Phases B (homepage edit + HUD framing), C
> (review page as case file), D (Vex native weave), E (motion/micro-interactions),
> F (mobile & performance budget) all consume these tokens and recipes.
>
> **Source of truth hierarchy:** the locked brand doc
> `brands/01-playerside/design/design-tokens.md` outranks this file. The one hard
> rule carried forward from it: **gold (`#c9a15a`) is reserved for the Verification
> Seal / verified marks only** — never a general accent. Semantic warning gold
> (`--warning: #d8a13a`, verdict "partial" chips) is a different color and fine.

## 1. Color roles (all defined in `src/app/(frontend)/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--ink` | `#1a1420` | Page base (dark by default — not a "dark mode") |
| `--ink-2` | `#150f1a` | Deepest surface (footer, sidebar) |
| `--dusk` | `#2a2032` | Card / raised surface |
| `--dusk-2` | `#352a3e` | Hover surface |
| `--paper` | `#f3eee8` | Foreground text |
| `--paper-dim` | `rgba(243,238,232,.62)` | Muted text |
| `--coral` | `#ff5d45` | Primary action / focus-of-attention |
| `--evidence` | `#6ea8d8` | Verified-measurement accent (blue) |
| `--gold` | `#c9a15a` | **Seal only** |
| `--line` | `rgba(201,161,90,.22)` | Hairlines / borders (gold-tinted line is a texture, not an accent) |

Semantic: `--success #4caf7d` · `--warning #d8a13a` · `--error #e5484d`.

**Discipline:** coral = action; evidence = measurement/verification data; paper = text;
gold = seal. If you need a third accent, prefer `--evidence`, not gold.

**Decided exception (2026-08-08):** the brand `--line` border token is gold-tinted at
22% opacity (`rgba(201,161,90,.22)`). It predates this system and reads as a hairline
texture, not an accent — explicitly kept, explicitly NOT a license to use solid gold
elsewhere. Do not raise its opacity.

**Cascade rule:** the `.t-*` classes live in `@layer components`; Tailwind utilities
(`text-3xl`, `text-paper`…) outrank them. Use `.t-*` **or** utilities on an element,
never both for the same property — utilities will silently win.

## 2. Type scale (Fraunces display · Instrument Sans body · IBM Plex Mono data)

| Class | Spec | Use |
|---|---|---|
| `.t-display` | `clamp(2.5rem→4.5rem)` serif 600, ls `-0.02em`, lh 1.04 | Hero / landing statements |
| `.t-h1` | `clamp(2rem→3.25rem)` | Page titles |
| `.t-h2` | `clamp(1.5rem→2.25rem)` | Section heads |
| `.t-h3` | `clamp(1.25rem→1.625rem)` | Sub-section / card heads |
| `.t-h4` | `1.125rem` | Minor heads |
| `.t-eyebrow` | mono 11px, uppercase, ls `.18em`, paper-dim | Section chrome / labels |
| `.t-data` | mono, `tabular-nums` | Scores, numbers, timestamps |
| `.t-caption` | 12.5px paper-dim | Captions / legal / footnotes |

Base rule already in place: all headings are Fraunces 600 (see globals.css `@layer base`).

## 3. Elevation & chrome

- `--shadow-panel` — resting surface (inset hairline + soft drop).
- `--shadow-float` — elevated elements (dock, modals, sticky bars).
- `.panel` — the standard raised surface: border `--line`, radius `--radius` (18px),
  subtle top-light gradient over `--dusk`, `--shadow-panel`.
- `.hud-chip` — mono uppercase pill (border `--line`, paper-dim), for status/index labels.
- `.hud-rule` — mono label centered on a hairline rule, for section dividers.

## 4. Texture (tactical, subtle)

- `.bg-blueprint` — evidence-tinted radial glow + paper-tinted 44px grid.
  Use as a decorative layer inside panels; never as the whole page background.
- `.noise` — fixed film-grain overlay (`opacity: .03`, `pointer-events: none`) mounted
  once in `layout.tsx`. Do not add a second instance.

## 5. Motion

- Eases: `--ease-out-expo` (entrances), `--ease-out-quart` (interactions).
- Durations: `--dur-fast 150ms` · `--dur-med 260ms` · `--dur-slow 520ms`.
- `prefers-reduced-motion: reduce` is handled globally (animations/transitions
  collapsed) — never ship a motion feature without checking it there.

## 6. Component recipes (Phase A standard)

- **Buttons** (`ui/button.tsx`): radius 10px, `default` = coral with a 1px lift on
  hover; `hud` variant = mono uppercase bordered surface for secondary ops actions.
- **Cards** (`ui/card.tsx`): radius `rounded-2xl` on the brand surface.
- **Header**: 2px coral top hairline (brand edge), nav links are mono uppercase
  11px (12px at `lg`) with an expanding underline on hover; sticky + blur.
  `CMSLink appearance="inline"` forwards `className` to the anchor, so
  `after:` underline utilities work on nav links.
- **CTA block** (admin-authored): `.panel` + `.bg-blueprint`, `▸ FIELD DIRECTIVE`
  eyebrow, mono footer strip (`COMMISSION-BLIND REVIEW OPS` / `18+ · PLAY RESPONSIBLY`).

## 7. Phase hooks (what B–F build on)

- **B (homepage/HUD):** `--ease-out-expo` entrances, `.t-display` hero, ProtocolScrub
  becomes a mono step readout (`.hud-chip` per step), reduce competing sections.
- **C (review page):** `.t-data` for every score, verdict box as a "mission brief"
  (`.panel` + eyebrow), sticky CTA as a HUD bar with `--shadow-float`.
- **D (Vex native):** dock stays bottom-right but read as part of the HUD language
  (`.hud-chip` statuses, mono labels), mission framing woven into CTAs.
- **E (motion):** standardize on the tokens above; scanline/radar accents only where
  they earn attention; always honor reduced-motion.
- **F (mobile/perf):** `.t-display` clamps at 2.5rem, 3D hero gets a lighter config,
  sticky CTA + dock collision resolution, 44px touch targets.
