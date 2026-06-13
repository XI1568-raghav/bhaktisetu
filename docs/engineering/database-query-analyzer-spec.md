# Database Query Analyzer — Slow Query Log + N+1 Fix

> **Roadmap item**: R-Q2-E-011 (P2) · **Authored**: 2026-06-13

## Goal

Q2 enable Supabase slow-query log + identify 10 worst N+1 patterns + fix.

## Setup

- Supabase Dashboard → Database → Logs → enable Slow Query log
- Threshold: >100ms p95
- Weekly review: top 10 slowest queries

## Fix patterns

| N+1 | Fix |
|---|---|
| Iterating pandits + fetching each puja count | Prisma `_count` aggregation |
| Looping bookings to fetch user | `include: { user: true }` |
| Per-temple fetch in /city/{slug} | Single `findMany` w/ `where: { city }` |

## Engineering tickets

- R-Q2-E-011a: Slow query log enable
- R-Q2-E-011b: 10 N+1 audit + fix PRs
- R-Q2-E-011c: Prisma query monitoring middleware
- R-Q2-E-011d: Weekly review SOP

## Q2 success

- p95 query latency <50ms (vs unknown baseline)
- 10 N+1 fixed
- 40% DB load reduction

## Closes

R-Q2-E-011 — spec shipped.
