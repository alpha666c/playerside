# Integrity Freeze Incident Handoff — 2026-07-24

## 1. Incident Cause & Propagation Delay
External requests to the public production domain `https://playerside.vercel.app/` temporarily returned legacy unpurged claims (`Stake.com`, `EV-PAYOUT-0842-STAKE`, "Real Tested Payouts", "Live Verified Intel") during deployment propagation windows.

**Root Cause**: In early iterations, build errors (such as missing type definitions for `@types/jsdom` and strict schema constraints) caused Vercel deployment builds to fail silently, resulting in Vercel edge routing retaining an earlier, unpurged production deployment (`dpl_HAyftccm9grUwXRd45S3um8aBhR5`). Once build hygiene was resolved (`tsconfig.scripts.json`, `@types/jsdom`, secret fallbacks), fresh builds succeeded (`dpl_4ombYfbLEjUhJjssvFjArUabApfe`) and updated the live alias.

---

## 2. Closure Commit & Production Deployment
- **Full Closure Commit SHA**: `c8bbffccd9bd1494c86770c0367a0f83eb1d5b5e` (`c8bbffc`)
- **Active Vercel Production Deployment ID**: `dpl_4ombYfbLEjUhJjssvFjArUabApfe`
- **Target URL**: `https://playerside.vercel.app/`

---

## 3. Public Alias Production Evidence
- **Raw HTML Response Body SHA256**: `a942a6fb36bf86289edcb8fb1dc8db7bebb3c00494fbcfebfddca493bafc748c`
- **Build Marker (`data-build-sha`)**: `c8bbffc` (Matches `git rev-parse --short HEAD`)
- **Data Source Marker (`data-homepage-data-source`)**: `static-client-constants`
- **Banned-String Search Result**: `0` matches (`Stake.com`, `BitStarz`, `BC.Game`, `Roobet`, `EV-PAYOUT-`, `EV-SUPPORT-`, `EV-BONUS-`, `Real Tested Payouts`, `Live Verified Intel`, `Updated Today`)
- **Sample-Marker Search Result**: `5` matches (`Aurora Bay`, `[Sample]`, `Illustrative`, `Not Measured`, `SAMPLE-REF`)
- **Relevant Edge Headers**:
  - `x-vercel-id`: `arn1::iad1::qwtzj-1784898641942-bcf8281470bf`
  - `x-vercel-cache`: `MISS`
  - `x-matched-path`: `/`

---

## 4. Canonical Homepage Source Definition
- **Single Authority**: `GET /` is governed **strictly** by static client-side components and constants ([`src/components/public/PublicHomepageView.tsx`](file:///Users/alpha666c/playerside/src/components/public/PublicHomepageView.tsx)).
- **Payload Homepage Global**: Documented as an admin-scoped placeholder ([`src/Homepage/config.ts`](file:///Users/alpha666c/playerside/src/Homepage/config.ts)) with read access restricted (`read: ({ req }) => Boolean(req.user)`). It is **not** queried or rendered by public `GET /`. Dual authority is eliminated.

---

## 5. Verification Commands & Release Checklist
- **Typecheck**: `pnpm run typecheck` & `pnpm run typecheck:scripts`
- **Linter**: `pnpm lint` (0 errors, 0 warnings)
- **Vitest Suite**: `pnpm run test:int` (37/37 passing)
- **Post-Deploy Alias Verification**: `pnpm run verify:live` (Asserts SHA match, zero banned strings, sample presence, and records body SHA256)

---

## 6. Standing Instruction Confirmation
> [!IMPORTANT]
> **Stake.com (`#PS-2026-001`) remains PAUSED.**
> No desk research, live testing, CaseFile creation, or database record for Stake or any other unapproved operator has been performed or published.
