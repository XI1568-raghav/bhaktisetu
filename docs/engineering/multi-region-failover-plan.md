# Multi-Region Failover Plan — Mumbai Primary + Singapore Standby

> **Roadmap item**: R-Q4-IT-001 (P0) · **Authored**: 2026-06-13

## Goal

Q4 production scale needs DR (disaster recovery). Mumbai primary region (Render Singapore = close enough). Singapore secondary if Render Mumbai outage.

## Architecture

### Active-passive failover

```
[Cloudflare DNS] →→→
                   ↓
            [Mumbai Render API]  (primary, active)
                   ↓
            [Supabase Postgres Mumbai]
                   ↓
            [S3 Mumbai for media]

           [Singapore Render API]  (standby, daily-warmed)
                   ↓
            [Supabase Postgres SG read-replica]
                   ↓
            [S3 SG mirror — Supabase replication]
```

### Failover trigger

UptimeRobot detects Mumbai region down for >5 min → triggers:
1. Cloudflare DNS API: flip CNAME from `mumbai.bhaktisetu.com` to `singapore.bhaktisetu.com`
2. PagerDuty alert founder + on-call
3. Singapore API becomes primary; reads + writes flow there
4. Data sync continues via Postgres logical replication

### Failback

Once Mumbai recovers:
1. Wait 30 min for Mumbai to stabilize
2. Cloudflare DNS API: flip back to Mumbai
3. Singapore reverts to standby
4. Reconcile any writes that happened during Singapore-primary window

### Data sync

- Postgres: Supabase logical replication SG ← MUM (async, ~5s lag normally)
- S3: bucket replication MUM ↔ SG
- Redis (Upstash): geo-replicated (Upstash supports this)

### Cost

- Mumbai region: existing free-tier + paid tier
- Singapore region: separate paid Render instance ~$25/mo (smaller, standby)
- Bucket replication: ~$5/mo data egress
- DNS API automation: free

Total DR overhead: ~$30/mo. Acceptable.

## RTO + RPO

- RTO (Recovery Time Objective): 15 min (Cloudflare DNS TTL + cold-start)
- RPO (Recovery Point Objective): 5 sec (Postgres replication lag)

## Runbook

`docs/ops/runbooks/regional-failover.md`:
1. Verify Mumbai-side outage (3 sources: UptimeRobot + Render status + ping from 3 geos)
2. Trigger Cloudflare DNS flip
3. Verify Singapore traffic flowing (curl `https://darshya.online/health`)
4. Announce on Twitter + Status page
5. Monitor for split-brain (Mumbai briefly returns serving stale data)
6. Failback after stability

## Closes

R-Q4-IT-001 — plan shipped.
