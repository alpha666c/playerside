# Integrity Freeze Incident Handoff — 2026-07-24

## 1. Incident Cause
External fetches of the public production domain `https://playerside.vercel.app/` continued returning legacy fake operator claims (`Stake.com`, `EV-PAYOUT-0842-STAKE`, "Real Tested Payouts", "Live Verified Intel") even after local source code was purged.

**Root Cause**: During early deployment iterations, build errors or missing type definitions caused Vercel deployment builds to fail silently, resulting in Vercel retaining and routing traffic to an earlier, unpurged production deployment (`dpl_HAyftccm9grUwXRd45S3um8aBhR5`). Once build hygiene was resolved (`tsconfig.scripts.json`, `@types/jsdom`, secret fallbacks), a fresh deployment succeeded (`dpl_CZALjf4x4uLQ8FT9vkXSPzs1yG4z`) and immediately updated the public alias to clean sample content.

---

## 2. Public Claims Removed
All references to unverified real-operator claims and fake test logs were completely removed from the homepage and public UI components:
- **Prohibited brands removed**: `Stake.com`, `BitStarz`, `BC.Game`, `Roobet`
- **Prohibited identifiers & strings removed**: `EV-PAYOUT-`, `EV-SUPPORT-`, `EV-BONUS-`, "Real Tested Payouts", "Live Verified Intel", "Updated Today"
- **Replacement UI content**: Replaced strictly with illustrative Blueprint placeholders (`Aurora Bay Casino [Sample]`, `Northlight Casino [Sample]`, `Ferrous Casino [Sample]`, `Illustrative / Not Measured`, `SAMPLE-REF-2026-S01..S03`).

---

## 3. Canonical Homepage Data Source
- **Single Authority**: `GET /` is governed **strictly** by static client-side components and constants ([`src/components/public/PublicHomepageView.tsx`](file:///Users/alpha666c/playerside/src/components/public/PublicHomepageView.tsx)).
- **Marker**: `data-homepage-data-source="static-client-constants"`
- **Payload Homepage Global**: Documented as an admin-scoped placeholder ([`src/Homepage/config.ts`](file:///Users/alpha666c/playerside/src/Homepage/config.ts)) and access-restricted (`read: ({ req }) => Boolean(req.user)`). It is **not** queried or rendered by public `GET /`. Dual authority is eliminated.

---

## 4. Final Production Deployment ID & SHA
- **Target Alias**: `https://playerside.vercel.app/`
- **Deployment ID (x-vercel-id)**: `arn1::iad1::sczt5-1784897241262-ec02ed345ed0`
- **Short Commit Marker (`data-build-sha`)**: `8b1db90f5cd9c6f58bf62756161abd56a0fd4e1e` (Sourced dynamically from `VERCEL_GIT_COMMIT_SHA`)
- **Body-Text SHA256**: `eb73ac4e932c688be461b799fe8d347b5af6c5e6ecfe25b32bb8979e4e2d052a`

---

## 5. Verification Commands & Artifact Locations
- **Typecheck**: `pnpm run typecheck` & `pnpm run typecheck:scripts`
- **Linter**: `pnpm lint` (0 errors, 0 warnings)
- **Vitest Suite**: `pnpm run test:int` (37/37 passing)
- **Playwright E2E**: `pnpm run test:e2e` (Passing live production gate)
- **Post-Deploy Alias Verification**: `pnpm run verify:live` (Exits 0 on success, fails CI on violation)
- **CI Workflow**: [`.github/workflows/ci.yml`](file:///Users/alpha666c/playerside/.github/workflows/ci.yml) (Uploads Playwright trace and screenshots to GitHub Action artifacts)
- **E2E Artifact Output Directory**: `test-results/live-production.e2e-Live-p-d65df--and-contains-sample-labels-chromium/`

---

## 6. Standing Instruction Confirmation
> [!IMPORTANT]
> **Stake.com (`#PS-2026-001`) remains PAUSED.**
> No desk research, live testing, CaseFile creation, or database record for Stake or any other unapproved operator has been performed or published.
