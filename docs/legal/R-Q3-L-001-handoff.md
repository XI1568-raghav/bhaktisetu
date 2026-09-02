# R-Q3-L-001 — DPDP User-Rights Audit Handoff

> **Roadmap item**: `docs/roadmap/items/Q3/legal/001-dpdp-user-rights-audit-dsar-endpoint-consent-log-3.md`
> **Category**: legal · **Priority**: P0 · **Est hours**: 24
> **Branch**: `legal/R-Q3-L-001-batch-2026-06-14`

## What shipped

### 1. DSAR endpoint (`apps/api/src/routes/dpdp.ts`)

| Method | Path                              | Role  | Purpose                                       |
| ------ | --------------------------------- | ----- | --------------------------------------------- |
| POST   | `/api/v1/dpdp/dsar`               | user  | File a DSAR (access / erasure / rectify / portability) |
| GET    | `/api/v1/dpdp/dsar/mine`          | user  | List caller's own DSARs                       |
| GET    | `/api/v1/dpdp/admin/dsar`         | admin | Ops dashboard, SLA-breached float to top      |
| PATCH  | `/api/v1/dpdp/admin/dsar/:id`     | admin | Resolve / reject a DSAR                       |

### 2. Consent log (`apps/api/src/routes/dpdp.ts`)

| Method | Path                              | Role | Purpose                                            |
| ------ | --------------------------------- | ---- | -------------------------------------------------- |
| POST   | `/api/v1/dpdp/consent`            | user | Append a granted/withdrawn event for a purpose     |
| GET    | `/api/v1/dpdp/consent/mine`       | user | Latest-per-purpose state collapsed for the caller  |

Append-only; latest row per `(user_id, purpose)` wins. IP + user-agent
captured at write time as evidence of consent.

### 3. 30-day SLA

`dsar_requests.sla_deadline = created_at + 30 days`. Hardcoded as
`DSAR_SLA_DAYS = 30` in `apps/api/src/routes/dpdp.ts`. Admin LIST
exposes `sla_breached` boolean per row when `now() > sla_deadline AND
resolved_at IS NULL` so ops can triage.

### 4. Schema (`apps/api/src/lib/ensure-schema.ts`)

Two tables + 4 indexes + 2 FKs, all idempotent (boot-time DDL replay,
self-heals on Render reboot since `prisma migrate deploy` is skipped):

- `consent_log` (`id, user_id, purpose, action, source, ip_address, user_agent, created_at`)
- `dsar_requests` (`id, user_id, kind, status, note, sla_deadline, resolved_at, resolution_note, created_at`)

## Founder action required — counsel sign-off

This ships the **operational** half. The legal half — counsel sign-off
on the published 30-day SLA, the privacy policy update referencing
this DSAR pipeline, and the consent-purpose list — is outside agent
scope. Steps:

1. Email outside counsel the published surface above + the SLA
   commitment (30 days).
2. Counsel reviews the 7 consent purposes against the privacy policy
   and asks for changes if any (add `cookies_essential` carve-out,
   tighten `data_sharing_partner` definition, etc.).
3. On counsel approval, paste signed memo URL (Drive / Notion / email
   thread permalink) below this section.
4. Flip the roadmap item `status: shipped` after URL is pasted.

**Counsel sign-off URL**: _PENDING — founder paste here_

## Smoke verify after deploy

```bash
# 401 (auth required) — confirms route is mounted
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://api.darshya.online/api/v1/dpdp/dsar \
  -H 'content-type: application/json' \
  -d '{"kind":"access"}'

# 401 — admin-gated
curl -s -o /dev/null -w "%{http_code}\n" \
  https://api.darshya.online/api/v1/dpdp/admin/dsar

# 401 — consent log
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://api.darshya.online/api/v1/dpdp/consent \
  -H 'content-type: application/json' \
  -d '{"purpose":"analytics","action":"granted"}'
```

All three should return 401, proving the routes are live and the
auth preHandler is firing. Replace with a real bearer token to
exercise the happy paths.

## Tests

`apps/api/src/routes/dpdp.test.ts` — 19 vitest cases covering all 4
Zod schemas + 2 enums. Pure schema, runs in <20ms.

## Free-tier impact

- CF Pages builds: 0 (api-only diff, gets `[skip ci]`).
- Render builds: 0 unless someone dispatches one. `render.yaml` carries
  `autoDeploy: false` for both services (`:28` API, `:60` web), so merging
  this work ships nothing by itself; a deploy is an explicit
  `render-diag.yml -f mode=deploy` dispatch and bills against Render free
  instance-hours, not a build count.
- Supabase: 2 new tables, ~negligible storage for the launch window.
- Anthropic / GH Actions: 0.

## Open follow-ups (not blockers)

1. Wire a public DSAR form on the web (`apps/web/app/privacy/dsar/page.tsx`)
   so users without API tokens can file via cookie-auth + the existing
   web POST helper.
2. Admin dashboard surface for `consent_log` aggregate (counts per
   purpose / withdrawal rate over time).
3. Nightly cron that pages ops on `sla_breached = true` rows so the
   30-day SLA is enforced even if the dashboard is unread.
