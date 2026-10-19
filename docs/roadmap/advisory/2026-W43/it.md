# IT Advisory — 2026-W43

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

> **Correction 2026-09-02 (`OPS-10`).** This document contained a disaster-recovery step a founder would have tried to execute during an outage. **DR-3 read "Web redeploy (Cloudflare Pages)" / "GitHub → Actions → 'Deploy Web to Cloudflare Pages' → Run workflow on main".** No such workflow exists, and **Cloudflare Pages has not served the web tier since the 2026-07-08 cutover** (`.github/workflows/cf-kill-zombie.yml`, `docs/render-web-cutover-runbook.md`) — running it would have restored nothing while the site stayed down. The web tier is the **Render Docker service `darshya-web`, region `oregon`** (`render.yaml:52-60`), running Next standalone on Node; **Cloudflare is DNS + edge proxy only** — there is no `next-on-pages` build and no edge-runtime constraint. DR-3 is rewritten below. Two related fictions are corrected with it: there is **no Cloudflare Pages build quota** (§3 item 4 and the §6 tripwire row both cited a live "500 builds/mo" ceiling), and Render's free allowance is **750 instance-hours per _account_, not per service** — two always-on free services need ~1,488 h, and the account was suspended for exactly this on **2026-08-17**. Both services also carry `autoDeploy: false` (`render.yaml:28`, `:60`), so **a git push deploys nothing**: every deploy in this runbook is manual.

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

```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all IT items either in flight or blocked_
