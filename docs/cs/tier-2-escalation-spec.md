# Tier-2 Support Escalation Flow — Sev Levels + On-Call

> **Roadmap item**: R-Q2-CS-004 (P1) · **Authored**: 2026-06-13

## Goal

Tier-2 escalation flow w/ SLA + sev levels + on-call rotation. Targets P1 ack <1hr / P2 <4hr / P3 <24hr.

## Sev levels

> **Correction 2026-09-02 (`OPS-10`).** The P0 example row used to read *"All bookings
> failing, Stripe webhook broken"*. **Stripe was removed from the codebase on
> 2026-08-11** (`apps/api/src/lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`), and the Stripe webhook **route itself was
> deleted** the same day — `apps/api/src/routes/payments.ts:304-310` records the
> removal and states that Razorpay's handler is now the only webhook. The example is
> corrected to the webhook that exists (`POST /webhook`,
> `apps/api/src/routes/payments.ts:208`). This is a triage table read under a 5-minute
> ack clock: pointing a first responder at a deleted endpoint costs the exact minutes
> the row is trying to buy. Razorpay is the only live rail and it settles INR only; no
> replacement international processor has been chosen.

| Sev | Definition | Examples | Ack SLA | Resolution SLA |
|---|---|---|---|---|
| **P0** | Site down, payment broken, security breach | All bookings failing, Razorpay webhook broken | 5min | 2hr |
| **P1** | Single user critical issue, revenue at risk | High-paying NRI customer can't book | 1hr | 8hr |
| **P2** | Operational, multiple users impacted | Pandit no-show pattern, video proof delayed | 4hr | 24hr |
| **P3** | Cosmetic, single low-impact | Typo, UI minor | 24hr | 7d |

## Tier-1 → Tier-2 escalation triggers

- User SLA breach 2+ hr unresolved at Tier 1
- User explicit request "escalate to manager"
- Revenue >₹5K booking impact
- DPDP / legal request (auto-escalate)
- Sev P0 always direct to T2

## T2 on-call rotation

Q2: founder solo (no T2 person yet).
Q3+: contractor (per R-Q2-HR-001 CS-ops generalist) covers business hours 09:00-21:00 IST. Founder backup nights/weekends.

## On-call notification

- PagerDuty free tier (4 users) or just SMS + WA
- T1 escalation triggers PagerDuty alert to current on-call
- On-call ack within sev SLA via /admin/escalations dashboard

## Documentation

- `docs/cs/oncall-runbook.md` — per-sev decision tree (refund / pandit-replacement / temple-comm / dev-engineering escalation)
- `docs/cs/sla-tracker.md` — weekly SLA report

## Engineering tickets

- R-Q2-CS-004a: /admin/escalations dashboard
- R-Q2-CS-004b: PagerDuty integration (free tier)
- R-Q2-CS-004c: Sev-level webhook to Slack #ops channel
- R-Q2-CS-004d: Weekly SLA report cron

## Closes

R-Q2-CS-004 — spec shipped.
