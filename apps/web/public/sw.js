/* Darshya service worker — push notifications only.
 *
 * Kept intentionally minimal. We do NOT cache app shell here because
 * Next.js on Cloudflare Pages already handles caching, and adding a
 * cache layer here would compete with it (stale UI bugs).
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
