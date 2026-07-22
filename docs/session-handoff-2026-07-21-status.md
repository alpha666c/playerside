# Session handoff — 2026-07-21 status

Fable 5 ran out of credit mid-session. This is a read-only wrap-up inventory of what's uncommitted, whether the code health is sound, and what the next session should do first.

## Git state

```
On branch main, up to date with origin/main
```

**Latest commit:** `3f9abe1` — "The Blind: signature Pressure Test, hero intake artifact, evidence-archive homepage"

**Modified (uncommitted):**
- `src/migrations/index.ts` — registers the new migration `20260721_162047_add_reviews_and_bonuses`
- `src/payload-types.ts` — updated with generated types for the new collections
- `src/payload.config.ts` — imports and registers 4 new collections (Traditional/CryptoCasinoReviews, Wagering/NoWageringBonuses)

**Untracked files/directories (20 total):**

| Item | Description |
|------|-------------|
| `.claude/` | Claude Code worktree session files (transient, can be ignored) |
| `src/app/(frontend)/casinos/` | Routes for Traditional casino review pages: `/casinos` listing and `/casinos/[slug]` detail |
| `src/app/(frontend)/crypto-casinos/` | Routes for Crypto casino review pages: `/crypto-casinos` listing and `/crypto-casinos/[slug]` detail |
| `src/app/(frontend)/bonuses/` | Routes for bonus pages: `/bonuses/wagering/*` and `/bonuses/no-wagering/*` |
| `src/app/(frontend)/reviews/` | Aggregate reviews listing page combining both casino types |
| `src/collections/TraditionalCasinoReviews/` | Payload collection for licensed Traditional casinos (NL/SE/DE/UK only); separate slug, enforces compliance group fields, scores/rubric integration |
| `src/collections/CryptoCasinoReviews/` | Payload collection for global/offshore crypto casinos; separate slug, enforces crypto-specific compliance (notLicensedInRegulatedMarkets checkbox) |
| `src/collections/WageringBonuses/` | Payload collection for deposit bonuses with wagering requirement; requires exact multiplier, applies-to, time limit, contributing games |
| `src/collections/NoWageringBonuses/` | Payload collection for wager-free bonuses; requires exact amount, withdrawal conditions |
| `src/collections/shared/` | Shared field factories: `reviewFields.ts` (scoreFields, computeOverallScore, reviewCoreFields) and `bonusFields.ts` |
| `src/rubrics/traditional.ts` | Grading rubric constants for Traditional casinos: 9 categories (Withdrawals, Promotions, Support, Licensing, KYC, Game Variety, Live Casino, Deposits, Community Sentiment) with weights |
| `src/rubrics/crypto.ts` | Grading rubric constants for Crypto casinos |
| `src/components/CategoryMarker/` | Visual category indicator (Traditional: blue/evidence, Crypto: coral-dim); required per brand-spec §3.4 |
| `src/components/ComplianceBlock/` | React component for rendering compliance info: age notice, license, self-exclusion links (Traditional), provably-fair info (Crypto), affiliate-commission disclosure |
| `src/components/IllustrativeBanner/` | Banner component for illustrative sample reviews |
| `src/components/ReviewListingCard/` | Card component for displaying casino reviews in listings |
| `src/components/ScoreBreakdown/` | Component showing category-by-category score breakdown |
| `src/components/BonusListingCard/` | Card component for displaying bonuses in listings |
| `src/migrations/20260721_162047_add_reviews_and_bonuses.ts` | Postgres migration creating all schema for the four collections (tables, enums, foreign keys, versions tables) |
| `src/migrations/20260721_162047_add_reviews_and_bonuses.json` | Payload-generated migration manifest |

## What docs/design-handoff.md covers (and doesn't)

The existing `docs/design-handoff.md` documents the homepage design work only ("The Blind" Pressure Test, Hero, Wall section, Pressure Test mechanism, motion system, E2E test results). It covers 7 affected/new components and the CSS grammar system.

**It does NOT cover:**
- The four new Payload collections (Traditional/Crypto casino reviews, Wagering/No-wagering bonuses)
- The rubric system or scoring logic
- The ComplianceBlock component or compliance field structure
- The CategoryMarker or other content-type-specific UI components
- The new routes (`/casinos/*`, `/crypto-casinos/*`, `/bonuses/*`)
- The migration (structure, tables, enums)

This is intentional separation of concerns (design vs. content/CMS architecture), but it means the collections work is undocumented. No review checklist exists for whether the collection structure matches ORG.md requirements.

