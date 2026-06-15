/* Darshya service worker — push notifications + offline page fallback.
 *
 * Push-notification contract preserved unchanged (see install/activate/push/notificationclick).
 *
 * Offline-page handling:
 *  - Precache /offline shell on install.
 *  - On navigation requests (mode === 'navigate'), try network first.
 *  - On network failure, serve cached page if any; else serve /offline.
 *  - We do NOT cache app shells aggressively — Next.js on Cloudflare Pages handles its own
 *    caching, and competing cache layers cause stale-UI bugs. Offline page is the floor only.
 *  - Scope of offline fallback intentionally covers /pujas/* + /darshan/* navigation
 *    (per R-Q2-E-016 spec) but the cache fallback is global so every route benefits.
 */

const OFFLINE_CACHE = 'darshya-offline-v1';
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.addAll(PRECACHE_URLS);
      } catch (err) {
        // Precache failure must not block SW install; navigations will still
        // attempt network and fall back to a minimal inline response.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('darshya-offline-') && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(req);
        return networkResponse;
      } catch (err) {
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>You are offline</h1><p>Reconnect to continue using Darshya.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Darshya', body: event.data.text() };
  }
  const title = payload.title || 'Darshya';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: payload.tag,
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(target) && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
