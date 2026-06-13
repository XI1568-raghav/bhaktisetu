# Sentry SLO Dashboard — Error Budget Tracking + Alerting

> **Roadmap item**: R-Q3-E-013 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q1-IT-003 Sentry + R-Q2-IT-001 tuning

## Goal

Q3 ship SLO dashboard tracking error budgets. Alerts at 50% + 75% + 90% burn rate.

## SLOs defined

| Service | SLO | Window | Error budget |
|---|---|---|---|
| api.darshya.online | 99.9% uptime | 30d | 43min |
| darshya.online | 99.95% uptime | 30d | 21min |
| Booking flow E2E | 99.5% success | 30d | 3600 errors/720K attempts |
| Razorpay payments | 99.8% success | 30d | 1000 errors/500K attempts |
| Video proof upload | 95% success in 24hr | 30d | 5% misses tolerable |

## Burn rate alerts

- 50% burn: warning email to founder
- 75% burn: SMS + investigate
- 90% burn: SMS + page (drop low-priority work, focus reliability)

## Dashboard

`/admin/slo` reads Sentry API + Supabase logs:
- Per-SLO current burn rate
- Trend chart 30d
- Top error types last 7d
- Action items per SLO breach

## Engineering tickets

- R-Q3-E-013a: SLO definitions + Sentry projects
- R-Q3-E-013b: Burn rate alert rules
- R-Q3-E-013c: /admin/slo dashboard
- R-Q3-E-013d: SLO breach runbook

## Closes

R-Q3-E-013 — spec shipped.
