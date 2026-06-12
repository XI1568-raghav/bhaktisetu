# API p95 Latency < 400ms — Fastify Cache Layer + Render Tier Check

> **Roadmap item**: R-Q2-E-005 (P1) · **Authored**: 2026-06-13

## Goal

Hot-path API endpoints (temples / pujas / festivals / pandits) return p95 <400ms. Use Fastify cache plugin + Render instance-size optimization.

## Cache layers

### L1 — Fastify response cache (in-memory per Render instance)

```typescript
import fastifyCaching from '@fastify/caching';
app.register(fastifyCaching, { privacy: 'public', expiresIn: 60_000 });

// Per-route caching
app.get('/api/v1/temples', { cache: { expires: 300 } }, async () => { ... });
app.get('/api/v1/puja-types', { cache: { expires: 600 } }, async () => { ... });
app.get('/api/v1/festivals', { cache: { expires: 1800 } }, async () => { ... });
```

### L2 — Postgres query cache (Supabase free pgBouncer in-built)

Already in place per Supabase. No additional config.

### L3 — Cloudflare KV (CDN-edge cache)

Cross-ref R-Q4-E-006 edge perf hardening for KV-based cache.

## Hot-path endpoint optimization

| Endpoint | Target p95 | Current p95 | Optimization |
|---|---|---|---|
| GET /api/v1/temples | 200ms | ~500ms (assumed) | Fastify in-mem cache 5min |
| GET /api/v1/puja-types | 100ms | ~300ms | Cache 10min |
| GET /api/v1/festivals | 150ms | ~400ms | Cache 30min |
| GET /api/v1/pandits | 250ms | ~600ms | Cache 5min + DB index |
| POST /api/v1/bookings | 400ms | ~800ms | Connection pool + DB tune |

## Render tier check

Decision:
- Free tier OK if p95 <400ms achieved via caching
- Upgrade to Starter (₹2.5K/mo) if cold-start still issue
- Standard (₹6K/mo) only at >50K MAU

## Engineering tickets

- R-Q2-E-005a: Fastify cache plugin integration
- R-Q2-E-005b: per-endpoint cache config
- R-Q2-E-005c: DB index audit for top-10 query patterns
- R-Q2-E-005d: Render tier decision based on load-test data (cross-ref R-Q3-E-006)

## Closes

R-Q2-E-005 — spec shipped.
