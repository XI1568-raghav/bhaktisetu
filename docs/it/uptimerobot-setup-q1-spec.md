# UptimeRobot Setup — api.darshya.online/health + darshya.online

> **Roadmap item**: R-Q1-IT-001 (P0) · **Authored**: 2026-06-13

## Goal

Free-tier UptimeRobot monitoring on critical surfaces. SMS alerts on outage. Closes "founder learns site down via customer complaint" pattern.

## Monitors

| Name | URL | Type | Interval | Alert |
|---|---|---|---|---|
| API health | https://api.darshya.online/health | HTTP(s) keyword "ok" | 5 min | SMS + email |
| Web home | https://darshya.online | HTTP(s) status 200 | 5 min | SMS + email |
| Web /pujas | https://darshya.online/pujas | HTTP(s) status 200 | 10 min | Email |
| API /v1/pujas/types | https://api.darshya.online/api/v1/pujas/types | HTTP(s) status 200 | 10 min | Email |
| API /v1/auth/login | https://api.darshya.online/api/v1/auth/login | POST keyword fallback | 30 min | Email |

Free tier: 50 monitors / 5min interval. Above uses 5 → 45 monitors free for expansion.

## Alert contacts

- SMS to founder +91-XXXXX-XXXXX (10 SMS/mo free tier — set for API health + web home only)
- Email to ops@bhaktisetu.com (unlimited)
- Telegram bot (founder personal — optional)

## Public status page

**`[verify]` — not enabled.** Corrected 2026-09-02 (`OPS-10`). This line used to read
*"UptimeRobot public status page enabled: `https://stats.uptimerobot.com/bhaktisetu`"*,
stated as an accomplished fact. Nothing in this repository records a live status page:
`docs/it/uptime-monitors.md` and `docs/operational-context.md` both still carry the
literal placeholder `<PASTE_AFTER_SETUP>`, and `docs/runbooks/disaster-recovery.md`
records the status page as aspirational copy. `status.bhaktisetu.com` does not exist
either. The slug above was never confirmed to resolve — do not publish or link it.

What *does* exist is the self-hosted route `apps/web/app/status/page.tsx`, served at
`https://darshya.online/status`. It renders live data only when
`NEXT_PUBLIC_UPTIME_STATUS_URL` is set, and degrades to a neutral fallback when it is
not. Setup steps: `docs/it/uptime-setup.md` §4.

## Downtime SLA

- P0: API down > 5 min → founder phone wake (SMS)
- P1: Web pages 5xx > 10 min → email
- P2: Slow response > 2sec sustained → email digest

## Engineering tickets

- R-Q1-IT-001a: UptimeRobot account setup + 5 monitors
- R-Q1-IT-001b: Public status page enabled — **still open `[verify]`** (see above; the spec asserted this as done)
- R-Q1-IT-001c: Alert escalation matrix documented

## Closes

R-Q1-IT-001 — spec shipped.
