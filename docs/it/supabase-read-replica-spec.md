# Supabase Read-Replica + Cloudflare Analytics Eval

> **NOT IMPLEMENTED — status note added 2026-09-08 (`OPS-10`).** This page is an
> *evaluation proposal* and has always been one, but other documents cite its roadmap
> id (`R-Q3-IT-002`) as though it had produced a replica: the retired multi-region
> plans, the founder FAQ and a DPIA all said "Supabase Mumbai primary + Singapore
> read-replica (R-Q3-IT-002)". **There is one Supabase Postgres instance and no read
> replica, in any region.** The repository does not record the region of that instance
> anywhere — `[verify]` it in the Supabase dashboard rather than assuming Mumbai.
> `DATABASE_URL_REPLICA` (referenced in the sketch below) is not set anywhere and
> `apps/api/src/lib/prisma.ts` contains no `prismaRead`/`prismaWrite` split.
> Ground truth: `docs/runbooks/disaster-recovery.md` ("Replicas / standby: **None**").

> **Roadmap item**: R-Q3-IT-002 (P1) · **Authored**: 2026-06-13

## Goal

Q3 evaluate Supabase read-replica + Cloudflare Analytics for scale Q4.

## Supabase read-replica

### Cost
- Pro tier: $25/mo per replica
- Reduces primary DB load 30-50%
- Latency lower for read-heavy routes

### Decision tree
- MAU <10K: skip (over-engineering)
- MAU 10K-50K: 1 replica (cost-justified)
- MAU 50K+: 2 replicas (multi-region)

### Implementation
```typescript
// apps/api/src/lib/prisma.ts
const primaryPrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
const replicaPrisma = process.env.DATABASE_URL_REPLICA 
  ? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_REPLICA })
  : primaryPrisma

// Read-only queries → replica
export const prismaRead = replicaPrisma
// Writes always primary
export const prismaWrite = primaryPrisma
```

### Q3 evaluation
- Benchmark p95 query latency current
- Estimate Q4 query load (50K MAU baseline)
- Decision Q3-end: enable Q4 if MAU >10K

## Cloudflare Analytics evaluation

### Cost
- Free tier (Web Analytics): unlimited PV but limited dashboards
- Workers Analytics: $5/mo per 10M requests

### vs PostHog (current)
- PostHog richer (funnels + cohorts + recordings)
- CF Analytics faster (server-side, no client JS)
- Both: keep PostHog product analytics, add CF for raw traffic + Edge metrics

### Decision Q3
- Enable CF Web Analytics free (zero risk)
- Skip Workers Analytics until $5/mo cost justified Q4

## Engineering tickets

- R-Q3-IT-002a: Supabase replica benchmark
- R-Q3-IT-002b: Q4 enable gate (10K MAU + cost approval)
- R-Q3-IT-002c: CF Web Analytics setup
- R-Q3-IT-002d: Monthly review SOP

## Closes

R-Q3-IT-002 — spec shipped.
