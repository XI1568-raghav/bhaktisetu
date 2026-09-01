# UptimeRobot Monitor Runbook

Owner: Founder (IT lane). Service: https://uptimerobot.com (free tier, 50 monitors, 5min interval).

> Setup steps live in [uptime-setup-checklist.md](./uptime-setup-checklist.md). This file is the **runbook**: monitor IDs, escalation policy, alert response playbook.

## Why this exists

Sentry → email is the only paging wire today. If `api.darshya.online` returns 500 for an hour at 2am, founder finds out from a user complaint, not a page. UptimeRobot adds an independent HTTP/HTTPS prober + SMS escalation outside the AWS/Render/CF blast radius — if Render goes dark, UptimeRobot still reaches founder phone.

KPI tracked: `uptime_monitors_active` in `_manual-kpis.yml`. Target = 4 (one per monitor below).

## Monitor inventory (placeholders — founder fills after Step 5 of checklist)

| # | Name | Type | URL | Interval | Pass condition | Monitor ID |
|---|---|---|---|---|---|---|
| 1 | api-health | HTTPS | https://api.darshya.online/health | 5min | HTTP 200 | `<PASTE_AFTER_SETUP>` |
| 2 | www-root | HTTPS | https://darshya.online | 5min | HTTP 200 | `<PASTE_AFTER_SETUP>` |
| 3 | www-pujas | HTTPS | https://darshya.online/pujas | 5min | HTTP 200 | `<PASTE_AFTER_SETUP>` |
| 4 | api-health-keyword | Keyword | https://api.darshya.online/health | 5min | body contains `"ok"` | `<PASTE_AFTER_SETUP>` |

Public status page URL: `<PASTE_AFTER_SETUP>` (placeholder — also paste into `docs/operational-context.md`).

## Escalation Policy

| Trigger | Action |
|---|---|
| 1 failed check (5min down) | Email to founder inbox (always) |
| 3 consecutive failures (15min down) | SMS to founder phone |
| 6 consecutive failures (30min down) | SMS + repeat every 30min until acked |
| All checks pass after failure | "RESOLVED" email |

Founder phone: kept in UptimeRobot SMS contacts (not committed here). Verify SMS still routes after every SIM/MNP change.

## Alert response playbook

### `api-health` or `api-health-keyword` fires

1. `curl -fsS https://api.darshya.online/health` from laptop. If 200 + `"ok"` → false positive, check UptimeRobot status page (their probe may be down).
2. If 502/503/504 → Render free-tier cold start. Wait 60s, re-curl. If still down → escalate Render.
3. If 5xx persistent → roll back to the last green commit. **The Render dashboard is not the
   documented lever** (agents and CI have no dashboard access, and a push/revert deploys nothing —
   `autoDeploy: false`):
   ```bash
   gh workflow run render-diag.yml -f mode=deploys -f sid=srv-d7mc2n8sfn5c73dfce0g   # list deploys
   gh workflow run render-diag.yml -f mode=deploy  -f sid=srv-d7mc2n8sfn5c73dfce0g -f commit=<SHA>
   ```
   Full procedure: `docs/runbooks/prod-rollback.md`.
4. If timeout → DNS check: `dig api.darshya.online`. Cloudflare DNS issue → CF dashboard.

### `www-root` fires

1. `curl -fsSI https://darshya.online` from laptop. If 200 → CF edge regional issue, probably transient.
2. If 522/523 → Cloudflare can't reach origin. **Origin is the Render service `darshya-web`
   (`srv-d970l2ks728c738fc33g`, `https://darshya-web.onrender.com`), NOT Cloudflare Pages** —
   corrected 2026-09-01 (`OPS-06`/`OPS-10`); this step used to send you to a CF Pages dashboard
   that has had no build pipeline since 2026-07-08. Curl the Render URL directly to separate an
   origin outage from a CF edge one:
   `curl -fsSI https://darshya-web.onrender.com`. A 200 there with a 522 at the edge is a
   Cloudflare problem; a failure at both is the Render service (cold start, crash, or the
   free-tier suspension case in `docs/runbooks/prod-rollback.md` §5).
3. If 525/526 → SSL handshake fail. CF dashboard → SSL → check cert status.

### `www-pujas` fires but `www-root` passes

Page-specific failure (SSG broke or dynamic route 500). Find the recent deploys touching
`apps/web/app/pujas/**` and roll the web service back to the last green commit:
`gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g -f commit=<SHA>`.

### Multiple monitors fire simultaneously

Likely platform-wide. Order of likelihood:
1. Render (**both** the API `bhaktisetu` and the web `darshya-web` — since the 2026-07-08 cutover
   Render is the origin for everything) — check https://status.render.com, and check the Render
   account is not suspended (see `docs/runbooks/prod-rollback.md` §5; a billing suspension took
   both services down for three days and looks exactly like a platform outage)
2. Cloudflare (DNS + edge proxy only — no build pipeline since 2026-07-08) — check https://www.cloudflarestatus.com
3. Supabase (auth + DB) — check https://status.supabase.com
4. Internet (founder's ISP) — verify via mobile data

## Rotation + ownership

Until first hire: founder owns 100%. Post-hire: add second SMS contact (CTO or ops lead) so single-point-of-failure ends. UptimeRobot free tier supports unlimited SMS contacts but charges per SMS (5 free/month → upgrade or use email-only escalation if exceeded).

## Cost accounting

| Item | Cost |
|---|---|
| UptimeRobot free tier | $0 |
| 4 monitors × 5min × 30 days | 8640 checks/mo (well under any limit) |
| Free SMS | 5/mo (sufficient if uptime > 99.5%) |
| Status page | $0 (public, hosted by UptimeRobot) |

If SMS exceeds 5/mo → either fix the underlying flake OR upgrade to UptimeRobot Pro ($7/mo for 100 SMS).

## Related

- Setup steps: [uptime-setup-checklist.md](./uptime-setup-checklist.md)
- Founder secret/account inventory: [../operational-context.md](../operational-context.md)
- All KPIs: [../roadmap/_manual-kpis.yml](../roadmap/_manual-kpis.yml)

Closes: Q-C20260610T1617-IT-001
