# IT Advisory — 2026-W31

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 8
- Planned: 0
- In progress: 3
- Shipped: 5
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q1-E-014 blocked by U6: Sentry MCP + Postgres MCP env-var setup
- R-Q1-IT-003 blocked by U6: Sentry DSN setup (CF Pages + Render)
- R-Q1-IT-005 blocked by U12: Rotate leaked Resend API key + update Render env

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 09-it.md)
```
# 09 — Head of IT / SRE

> Author: Head of IT (acting). Date: 2026-04-27. Audience: founder + CTO.
> Frame: $0 budget, single-operator on-call, free tiers everywhere.

## 1. Today's incident-response capability — true state

**Alert paths**: Sentry → email (default project notification) → founder inbox. That is the only wire. There is no PagerDuty, no Slack webhook, no SMS, no second pair of eyes. PostHog and Cloudflare Web Analytics are dashboards — they do not page anyone. Render's "deploy failed" mail goes to the owner email. Supabase outages surface only when the API starts 500-ing and Sentry catches the exception (`server.setErrorHandler` in `apps/api/src/server.ts:133` forwards to `captureException`).

**On-call rotation**: founder, only, 24/7, untracked. No backup, no escalation. If founder's phone is on silent during a 02:00 outage, the site is down until morning.

**Runbook freshness**: there is no runbook. `docs/launch-state.md` is a status board, not a procedure. `docs/security-pass-2026-04-27.md` is an audit, not a playbook. The closest thing to "what do I do when X breaks" is the env-var contract in `docs/env-vars.md` (read it — it answers half the "is the integration down or off?" questions).

**Honest score: 3 / 10.** We capture errors (good), we route them to a human (good), the human is the only human (bad), the human has no playbook (bad), and we cannot detect a hard down — Sentry only sees the API's own errors, not "the API is unreachable." A 6 needs uptime monitoring + a one-page runbook + a documented backup pager (a friend, a partner — anyone). A 9 needs a real rotation, which we do not have headcount for.

## 2. Free observability stack — what we have, what's missing

| Layer | Tool | Free-tier cap | Status |
|---|---|---|---|
| Errors (server) | Sentry | 5K events/mo | live, DSN configured (sample rate 0.05 traces — see `lib/sentry.ts:18`) |
| Errors (client) | Sentry browser | shared 5K cap | live |
| Product analytics | PostHog | 1M events/mo | live |
| Web analytics | Cloudflare Web Analytics | unlimited, free, beacon auto-injected via orange-cloud proxy | live |
| Logs | Render dashboard | rolling, ~retained on free plan, no search | live but ephemeral — no log archival |
| Performance traces | Sentry traces | 5K traces (5% sample) | live, will not survive a viral day |

**The missing piece: uptime monitoring.** Nothing today pings `https://api.darshya.online/health` or `https://darshya.online`. If Render's free-tier hibernation hangs the cold start, or DNS breaks, or the cert expires, we learn from a user complaint.

**Recommendation: UptimeRobot free.** 50 monitors, 5-minute interval, email + push alerts, public status page, multi-region checks. Free with no card on file. (BetterStack/BetterUptime free tier is 10 monitors, 3-min interval — tighter polling but fewer slots; UptimeRobot is the better fit at our scale.) Set up two monitors immediately: `/health` on the API and `https://darshya.online` on the web. Add a third for Supabase REST `https://hlkvfarvfblhzhhnhtbp.supabase.co/rest/v1/` once the auth header is in a secret. [VERIFY UptimeRobot free cap before signup — caps move quietly.]

```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all IT items either in flight or blocked_
