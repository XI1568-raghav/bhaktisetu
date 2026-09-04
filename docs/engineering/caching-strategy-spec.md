# Caching Strategy Spec — Multi-Layer Performance

> Comprehensive caching architecture across Cloudflare + Render + Supabase + Redis. Foundation for sub-200ms responses at scale.

> **Correction 2026-09-02 (`OPS-10`).** This spec is a design proposal and most of it
> is unbuilt, but two passages asserted a hosting arrangement that is not true and are
> corrected in place below. **Cloudflare Pages has not served the web tier since the
> 2026-07-08 cutover** (`cf-kill-zombie.yml`, `docs/render-web-cutover-runbook.md`):
> the web tier is a Render Docker service running Next standalone on Node
> (`darshya-web`, `region: oregon`, `render.yaml:52-60`), and Cloudflare is DNS + edge
> proxy in front of it. So `_headers` / `cf-pages-headers.json` is not the mechanism
> that sets cache headers here, and no Pages deploy purges anything. Whether the
> Cloudflare edge is actually caching HTML for this origin at all is **`[verify]`** —
> nothing in this repository records the zone's cache configuration. The "CF" column
> in the per-route table below should be read as "Cloudflare edge, unverified", not as
> a configured, measured cache layer.

## Why caching matters

- 500+ pillar pages = high traffic candidates
- AI Pandit responses = expensive computation
- Booking + payment data = real-time fresh required
- Per-quarter cost optimization compounding

## Cache layers (top-down)

### Layer 1: Browser cache (Client)
- Static assets (CSS, JS, images): 1 year
- HTML pages: 5 minutes (vary by content type)
- API responses: 5 minutes default, 0 for personalized

### Layer 2: Cloudflare CDN cache (Edge)
- Static assets globally: 1 year
- Public pages (e.g., /pujas, /temples): 1 hour
- Personalized pages: NO cache
- Edge geographic distribution = sub-100ms globally

### Layer 3: Next.js ISR cache (apps/web)
- /pujas/* + /temples/* + /aarti/* etc.: 1 day revalidation
- Daily content pages: 1 hour revalidation
- Real-time pages: NO ISR (use dynamic SSR)

### Layer 4: Render API memory cache (apps/api)
- Read-heavy data (pandit list, temple list): 5-30 min
- Per-user data: per-request only (no cross-user cache)
- Implemented via fastify-caching plugin

### Layer 5: Redis cache (Upstash)
- AI Pandit responses: 24 hour cache (per question hash)
- Rate limit counters: 1 hour rolling
- Session data: 7 days
- Feature flags + A/B test variants: 5 min

### Layer 6: Supabase query cache (DB)
- Auto via Postgres query planner
- Materialized views for analytical queries
- Read-replica geographic routing (Q4+ post multi-region)

## Per-route caching policy

| Route | Cache layer | TTL |
|---|---|---|
| / (home) | CF + ISR | 1 hour |
| /pujas | CF + ISR | 1 hour |
| /pujas/[slug] | CF + ISR | 1 day |
| /temples/[slug] | CF + ISR | 1 day |
| /aarti/[slug] | CF + ISR | 1 day |
| /chants/[slug] | CF + ISR | 1 day |
| /muhurat/[slug] | CF + ISR | 1 day |
| /tirth/[slug] | CF + ISR | 1 day |
| /deity/[slug] | CF + ISR | 1 day |
| /vrat/[slug] | CF + ISR | 1 day |
| /api/v1/pujas/types | API memory | 30 min |
| /api/v1/temples | API memory | 30 min |
| /api/v1/pandits/:id | API memory | 5 min |
| /api/v1/me | NO cache (per-user) | - |
| /api/v1/bookings/me | NO cache | - |
| /api/v1/ai-pandit/ask | Redis (per question) | 24 hours |
| /api/v1/auth/* | NO cache | - |
| /admin/* | NO cache | - |

## Cache invalidation strategy

### Manual invalidation triggers
- Pandit profile update → invalidate /pandits/[id] + related search results
- Puja price change → invalidate /pujas/[slug] + cached search
- Festival countdown updates → invalidate /today + /festivals
- New blog post published → invalidate /blog + /sitemap

### Programmatic invalidation
- Webhook from CMS or admin → invalidate specific paths
- Daily cron at 00:00 IST → invalidate festival-time-sensitive pages
- Per-pandit weekly invalidation for content freshness

## Implementation patterns

### Next.js ISR
```typescript
// apps/web/app/pujas/[slug]/page.tsx
export const revalidate = 86400 // 1 day

export async function generateStaticParams() {
  const pujas = getAllPujas()
  return pujas.map(puja => ({ slug: puja.slug }))
}
```

### Cloudflare CDN
```javascript
// Proposed only. NOT the live mechanism: `apps/web/public/_headers` is a Cloudflare
// Pages convention and Pages no longer serves this site (corrected 2026-09-02,
// `OPS-10`). On Render + Next standalone, headers come from `next.config.ts`
// headers() or from Cloudflare zone rules — which of those is configured is `[verify]`.
{
  "/_next/static/*": "public, max-age=31536000, immutable",
  "/pujas/*": "public, s-maxage=3600, stale-while-revalidate=86400",
  "/api/v1/me": "private, no-cache, no-store"
}
```

### Fastify cache
```typescript
// apps/api/src/server.ts
import fastifyCaching from '@fastify/caching'

await fastify.register(fastifyCaching, {
  privacy: 'public',
  expiresIn: 300 // 5 min default
})

fastify.get('/v1/pujas/types', {
  schema: { /* ... */ },
  config: { caching: { expiresIn: 1800 } } // 30 min
}, async (req, reply) => {
  // ...
})
```

### Redis cache
```typescript
// apps/api/src/lib/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!)

