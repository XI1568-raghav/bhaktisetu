# Edge Perf Hardening — Cloudflare Workers KV Cache + Cold-start <100ms Globally

> **Roadmap item**: R-Q4-E-006 (P0) · **Authored**: 2026-06-13

## Goal

p95 page-load <100ms globally including cold-start. Use Cloudflare Workers KV for hot-path caching.

## Hot-path cache layers

| Layer | TTL | Purpose |
|---|---|---|
| Cloudflare CDN cache | 1h-24h | Static pages, images, video proofs |
| CF Workers KV | 5min-1h | API responses (temples list, puja types, festival pre-sale slots) |
| Postgres connection pool | live | Active DB connections via Supabase pooler |
| Redis (Upstash free) | 5min | Session-level cache (user-specific bookings, profile) |

## Cache invalidation strategy

| Trigger | Invalidates |
|---|---|
| New temple added | `/api/v1/temples` + sitemap |
| Festival slot booked | `/api/v1/festivals/:slug/slots/:slotId` |
| Pandit profile updated | Pandit's profile page |
| Donation campaign update | CSR landing page sections |

Webhook → KV `DELETE` on each trigger.

## Cold-start optimization

Render API cold-start currently ~3-5sec (Node + Fastify). Reduce via:
- Pre-warmed container (Render Standard plan or Starter w/ keep-alive cron)
- Reduce dependency tree (audit `pnpm install --prod` size)
- Lazy-load heavy modules (PDF gen, ElevenLabs SDK)
- Edge-cache 90% of public traffic via CF Workers so cold-API path rarely triggered

## Pass criteria

- [ ] p95 page load <100ms (Lighthouse score from 5 regions)
- [ ] p95 API response <200ms (existing baseline ~500ms)
- [ ] Cold-start <100ms for cached paths (cache hit)
- [ ] CF KV cache hit rate >70%

## Tickets

- R-Q4-E-006a: CF Workers KV integration
- R-Q4-E-006b: cache invalidation webhooks
- R-Q4-E-006c: Render cold-start optimization
- R-Q4-E-006d: Lighthouse CI integration

## Closes

R-Q4-E-006 — spec shipped.
