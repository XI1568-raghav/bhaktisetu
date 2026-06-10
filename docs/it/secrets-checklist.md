# Secrets + Env Vars Checklist

> Owner: Founder + IT. Single source-of-truth for which secrets exist where, who reads them, how to rotate. Source ref: `apps/api/src/middlewares/cron-auth.ts`, `docs/operational-context.md`, related runbooks.
>
> NEVER commit secret VALUES here. Names + locations + generation commands only.

## Active secrets

| Name | GH secret | Render env | File ref | Generate | Status |
|---|---|---|---|---|---|
| `CRON_AUTH_TOKEN` | ✓ | ✓ | `apps/api/src/middlewares/cron-auth.ts` L46 (readEnvToken) | `openssl rand -hex 24` | **R-Q1-IT-002: founder paste pending** |
| `ORCHESTRATOR_TRIGGER_SECRET` | ✓ | ✓ | `apps/api/src/routes/admin-roadmap-orchestrator.ts` L32 (verifySecret) | `openssl rand -hex 32` | **O2-6: founder paste pending** |
| `GH_ORCHESTRATOR_PAT` | — | ✓ | `scripts/agents/run-orchestrator-bg.mjs` L15 | https://github.com/settings/personal-access-tokens/new (Contents: R/W on bhaktisetu) | **O2-6: founder paste pending** |
| `RENDER_API_URL` | ✓ | — | `.github/workflows/roadmap-loop.yml` L43 | constant `https://api.darshya.online` | **O2-6: founder paste pending** |
| `ANTHROPIC_API_KEY_BLACKBOX_PROXY` | ✓ | ✓ (as `ANTHROPIC_API_KEY`) | `scripts/agents/roadmap/_anthropic-client.mjs` L22 | Blackbox dashboard | live |
| `ANTHROPIC_BASE_URL` | ✓ | ✓ | same | Blackbox dashboard | live |
| `SUPABASE_DIRECT_URL` | ✓ | ✓ (as `DATABASE_URL`) | `apps/api/src/lib/prisma.ts` | Supabase project settings | live; **rotate per U10** |
| `DATABASE_URL_READONLY` | ✓ | ✓ | `scripts/agents/roadmap/_kpi-supabase.mjs` | `docs/roadmap/setup/supabase-readonly-role.sql` | live |
| `POSTHOG_PERSONAL_API_KEY` | ✓ | ✓ | `scripts/agents/roadmap/_kpi-posthog.mjs` | PostHog → Personal API Keys | live |
| `POSTHOG_PROJECT_ID` | ✓ | ✓ | same | PostHog → Project Settings | live |
| `RENDER_API_KEY` | ✓ | ✓ | `scripts/agents/roadmap/_kpi-render.mjs` | Render → Account → API Keys | live |
| `CF_ANALYTICS_TOKEN` | ✓ | ✓ | `scripts/agents/roadmap/_kpi-cloudflare.mjs` | Cloudflare → My Profile → API Tokens | live |
| `RESEND_API_KEY` | ✓ | ✓ | `apps/api/src/lib/resend.ts` | Resend dashboard | **LEAKED 2026-05-13 — rotate per U12** |
| `INDEXNOW_KEY` | ✓ | — | `scripts/agents/gsc-submitter.mjs` | self-issued in repo at `apps/web/public/<key>.txt` | live |
| `SENTRY_DSN` | — | pending | `apps/api/src/lib/sentry.ts` | Sentry project settings | **U6 founder paste pending** |
| `NEXT_PUBLIC_POSTHOG_KEY` | — | CF Pages env | `apps/web/lib/posthog.ts` | PostHog → Project Settings → API Key (writable, public) | **U8 founder paste pending** |

## R-Q1-IT-002 CRON_AUTH_TOKEN — founder steps (2min)

After PR `b64dde9+` merges:

1. **Generate value** (your laptop):
   ```bash
   openssl rand -hex 24
   # Copy 48-hex output
   ```

2. **GH secret** — https://github.com/XI1568-raghav/bhaktisetu/settings/secrets/actions
   - New repository secret → Name: `CRON_AUTH_TOKEN` → Value: paste

3. **Render env** — https://dashboard.render.com → API service → Environment
   - Add Environment Variable → Key: `CRON_AUTH_TOKEN` → Value: **same** value as Step 2
   - Save → wait ~2min for redeploy

4. **Verify** (your laptop):
   ```bash
   # Should be 401 (no token)
   curl -i -X POST https://api.darshya.online/api/v1/cron/daily 2>&1 | head -3

   # Should be 401 (wrong token, body 'cron_unauthorized')
   curl -i -X POST -H "Authorization: Bearer wrong" https://api.darshya.online/api/v1/cron/daily 2>&1 | head -10

   # Trigger real workflow
   gh workflow run daily-cron.yml
   gh run watch
   # Expect green tick
   ```

5. **Bump KPI** — edit `docs/roadmap/_manual-kpis.yml`:
   ```yaml
   cron_auth_token_set: 1
   ```

## Rotation cadence

| Secret | Cadence | Trigger |
|---|---|---|
| `CRON_AUTH_TOKEN` | 12 months | calendar reminder |
| `ORCHESTRATOR_TRIGGER_SECRET` | 12 months | calendar reminder |
| `GH_ORCHESTRATOR_PAT` | 12 months | PAT auto-expires (regen 14 days before expiry) |
| `RESEND_API_KEY` | immediate | already overdue per U12 |
| `SUPABASE_DIRECT_URL` (password) | immediate | already overdue per U10 |
| Anthropic/PostHog/Render/CF tokens | 12 months | calendar |
| `NEXT_PUBLIC_*` (browser-visible) | 24 months | only on compromise |

## Process for adding a new secret

1. Generate value LOCALLY (never paste into chat, repo, or external service)
2. Add to GH secrets + Render env (if both layers need it)
3. Add row to this table — name + locations + file ref + generation command
4. Reference in `docs/operational-context.md` if user-facing
5. Add rotation cadence row above
6. Commit this file change with `[skip ci]`

## Never-do list

- NEVER `echo` a secret in a code path (logs leak)
- NEVER paste actual values in this doc, in commit messages, in chat
- NEVER skip the timing-safe compare for token checks (use `crypto.timingSafeEqual`)
- NEVER set `ALLOW_DEMO_TOKENS=true` in prod outside of explicit gate U15
