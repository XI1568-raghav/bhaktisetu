# Service Worker + Offline Page — /pujas/[slug] + /darshan/{temple}

> **Roadmap item**: R-Q2-E-016 (P2) · **Authored**: 2026-06-13

## Goal

Q2 ship service worker w/ offline fallback for critical routes. Tier-2/3 India users w/ flaky network.

## Cached routes

- /pujas/[slug] (top 20 most-viewed)
- /darshan/{temple} (top 5 temples)
- /today (daily aarti hub)
- /aarti/[slug] (top 10 aartis)

## Service worker strategy

```typescript
// apps/web/public/sw.js
const CACHE_NAME = 'bhaktisetu-v1'
const ASSETS = ['/offline.html', '/og/default.png', ...]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)))
})

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request)).then(r => r || caches.match('/offline.html'))
  )
})
```

## Offline page

`/offline.html`:
- Saffron-branded
- "You're offline. Here's a daily aarti you can read:" (cached content)
- "Reconnect to book pujas + live darshan"

## Workbox

Use Workbox library for cleaner service worker management.

```bash
pnpm --filter @poojly/web add workbox-webpack-plugin
```

## Engineering tickets

- R-Q2-E-016a: Service worker registration
- R-Q2-E-016b: Workbox config
- R-Q2-E-016c: /offline.html design + content
- R-Q2-E-016d: Cache strategy per route

## Closes

R-Q2-E-016 — spec shipped.
