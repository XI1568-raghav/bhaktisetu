'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, Wifi } from 'lucide-react';
import { registerConnectivityListeners } from '../lib/offline-recovery';

/**
 * RES-13 — the global connectivity bar.
 *
 * `public/sw.js` answers a failed NAVIGATION with the precached /offline shell,
 * and `app/offline/online-recovery.tsx` reloads that shell when the connection
 * returns. That covers a user who tried to go somewhere. It covers nobody who
 * was already on a rendered route when the connection dropped: every subsequent
 * fetch fails, each surface renders its own error in its own words, and the
 * product reads as broken rather than as disconnected. This bar is the missing
 * half — mounted in the root layout, so it is on every route.
 *
 * RECOVERY IS `router.refresh()`, NOT A RELOAD. The user is already on the
 * route they want; a reload throws away scroll position and client state to
 * achieve what a re-render achieves. (The /offline shell is the opposite case —
 * there the URL is the route the user asked for and the shell is not it, so a
 * real reload is correct. Two different problems, two different remedies.)
 *
 * `navigator.onLine` IS NEVER READ. It reports the presence of a link, not of
 * reachable network: it reads `true` behind a captive portal or a dead uplink,
 * and it can read `false` on a working connection. Driving this off the level
 * would show "You are offline" to people who are online and, worse, would fire
 * recovery for a captive-portal user on every mount. The TRANSITION is the
 * signal; the level is not. `lib/offline-recovery.ts` enforces the same rule and
 * is event-only by construction.
 *
 * That is also why nothing renders until an event arrives: at mount we do not
 * know, and claiming to is the defect.
 *
 * Guarded by __tests__/res13-global-offline-bar.test.tsx.
 */
export default function ConnectivityBar() {
  const router = useRouter();
  const [state, setState] = useState<'unknown' | 'offline' | 'recovered'>('unknown');
  // Whether an outage actually happened. A bare `online` event with no
  // preceding `offline` means nothing was broken, and refreshing on it would
  // make a flapping connection re-render the page for no benefit.
  const wasOffline = useRef(false);

  useEffect(() => {
    return registerConnectivityListeners({
      onOffline: () => {
        wasOffline.current = true;
        setState('offline');
      },
      onOnline: () => {
        if (!wasOffline.current) return;
        wasOffline.current = false;
        setState('recovered');
        router.refresh();
      },
    });
  }, [router]);

  // Clear the "back online" note once the refresh has had a moment to land.
  useEffect(() => {
    if (state !== 'recovered') return;
    const timer = setTimeout(() => setState('unknown'), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === 'unknown') return null;

  const offline = state === 'offline';

  return (
    <div
      role="status"
      aria-live="polite"
      // A11Y-10: emerald-700, not emerald-600. White on emerald-600 is 3.77:1,
      // below the 4.5:1 AA body threshold — and this bar is a status message,
      // which is exactly the copy a low-vision user must be able to read.
      // __tests__/accent-fill-contrast.test.ts enforces it repo-wide.
      className={`fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        offline ? 'bg-surface-800 text-white' : 'bg-emerald-700 text-white'
      }`}
    >
      {offline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>You are offline. Some things on this page may not load or save.</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Back online — refreshing this page.</span>
        </>
      )}
    </div>
  );
}
