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

When MAU > 50K → activate Singapore standby per R-Q4-IT-001 multi-region failover plan.

## Monitoring

Per R-Q4-E-005 observability spec. Daily Render usage report → founder.

## Closes

R-Q2-IT-002 — plan shipped.
