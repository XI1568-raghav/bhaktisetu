# CDN Caching — CF Pages KV for /pujas + /temples + /darshan/live

> **Roadmap item**: R-Q2-E-006 (P1) · **Authored**: 2026-06-13 · **Companion to**: R-Q4-E-006 edge perf hardening

## Goal

Cache top-3 hot pages at CF edge: /pujas (catalog), /temples (directory), /darshan/live (current darshan stream metadata). Sub-100ms TTFB globally.

## Cache strategy per page

| Page | Strategy | TTL | Invalidation |
|---|---|---|---|
| /pujas | KV cache full HTML | 5 min | webhook on new puja type added |
| /temples | KV cache full HTML | 1 hour | webhook on new temple added |
| /temples/[slug] | KV cache full HTML | 1 hour | webhook on temple update |
| /darshan/live | KV cache JSON metadata only (HTML re-renders w/ live data) | 30 sec | webhook on aarti start/end |

## Implementation

```typescript
// apps/web/middleware.ts edge cache logic
import { kv } from '@vercel/kv';  // or CF Workers KV equivalent

export async function cacheGet(key: string): Promise<string | null> {
  return await kv.get(key);
}

export async function cacheSet(key: string, html: string, ttlSec: number): Promise<void> {
  await kv.set(key, html, { ex: ttlSec });
}
```

Wrap hot-path SSR responses:
```typescript
// apps/web/app/temples/page.tsx
export default async function TemplesPage() {
  const cacheKey = 'page:temples:v1';
  const cached = await cacheGet(cacheKey);
  if (cached) return <RawHTML>{cached}</RawHTML>;
  const html = await renderTemplesList();
  await cacheSet(cacheKey, html, 3600);
  return <RawHTML>{html}</RawHTML>;
}
```

## Cache invalidation webhooks

Per existing R-Q4-E-006 spec — entity change → webhook → KV DELETE.

## Cost

CF Workers KV free tier: 100K reads/day. Bhaktisetu Q2 traffic <20K MAU → well under cap. No charge.

## Engineering tickets

- R-Q2-E-006a: KV-cache wrapper utility
- R-Q2-E-006b: per-route cache integration (top-3 pages first)
- R-Q2-E-006c: invalidation webhook handlers

## Closes

R-Q2-E-006 — spec shipped.
