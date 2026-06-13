# Multi-Region Failover Plan — Mumbai + Singapore + Frankfurt

> **Roadmap item**: R-Q4-E-014 (P2) · **Authored**: 2026-06-13

## Goal

Q4 multi-region failover plan. Mumbai primary + Singapore standby + Frankfurt for EU/NRI.

## Topology

- **Primary**: Render Mumbai region (R-Q4-E-003 Standard tier)
- **Standby**: Render Singapore (passive replica)
- **EU/UK NRI**: Cloudflare Workers (R-Q3-G-001) for edge-cached reads
- **DB**: Supabase Mumbai primary + Singapore read-replica (R-Q3-IT-002)

## Failover triggers

- Mumbai region 5xx >50% sustained 10min → manual flip Singapore primary
- Mumbai region down >5min → automated DNS flip
- Recovery: founder manual cutback once Mumbai stable 30min

## DNS

- CF DNS w/ failover health-check pointing to Render Mumbai
- TTL 60sec for fast failover
- Singapore standby pre-warmed (always running)

## Cost

- Singapore standby: $25/mo
- Frankfurt edge: $0 (CF free tier)
- Total Q4 multi-region overhead: ~$30/mo

## Engineering tickets

- R-Q4-E-014a: Singapore standby Render setup
- R-Q4-E-014b: CF DNS failover config
- R-Q4-E-014c: DB read-replica multi-region
- R-Q4-E-014d: Failover runbook + drill

## Closes

R-Q4-E-014 — spec shipped.
