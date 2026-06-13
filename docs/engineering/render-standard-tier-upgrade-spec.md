# Render Upgrade to Standard Tier — Multi-Instance Horizontal Scale

> **Roadmap item**: R-Q4-E-003 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q2-IT-002 Render scaling plan

## Goal

Q4 upgrade Render to Standard tier. Multi-instance horizontal scale at MAU 50K+. Sustains Q4 traffic + Diwali peak.

## Tier comparison

| Tier | Cost | RAM | CPU | Scale |
|---|---|---|---|---|
| Free | $0 | 512 MB | 0.1 vCPU | 750hr/mo (Q1 baseline) |
| Starter | $7/mo | 512 MB | 0.5 vCPU | Single instance (Q1 minor scale) |
| Standard | $25/mo | 2 GB | 1 vCPU | **Multi-instance horizontal** |
| Pro | $85/mo | 4 GB | 2 vCPU | (Q1 2027 if MAU >100K) |

## Upgrade trigger

- MAU 50K+ sustained 4 weeks → upgrade Standard
- p95 latency >800ms sustained 1 week → upgrade
- Diwali peak Q4 → upgrade proactively (per R-Q2-IT-002 plan)

## Horizontal scale config

- 2 instances minimum (high availability)
- Auto-scale up to 5 instances on CPU >70% sustained 5 min
- Health check: /health endpoint w/ 30sec interval
- Session-store: Redis (Upstash free tier)

## Cost Q4

- $25/mo Standard
- Buffer $25/mo for 2nd instance peak
- Total ~$50/mo Q4 = ₹4.1K/mo (within pre-seed budget)

## Engineering tickets

- R-Q4-E-003a: Standard tier upgrade
- R-Q4-E-003b: 2-instance min scale config
- R-Q4-E-003c: Redis session-store via Upstash
- R-Q4-E-003d: Auto-scale rules
- R-Q4-E-003e: Cost monitor + Q1 Pro upgrade gate

## Closes

R-Q4-E-003 — spec shipped.