## Build status

**FAILS** — expected and non-blocking.

```
Error: Failed query: select "id", "slug" from "no_wagering_bonuses"...
[cause]: error: relation "no_wagering_bonuses" does not exist
```

The build attempts to query the database during page collection (to populate static `/bonuses/no-wagering/[slug]` and similar routes). The tables don't exist yet because the migration hasn't been run. The code is sound; the database is simply not yet provisioned.

## Migration status

**Migration exists, is registered, and is NOT yet applied.**

- Migration file: `src/migrations/20260721_162047_add_reviews_and_bonuses.ts` (262 lines, creates 4 tables + versions tables + enums)
- Registration: `src/migrations/index.ts` imports and registers it as the third migration in the list
- Database state: Tables do not exist; build fails when it tries to query them

**Next session must run the migration before building.** The `.env` file already contains `DATABASE_URL` and `PAYLOAD_SECRET` (pointing to Supabase).

## Structural rule spot-checks

### Rule 1: TraditionalCasinoReviews and CryptoCasinoReviews must be separate collections, not one type with a category flag

**Status: PASS** ✓

- TraditionalCasinoReviews: slug `'traditional-casino-reviews'`, dbName `'trad_casino_reviews'`, routes `/casinos/*`
- CryptoCasinoReviews: slug `'crypto-casino-reviews'`, routes `/crypto-casinos/*`
- Each has its own fields (Traditional includes `markets` select; Crypto includes `notLicensedInRegulatedMarkets` checkbox validation)
- No shared listing or category flag between them
- Both enforce separate rubrics (traditional vs. crypto)

### Rule 2: Compliance fields must be a hard save/publish block at the data/API layer, not just a presentational form nicety

**Status: CAUTION — needs verification**

- ComplianceBlock component is purely presentational (React component rendering HTML; no validation)
- Compliance fields exist in both collections as a required `group` (licenseNumber, licenseAuthority, markets for Traditional; licenseNumber, licenseAuthority, notLicensedInRegulatedMarkets for Crypto)
- `required: true` on the fields means Payload will prevent save if missing
- **However:** No explicit `beforeValidate` or `beforeChange` hook found that enforces "cannot publish without compliance" — only `required: true` on the fields themselves
- Comments in the collection code say "publishing runs full validation", but the actual validation hook in the code only computes scores (`computeOverallScore`), not compliance gates
- **Finding:** Compliance fields are required for save, but it's unclear whether they are *also* enforced as a publish gate. This should be verified before the next session goes live.

### Rule 3: Commission/deal-rate data must never be reachable from grading/content code

**Status: PASS** ✓

`grep -ril "commission\|cpa\|revshare\|reveal.*deal\|deal.*rate"` found mentions only in:
- Comments (reviewFields.ts, collection index files) saying "must never contain commission fields"
- Rubric comments saying the same
- ComplianceBlock's rendered affiliate-commission disclosure text (read-only UI, no data field)
- Homepage component copy ("The Wall" section mentions the commission-blind concept)

**No commission/deal-rate fields exist in any collection, rubric, or scoring code.**

## What the next session should do first

1. **Read and review** `src/migrations/20260721_162047_add_reviews_and_bonuses.ts` to confirm the schema is correct before applying it to the live Supabase project.

2. **Run the migration** (via `npm run payload -- migrate` or Payload admin) to create the tables. This must happen before any build or dev-server start.

3. **Verify compliance publish gate** — check whether Payload's native `required: true` field validation is sufficient, or whether an explicit `beforeValidate` hook is needed to prevent publishing a review without all compliance fields. Currently ambiguous; comments suggest full validation on publish, but code only shows score computation.

4. **Review the untracked collections and components** before committing — verify they follow the ORG.md structural rules (already spot-checked above, but a full read is warranted for business compliance).

5. **Determine whether to document the collections work** — currently only homepage design is documented in `docs/design-handoff.md`. Consider whether a separate `docs/collections-architecture.md` or similar is needed for the next session's reference.

6. **Run build after migration** — the build should pass once tables exist. Check for any other issues.

## Notes for next session

- The `.env` file exists and is ready (DATABASE_URL, PAYLOAD_SECRET).
- No code has been edited since the last commit; all work is addition-only (new collections, routes, components, migration).
- Playwright e2e tests in the existing suite passed locally; new test coverage for the collections may be needed.
- The existing `npm run lint` failure (eslint circular JSON issue) is pre-existing and unrelated to this work.
<!-- Playerside planning documentation sync initiated 2026-07-22 -->
