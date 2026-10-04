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
//   darshya://reset-password/{token}   → (auth)/reset-password?token=…
//   https://darshya.online/auth/reset-password → (auth)/reset-password
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
  const fallback: DeepLinkRoute = { pathname: '/(devotee)' };
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
  const MAX_SLUG_LEN = 256;
  const decoded = decodeURIComponent(rest[0] ?? '').slice(0, MAX_SLUG_LEN);

  switch (head) {
    case 'puja':
      if (decoded) return { pathname: '/(devotee)/puja-book', params: { slug: decoded } };
      return fallback;
    case 'darshan':
      if (decoded) return { pathname: '/(devotee)/darshan-player', params: { id: decoded } };
      return fallback;
    case 'booking':
      if (decoded) return { pathname: '/(devotee)/bookings', params: { bn: decoded } };
      return fallback;
    case 'consultation':
      if (decoded) return { pathname: '/(devotee)/consultations', params: { id: decoded } };
      return fallback;
    case 'chat':
    case 'inbox':
      if (decoded) return { pathname: '/(devotee)/messages', params: { thread: decoded } };
      return { pathname: '/(devotee)/messages' };
    case 'order':
      if (decoded) return { pathname: '/(devotee)/store', params: { id: decoded } };
      return fallback;
    case 'today':
      return fallback;

    // A password-reset link opened on the phone.
    //
    // `app/(auth)/reset-password.tsx` exists and had NO in-app entry point at
    // all: nothing pushes it, and this table did not name it, so a devotee who
    // tapped the reset link in their email landed on `/(devotee)` — which the
    // RoleGuard then bounced to the login screen, with no explanation of what
    // happened to their link. That is a dead end, and it is the worst place in
    // the product to have one.
    //
    // The screen it now reaches cannot set a password and does not pretend to:
    // Supabase carries the recovery credential in the URL FRAGMENT, which
    // `url.pathname` never sees and which no client in this app could consume
    // anyway (apps/mobile has no @supabase/supabase-js). What the screen does
    // is say so and open the system browser on the page that really performs
    // the reset. Landing there beats landing on a login form.
    //
    // The token is passed through only so the screen can tell "arrived from a
    // real link" from "opened cold". It is never rendered, logged or put in a
    // URL — see the screen's own note. It is a credential.
    //
    // ⚠️ WHEN UNIVERSAL LINKS ARE ACTIVATED: the reset flow completes in the
    // BROWSER, not here. If `ios.associatedDomains` / the Android intent
    // filters claim `darshya.online/auth/*`, the OS hands the link to the app
    // and the fragment is lost, so the user needs a second email. Scope the
    // domain patterns to exclude `/auth/*` and this case only ever serves the
    // custom scheme.
    case 'reset-password':
      return decoded
        ? { pathname: '/(auth)/reset-password', params: { token: decoded } }
        : { pathname: '/(auth)/reset-password' };

    // The web path is /auth/reset-password, so the head is `auth`.
    case 'auth':
      if (decoded === 'reset-password') {
        const token = decodeURIComponent(rest[1] ?? '').slice(0, MAX_SLUG_LEN);
        return token
          ? { pathname: '/(auth)/reset-password', params: { token } }
          : { pathname: '/(auth)/reset-password' };
      }
      return fallback;

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
