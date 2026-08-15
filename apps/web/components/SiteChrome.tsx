'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * RESP-10 (prod sweep 2026-08-12): provider and admin portals stacked THREE
 * bars of chrome on a 390x844 phone — the global marketing header (fixed,
 * 0→65), the portal's own sticky header (64→128) and the consumer bottom tab
 * bar (787→844). 185px, 21.9% of the viewport, permanently. The consumer
 * chrome also leaked in: the header advertised "Cart (0 items)" and the bottom
 * bar a devotee "Book" tab while an admin was signed in.
 *
 * A portal route gets exactly one top bar — its own — and no shopping chrome.
 * `usePathname` resolves during SSR in the App Router, so the server markup
 * already omits the header and there is no hydration flash.
 */

export const PORTAL_ROUTE_PREFIXES = [
  '/admin',
  '/priest',
  '/astrologer-portal',
  '/gaushala-portal',
  '/gurukul-portal',
  '/store-admin',
  '/temple-portal',
  '/wellness-portal',
] as const;

export function isPortalRoute(pathname: string): boolean {
  return PORTAL_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The consumer <main> is offset for the fixed header (pt-16) and padded for
 * the bottom tab bar (pb-20 + safe area). A portal has neither, so it must not
 * carry either offset — that is where the last 65px of dead space came from.
 */
const CONSUMER_MAIN =
  'flex-1 pt-16 pb-20 md:pb-0 ' +
  '[@supports(padding:env(safe-area-inset-bottom))]:pb-[calc(5rem+env(safe-area-inset-bottom))] ' +
  'md:[@supports(padding:env(safe-area-inset-bottom))]:pb-0';

const PORTAL_MAIN = 'flex-1';

export function SiteChrome({
  header,
  tabs,
  children,
}: {
  header: ReactNode;
  tabs: ReactNode;
  children: ReactNode;
}) {
  const portal = isPortalRoute(usePathname() ?? '/');

  /**
   * A11Y-15: /admin measured {"main":2} against {"main":1} everywhere else,
   * because every portal layout renders its own <main> inside this one — two
   * "main" entries in the landmark rotor with no way to tell them apart. The
   * portal's own <main> is the right one (it excludes the portal sidebar), so
   * out here the wrapper drops to a div on those routes. It keeps id="main"
   * either way, so the skip link never breaks.
   */
  const Wrapper = portal ? 'div' : 'main';

  return (
    <>
      {!portal && header}
      {/*
       * HN-09: the skip link in app/layout.tsx points here. A browser refuses
       * to move focus to an element that is not focusable, so the hash changed
       * and activeElement stayed on BODY — the next Tab restarted at the top of
       * the header. -1 makes it programmatically focusable without adding a
       * stop to the Tab sequence.
       */}
      <Wrapper id="main" tabIndex={-1} className={portal ? PORTAL_MAIN : CONSUMER_MAIN}>
        {children}
      </Wrapper>
      {!portal && tabs}
    </>
  );
}

export default SiteChrome;
