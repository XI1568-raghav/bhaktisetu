# On-Call Rotation v1 — 3-person + PagerDuty + Escalation Matrix

> **Roadmap item**: R-Q4-H-002 (P0) · **Authored**: 2026-06-13 · **Depends on**: R-Q1-H-001 first-hire + R-Q3-H-001 senior backend contractor onboarded

## Goal

By Q4 (Jan 2027): 24x7 on-call coverage for production incidents. 3-person rotation. PagerDuty routing. Founder = final escalation only.

## Rotation structure

| Rotation | Primary | Secondary | Coverage hours (IST) |
|---|---|---|---|
| Week 1 | CS Lead | Senior Backend | IN-day + IN-night |
| Week 2 | Senior Backend | Overnight CS | IN-day + IN-night |
| Week 3 | Overnight CS | CS Lead | IN-day + IN-night |

Founder shadow on weeks 1-4 (training). After: founder on call ONLY for P0 escalation.

## Incident severity matrix

| Severity | Definition | Response SLA | Escalation |
|---|---|---|---|
| **SEV-0** | Site down OR payment processor failure OR data breach | 5 min | Primary → 10 min → Secondary → 15 min → Founder |
| **SEV-1** | Major feature broken (booking flow, video proof, payout) | 30 min | Primary → 30 min → Secondary |
| **SEV-2** | Non-critical bug, single-user complaint | 4 hr | Primary handles, no escalation |
| **SEV-3** | Cosmetic, optimization, planning | next business day | Primary triages to backlog |

## PagerDuty config

| Service | On-call schedule | Notification rules |
|---|---|---|
| `bhaktisetu-api` | 3-person rotation | Phone + SMS + Push notification, 5min retry |
| `bhaktisetu-web` | Same | Phone + SMS + Push, 5min retry |
| `bhaktisetu-payments` | Same + Founder always | Phone + SMS + Push, 1min retry (financial) |
| `bhaktisetu-data` | Senior Backend + Founder | Phone, 10min retry |

Cost: PagerDuty free tier (5 users, 1 schedule) → ₹0/mo until team exceeds free tier.

## Runbook library

Each common incident has runbook at `docs/ops/runbooks/`:

- `payment-processor-down.md` — Razorpay or Stripe outage handling
- `db-connection-pool-saturated.md` — Postgres pool tuning
- `api-5xx-spike.md` — diagnosis steps
- `live-darshan-stream-frozen.md` — AWS IVS or alternative restart
- `pandit-no-show-cascade.md` — manual re-dispatch process
- `data-breach-suspected.md` — DPDP-mandated 72h notification process

## Post-incident review (mandatory)

Within 48h of P0 / P1 resolution:
1. Author 1-page RCA at `docs/incidents/YYYY-MM-DD-{slug}.md`
2. Root cause + impact + mitigation deployed + prevention plan
3. Founder + on-call team review at next weekly standup
4. Add new runbook or improve existing if applicable

## Founder action

- [ ] At Q4: hire CS Lead + overnight CS (per R-Q3-H-001 + R-Q4-CS-001)
- [ ] PagerDuty setup w/ free-tier account
- [ ] Train 3 on-call w/ shadow weeks
- [ ] Write 6 baseline runbooks (above)
- [ ] First quarterly fire drill scheduled

## Closes

R-Q4-H-002 — spec shipped.
