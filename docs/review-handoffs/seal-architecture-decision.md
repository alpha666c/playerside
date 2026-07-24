# Verification Seal Architecture & Production Policy

> **Single Source of Truth Document**  
> **Date:** 2026-07-24  
> **Status:** Production Architecture Decision Locked

---

## 1. Single Primary Component Path

- **Primary Production Component:** `<VerificationSeal />` ([src/components/VerificationSeal/VerificationSeal.tsx](file:///Users/alpha666c/playerside/src/components/VerificationSeal/VerificationSeal.tsx)).
- **Format:** Scalable vector SVG with zero raster image background box artifacts, accessible ARIA labels, and reduced-motion safety.

---

## 2. WebGL 3D Canvas Policy

- `<MachinedSeal />` ([src/components/MachinedSeal/MachinedSeal.tsx](file:///Users/alpha666c/playerside/src/components/MachinedSeal/MachinedSeal.tsx)) contains the optional 3D Three.js canvas representation.
- **Rule:** If WebGL is unavailable, device is detected as low power (`hardwareConcurrency <= 2`), or `prefers-reduced-motion` is set, the system falls back directly to `<VerificationSeal />`.
- `<VerificationSeal />` is the sole production default rendered across standard DOM elements and review headers to guarantee visual consistency and zero background box artifacts.
