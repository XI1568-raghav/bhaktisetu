/* Darshya service worker — push notifications + offline page fallback.
 *
 * Push-notification contract preserved unchanged (see install/activate/push/notificationclick).
 *
 * Offline-page handling:
 *  - Precache /offline shell on install.
 *  - On navigation requests (mode === 'navigate'), try network first.
 *  - On success, keep a bounded copy of the page in a RUNTIME cache.
 *  - On network failure, serve that cached page if we have one; else /offline.
 *  - Scope of offline fallback intentionally covers /pujas/* + /darshan/* navigation
 *    (per R-Q2-E-016 spec) but the cache fallback is global so every route benefits.
 *
 * RES-13 (prod sweep 2026-08-12) — the cached-page branch was DEAD CODE.
 *
 * The sweep found that an offline navigation to a never-visited /pujas/home-puja
 * correctly rendered the offline shell, and a second offline navigation to
 * /temples rendered a COMPLETELY BLANK page. Cache inspection explained both:
 * `caches` held exactly `{darshya-offline-v1: ['/offline']}`. Nothing ever wrote
 * a page into a cache, so `cache.match(req)` below could never hit for any real
 * route, and a page the devotee had already read a minute earlier was as
 * unavailable offline as one they had never opened.
 *
 * The audit's instruction was "either start populating the runtime cache on
 * successful navigations (so the cached-page branch is real) or delete that dead
 * branch". Populating it is the version that helps a user on a metro: the page
 * they were just reading comes back instead of a generic apology.
 *
 * Three rules keep this from becoming the stale-UI bug the old comment feared:
 *
 *  1. NETWORK FIRST, ALWAYS. The cache is only ever read after `fetch` throws.
 *     Online, every navigation is a fresh network response, so a deploy can
 *     never be shadowed by a cached shell.
 *  2. RUNTIME CACHE IS SEPARATE AND CAPPED. `darshya-runtime-v1` holds at most
 *     RUNTIME_MAX entries, evicted oldest-first, and is never precached. The
 *     offline shell keeps its own cache so a runtime eviction can never take
 *     the last-resort fallback with it.
 *  3. ONLY 200 OK, SAME-ORIGIN, BASIC RESPONSES. A redirect, a 404, an opaque
 *     cross-origin response or an auth-gated 401 must never be replayed later
 *     as if it were the page.
 *
 * `activate` deletes every cache whose name starts with `darshya-` and is not
 * one of the two current ones, so bumping either version string cleans up.
 */

const OFFLINE_CACHE = 'darshya-offline-v1';
const RUNTIME_CACHE = 'darshya-runtime-v1';
const CURRENT_CACHES = [OFFLINE_CACHE, RUNTIME_CACHE];
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL];
/* Enough for a browsing session's worth of pages; small enough that the cache
 * cannot grow without bound on a device the user never clears. */
const RUNTIME_MAX = 30;

/**
 * Store `response` for `request` in the runtime cache, then trim to RUNTIME_MAX.
 * `cache.keys()` returns insertion order, so slicing from the front evicts the
 * oldest. Every failure here is swallowed: a cache write must never turn a
 * successful navigation into a broken one.
 */
async function putRuntime(request, response) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response);
    const keys = await cache.keys();
    if (keys.length > RUNTIME_MAX) {
      await Promise.all(keys.slice(0, keys.length - RUNTIME_MAX).map((k) => cache.delete(k)));
    }
  } catch (err) {
    /* no-op */
  }
}

/**
 * True only for a response it is safe to replay offline as "the page".
 * `type === 'basic'` excludes opaque cross-origin responses; `!redirected`
 * excludes a login bounce being cached under the URL it bounced from.
 */
function isCacheableNavigation(response) {
  return (
    !!response &&
    response.status === 200 &&
    response.type === 'basic' &&
    !response.redirected
  );
}

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
      // RES-13: was `darshya-offline-` only, which would have orphaned the
      // runtime cache for ever once its version string moved.
      await Promise.all(
        keys
          .filter((k) => k.startsWith('darshya-') && !CURRENT_CACHES.includes(k))
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
        // RES-13: this is the write that makes the read below real. The clone
        // is mandatory — a Response body can only be consumed once, and the
        // original has to go back to the page.
        if (isCacheableNavigation(networkResponse)) {
          const copy = networkResponse.clone();
          event.waitUntil(putRuntime(req, copy));
        }
        return networkResponse;
      } catch (err) {
        // RES-13: this used to read OFFLINE_CACHE, which by construction only
        // ever held '/offline' — so the "serve cached page if any" branch could
        // not fire for a single real route.
        const runtime = await caches.open(RUNTIME_CACHE);
        const cached = await runtime.match(req);
        if (cached) return cached;
        const cache = await caches.open(OFFLINE_CACHE);
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
