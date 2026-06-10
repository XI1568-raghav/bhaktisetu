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
3. If 5xx persistent → Render dashboard → API service → recent deploys → roll back to last green.
4. If timeout → DNS check: `dig api.darshya.online`. Cloudflare DNS issue → CF dashboard.

### `www-root` fires

1. `curl -fsSI https://darshya.online` from laptop. If 200 → CF edge regional issue, probably transient.
2. If 522/523 → Cloudflare can't reach origin. Origin = CF Pages itself, so check CF Pages dashboard → last deploy log.
3. If 525/526 → SSL handshake fail. CF dashboard → SSL → check cert status.

### `www-pujas` fires but `www-root` passes

Page-specific failure (SSG broke or dynamic route 500). Recent deploys to `apps/web/app/pujas/**` → roll back.

### Multiple monitors fire simultaneously

Likely platform-wide. Order of likelihood:
1. Cloudflare (CF Pages + DNS both routed via CF) — check https://www.cloudflarestatus.com
2. Render (API only) — check https://status.render.com
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
