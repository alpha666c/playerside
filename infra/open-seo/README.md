# OpenSEO on the VPS (Phase I2)

Self-hosted [OpenSEO](https://github.com/every-app/open-seo) (MIT, by every-app)
gives the Cofounder's `seo_lookup` tool real keyword / rank / audit data via
BYOK [DataForSEO](https://dataforseo.com) — no $100+/mo Semrush bill.

## Why not Vercel
open-seo is a long-running service (Cloudflare worker + D1 store + webhooks +
cron) — it is **not** Vercel-deployable. It runs in Docker on the VPS, bound to
loopback only, behind your existing Caddy/Cloudflare-Tunnel auth.

## What the playerside app expects

Set these in the admin at `/admin/globals/system-settings` (DB-backed, every
host reads the same values — env vars below override when set):

| Setting (SystemSettings)   | Env override           | Purpose                                                        |
| -------------------------- | ---------------------- | -------------------------------------------------------------- |
| `openSeoUrl`               | `OPENSEO_URL`          | Base URL of the instance, e.g. `https://seo.internal.yourvps`  |
| `openSeoProjectId`         | `OPENSEO_PROJECT_ID`   | open-seo project id (research/rank tools are project-scoped)   |
| `dataForSeoApiKey`         | `DATAFORSEO_API_KEY`   | DataForSEO key — base64 `email:password` (api-access page)     |
| `seoRowCapPerDay`          | `SEO_ROW_CAP_PER_DAY`  | Daily billable-row budget (default 500; 0 disables)            |

The DataForSEO key never enters the repo: it lives in the DB (admin-only
global) and/or the VPS host env — `infra/open-seo/docker-compose.open-seo.yml`
forwards it from the host `.env`.

## VPS deploy steps

1. Copy the compose file to the VPS and fetch open-seo's `.env.example`:
   ```bash
   scp infra/open-seo/docker-compose.open-seo.yml vps:/srv/open-seo/
   cd /srv/open-seo && curl -O https://raw.githubusercontent.com/every-app/open-seo/main/.env.example
   cp .env.example .env && nano .env   # fill DATAFORSEO_API_KEY, AUTH secrets
   ```
2. Start and pin the image:
   ```bash
   docker compose -f docker-compose.open-seo.yml up -d
   docker inspect ghcr.io/every-app/open-seo --format '{{.RepoDigests}}'   # → pin digest in OPEN_SEO_IMAGE
   ```
3. Put auth in front. Recommended: `AUTH_MODE=cloudflare_access` with
   `TEAM_DOMAIN` + `POLICY_AUD` (Cloudflare Access). Alternative
   `AUTH_MODE=local_noauth` (no password at all) must stay on loopback behind
   Caddy basic-auth or a tunnel — never exposed publicly.
4. Create a project in the open-seo UI and note its id → `openSeoProjectId`.
5. Verify: `curl https://seo.internal.yourvps/health` (behind auth) and a
   Cofounder turn calling `seo_lookup` in the admin panel.

## Threat notes (I2 containment)

- **Injection:** SERP titles/snippets are untrusted. The client HTML-strips +
  char-caps them and wraps the result in `<untrusted_data>`; the Cofounder
  system prompt forbids treating result content as instructions or evidence.
- **Spend:** DataForSEO bills **per row**, not per call. Caps: ≤ 3 lookups /
  turn (ToolContext), `limit ≤ 50` per call, daily row budget via `seo_call`
  audit events. Worst-case ≈ 500 rows/day × ~$0.0005 ≈ **$0.25/day**.
- **Read-only:** only `research_keywords`, `get_ranked_keywords`,
  `get_audit_issues` are ever called — never the write tools.
- **No secrets in repo:** keys are DB/env-only; `.env.example` holds placeholders.
