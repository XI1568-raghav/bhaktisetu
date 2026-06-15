import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

// Deep-link parser hook for push-tap routing.
//
// Contract: every push payload from apps/api/src/services/push-notifier.ts
// MUST include data.deepLink as a darshya:// or https://darshya.online URL.
// This hook is the only place those strings turn into expo-router paths.
//
// URL map (frozen — see docs/engineering/R-Q2-E-014-mobile-push-deep-linking-handoff.md):
//   darshya://puja/{slug}              → (devotee)/puja-details?slug=…
//   darshya://darshan/{streamId}       → (devotee)/darshan-player?id=…
//   darshya://booking/{bookingNumber}  → (devotee)/booking-detail?bn=…
//   darshya://consultation/{id}        → (devotee)/consultation?id=…
//   darshya://chat/{threadId}          → (devotee)/inbox?thread=…
//   darshya://order/{orderId}          → (devotee)/order-detail?id=…
//   darshya://today                    → (devotee)/today
//   https://darshya.online/{any}       → mirrors darshya:// scheme (Universal Link)
//   (unknown)                          → (devotee)/home  (never crash, never freeze)
//
// Activation gates:
//   - Apple Team ID + AASA hosted at darshya.online/.well-known/apple-app-site-association
//   - Android SHA-256 + assetlinks.json at darshya.online/.well-known/assetlinks.json
//   - app.json ios.associatedDomains + android.intentFilters added
//   - EAS rebuild + TestFlight + Play Internal Track verification
//
// Until then this hook is mounted but inert — no push payloads include data.deepLink
// because push-notifier hasn't been extended yet, and Linking.getInitialURL() returns
// null when the app is launched from the home screen (not from a link tap).

type DeepLinkRoute =
  | { pathname: string; params?: Record<string, string> };

const WEB_HOST = 'darshya.online';
const SCHEME = 'darshya:';

export function parseDeepLink(rawUrl: string | null | undefined): DeepLinkRoute {
  const fallback: DeepLinkRoute = { pathname: '/(devotee)/home' };
  if (!rawUrl) return fallback;

  // Normalize darshya://x and https://darshya.online/x to a single shape.
  let path: string;
  try {
    const url = new URL(rawUrl);
    if (url.protocol === SCHEME) {
      // For custom-scheme URLs `new URL` treats the first segment as host.
      // darshya://puja/rudrabhishek → host=puja, pathname=/rudrabhishek
      path = `/${url.host}${url.pathname}`.replace(/\/+/g, '/');
    } else if (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.hostname === WEB_HOST
    ) {
      path = url.pathname || '/';
    } else {
      return fallback;
    }
  } catch {
    return fallback;
  }

  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length === 0) return fallback;

  const [head, ...rest] = segments;

  switch (head) {
    case 'puja':
      if (rest[0]) return { pathname: '/(devotee)/puja-details', params: { slug: rest[0] } };
      return fallback;
    case 'darshan':
      if (rest[0]) return { pathname: '/(devotee)/darshan-player', params: { id: rest[0] } };
      return fallback;
    case 'booking':
      if (rest[0]) return { pathname: '/(devotee)/booking-detail', params: { bn: rest[0] } };
      return fallback;
    case 'consultation':
      if (rest[0]) return { pathname: '/(devotee)/consultation', params: { id: rest[0] } };
      return fallback;
    case 'chat':
    case 'inbox':
      if (rest[0]) return { pathname: '/(devotee)/inbox', params: { thread: rest[0] } };
      return { pathname: '/(devotee)/inbox' };
    case 'order':
      if (rest[0]) return { pathname: '/(devotee)/order-detail', params: { id: rest[0] } };
      return fallback;
    case 'today':
      return { pathname: '/(devotee)/today' };
    default:
      return fallback;
  }
}

interface DeepLinkRouter {
  push: (route: { pathname: string; params?: Record<string, string> }) => void;
}

export function useDeepLinkRouter(routerOverride?: DeepLinkRouter): void {
  const router = useRouter();
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    const navigate = (url: string | null) => {
      if (!url) return;
      if (handled.current.has(url)) return;
      handled.current.add(url);
      const route = parseDeepLink(url);
      try {
        const target = routerOverride ?? router;
        // expo-router accepts the same { pathname, params } shape; cast keeps
        // this file portable across expo-router minor versions.
        (target as DeepLinkRouter).push(route);
      } catch {
        // Never crash the app on a bad deep link — drop to fallback silently.
      }
    };

    // Cold-launch: app started from a link tap.
    Linking.getInitialURL().then(navigate).catch(() => {});

    // Warm tap: app already running, link tapped (push notification or
    // Universal Link).
    const sub = Linking.addEventListener('url', ({ url }) => navigate(url));
    return () => {
      sub.remove();
    };
  }, [router, routerOverride]);
}
