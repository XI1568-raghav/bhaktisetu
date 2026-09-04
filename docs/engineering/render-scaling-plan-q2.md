# Render Scaling Plan — Instance Upgrade Trigger + Budget Approval

> **Roadmap item**: R-Q2-IT-002 (P1) · **Authored**: 2026-06-13

## Goal

Predictable Render scaling: per-trigger upgrade decisions, no surprise bills.

## Trigger matrix

| Current tier | Upgrade trigger | Next tier | Cost |
|---|---|---|---|
| Free (Web Service) | CPU >80% sustained 24h OR cold-start >5sec sustained | Starter | ₹2.5K/mo |
| Starter | CPU >80% sustained 7 days OR p95 latency >800ms | Standard | ₹6K/mo |
| Standard | CPU >80% sustained 30 days OR >50K MAU | Performance Pro | ₹15K/mo |

## Budget approval flow

| Tier | Approval required |
|---|---|
| Free → Starter | Founder solo (₹2.5K/mo, within MRR budget at ₹50K+) |
| Starter → Standard | Founder + board notification (₹6K/mo) |
| Standard → Performance Pro | Founder + Foundation board approval (₹15K/mo) |

## Multi-region

**Corrected 2026-09-02 (`OPS-10`).** This line used to read *"activate Singapore standby"*, as though a standby were sitting there waiting. There is no standby, no replica and no warm spare in any geography; both services run in Render `oregon` (`render.yaml:15`, `:56`). Building a second region is unstarted work, not an activation — and the multi-region plans that described it are retired stubs (`docs/engineering/multi-region-failover-plan.md`). Before it is worth costing, both services must fit the Render free tier's 750 instance-hours per **account** (`docs/free-tier-budgets.md`) and a backup must be proven to restore (`OPS-02`). For an actual outage: `docs/runbooks/disaster-recovery.md`.

## Monitoring

Per R-Q4-E-005 observability spec. Daily Render usage report → founder.

## Closes

R-Q2-IT-002 — plan shipped.
