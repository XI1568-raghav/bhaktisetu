# Multi-Region Deployment Strategy

> Geographic distribution for sub-second NRI page loads + DR resilience. Q4 2026 + Q1 2027 implementation.

## Why multi-region

- 60% Bhaktisetu traffic from India + NRI globally
- Current state: All servers Mumbai (Render + Supabase)
- US/UK/Canada/Australia users experience 200-400ms additional latency
- Series A pitch deck: multi-region = production-ready scale story
- DR (Disaster Recovery) requirement post Series A

## Current state (Q3 2026)

- **Primary**: Render Mumbai (apps/api)
- **Cloudflare Pages** (apps/web) — global edge by default
- **Supabase**: Mumbai primary; no replica
- **CloudFront / R2** (video proof storage): global CDN
- **WhatsApp Cloud API**: global Meta infrastructure
- **Sentry + PostHog**: third-party global

## Latency analysis (current)

| User location | API latency (median) | Acceptable target |
|---|---|---|
| Bengaluru | 50ms | 50ms |
| Mumbai | 30ms | 50ms |
| Delhi | 80ms | 100ms |
| Bay Area | 250ms | 100ms ❌ |
| NJ + NY | 300ms | 100ms ❌ |
| London | 350ms | 100ms ❌ |
| Toronto | 320ms | 100ms ❌ |
| Sydney | 400ms | 100ms ❌ |
| Singapore | 100ms | 100ms ✓ |

## Multi-region rollout (per R-Q4-E-014)

### Phase 1: Singapore standby (Q4 2026)
- Singapore Render instance (passive replica)
- Supabase Singapore read-replica
- DNS failover (CF DNS)
- Cost: $50/mo
- Use case: DR + India region overflow

### Phase 2: US-East (Frankfurt EU + US-East via Render edge) (Q1 2027)
- Render Frankfurt + US-East regions
- Read-replicas via Supabase
- Geographic routing via CloudFront / R2 CDN
- Cost: $100/mo each region
- Use case: NRI latency reduction (Bay Area + NJ + London)

### Phase 3: Full multi-region failover (Q2 2027)
- 5 active regions: Mumbai (primary), Singapore, Frankfurt, US-East, US-West
- DB write replication via Supabase Postgres logical replication
- CloudFront / R2 CDN for static assets
- Automated failover via CF DNS
- Cost: $300/mo total
- Use case: 99.99% uptime achievable

## Database strategy

### Current
- Supabase Mumbai (single instance)
- ~50K row-writes/day
- ~10K row-reads/day

### Q4 plan
- Supabase Mumbai primary
- Singapore read-replica (auto-failover-ready)
- Asynchronous replication ~1-2 second lag

### Q1 2027 plan
- Mumbai write-primary
- 4 read-replicas: Singapore, Frankfurt, US-East, US-West
- Geographic routing: queries to nearest region
- Conflict resolution: last-write-wins per row

## Engineering pattern

```typescript
// apps/api/src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const primary = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_PRIMARY })

const replicas = {
  asia: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_ASIA_REPLICA }),
  us: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_US_REPLICA }),
  eu: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_EU_REPLICA }),
}

export const dbWrite = primary

export function dbRead(req: FastifyRequest) {
  const region = detectRegionFromIP(req.ip)
  switch (region) {
    case 'us': return replicas.us
    case 'eu': return replicas.eu
    case 'asia': return replicas.asia
    default: return primary
  }
}
```

## Storage strategy

### Video proof S3 / R2
- Multi-region replicated automatically (Cloudflare R2 default)
- Edge caching via CDN
- Latency target: <200ms anywhere globally

### Image assets
- CloudFront via CF Pages — already global
- Brand assets cached at edge
- Per-region asset optimization not needed

## DNS + Routing

### Cloudflare DNS health-check failover

```yaml
# CF DNS Load Balancer (Q4 2026)
hostname: api.darshya.online
pools:
  - mumbai_primary (origin: render-mumbai.bhaktisetu.com)
  - singapore_standby (origin: render-singapore.bhaktisetu.com)
fallback_pool: singapore_standby
geo_pools:
  india: mumbai_primary
  default: mumbai_primary
health_check: GET /health, interval 30s, fail 3 consecutive
```

### Failover triggers

- Mumbai region 5xx >50% sustained 5 min → automatic Singapore primary
- Mumbai region down >2 min → automatic failover
- Mumbai recovery: founder manual restoration

## Monitoring

### Per-region metrics

- API latency p50/p95/p99 per region
- Error rate per region
- Request volume per region
- Cost per region

### Cross-region health checks

- Each region pings every other region every 60sec
- Triggers Slack alert on >5sec failure
- Triggers automated failover sequence

## Cost summary

| Quarter | Total monthly | Regions |
|---|---|---|
| Q4 2026 | $50 | Mumbai + Singapore standby |
| Q1 2027 | $250 | + US-East + Frankfurt |
| Q2 2027 | $400 | + US-West full active |
| Q1 2028 | $1,000+ | Series A scale + 8 regions |

## Founder ROI

- NRI latency 350ms → 100ms = 3.5x improvement
- 99.99% uptime achievable (vs 99.9% currently)
- Series A pitch deck: "Multi-region production-ready"
- Customer trust signal: "We work globally, not just India"
- Insurance + DR compliance: hard requirement Series A+

## Engineering tickets

- Q4 W1-2: Singapore standby setup
- Q4 W3-4: CF DNS failover testing
- Q4 W5-6: Pilot failover (planned downtime)
- Q1 2027 W1-2: Frankfurt + US-East setup
- Q1 2027 W3-4: Multi-region pilot
- Q1 2027 W5-12: Full multi-region rollout
