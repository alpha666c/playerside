# Provenance — no-ai-slop skill

- **Source:** https://github.com/petergyang/no-ai-slop
- **License:** MIT (Copyright (c) 2026 Peter Yang) — full text in `LICENSE`
- **Pinned commit:** `d30eddb9e04562234f2070b5ee63ca4649d9a05e`
- **Vendored:** 2026-08-11 (Phase I1)
- **Vendored files:** `SKILL.md`, `eval.md` (from `skills/no-ai-slop/`), `LICENSE`, this provenance note.
  Build artifacts (`scripts/`, `.github/`, `agents/openai.yaml`, assets) intentionally omitted.
- **Use in Playerside:** agent-level editorial guidance for review copy. The deterministic
  enforcement lives in `src/lib/slopGate.ts` — its pattern list is derived from this `SKILL.md`
  (the single source); the sync point is documented there.
- **Re-vendoring:** pin a new commit SHA here when upgrading.