export async function getCached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  
  const fresh = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}

// Usage
const aiPanditResponse = await getCached(
  `aipandit:${hashedQuestion}`,
  86400, // 24 hours
  () => callGroqInference(question)
)
```

## Cache metrics + monitoring

### Per-layer hit rate target
- Browser: 95%+ (high static asset)
- CDN: 80%+ (high page traffic)
- API memory: 70%+ (frequent reads)
- Redis: 60%+ (AI Pandit specifically)

### Dashboard
- /admin/observability shows real-time cache hit rates
- Sentry alert if hit rate drops >20% over 1 hour
- Weekly cost-optimization review

## Cache busting + invalidation

### Code deploy
- ~~CF Pages purges /_next/static/* automatically on deploy~~ — **false since 2026-07-08** (corrected 2026-09-02, `OPS-10`). There is no Pages deploy. A Render deploy produces new hashed `/_next/static` paths, which sidesteps the question for immutable assets; whether any Cloudflare edge purge happens for HTML is `[verify]`
- API memory cache cleared on Render restart
- Redis cache persisted; manual purge for specific keys

### Per-content update
- Manual: /admin/cache-purge UI button per content type
- Automatic: webhook from CMS triggers per-route invalidation
- Daily 00:00 IST: festival-related content auto-refresh

## Q4 + Series A scaling

- Q4: Render Standard tier → larger API memory cache
- Q1 2027: Add Redis cluster (Upstash paid tier)
- Q2 2027: Multi-region cache (per multi-region spec)
- Year 3+: ElasticSearch for advanced search caching

## Cost summary

- Cloudflare CDN: $0 (free tier sufficient)
- Render: included in plan
- Upstash Redis: $0 (free tier 10K commands/day) → $10/mo paid Year 2
- Total cache infrastructure: $0-$10/month currently

## Engineering tickets

- Q4 W1: Cache hit rate monitoring dashboard
- Q4 W2: Per-route cache header configuration
- Q4 W3: Redis integration finalize (per R-Q2-E-012)
- Q4 W4: Cache purge admin UI
- Q4 W5: Festival-time-sensitive cache automation
- Q1 2027: Multi-region cache geographic routing
