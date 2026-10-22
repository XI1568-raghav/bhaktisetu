'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side navigation that degrades to a full page load.
 *
 * WHY THIS EXISTS (devotee QA 2026-10-22, items 1 and 2). After a successful
 * sign-in the login page did `window.location.href = target`. That is a FULL
 * document load, and since SEC-02 step 4 the access token lives only in React
 * state (it is no longer written to localStorage). A full load therefore threw
 * the fresh session away, and the destination page had to re-mint one from the
 * httpOnly refresh cookie (POST /auth/refresh, a second cross-origin round trip
 * to a possibly cold API plus a Supabase refresh) before it could call anything.
 * That is the "keeps loading" lag, and it is the window in which /dashboard
 * rendered "We could not verify your sign-in".
 *
 * A soft navigation keeps the AuthProvider, and with it the session that sign-in
 * just returned, so the destination's first request carries a token that is
 * seconds old.
 *
 * `useRouter` throws when no App Router is mounted (unit tests, isolated
 * renders). The hook order is unaffected by the try/catch, and the fallback is
 * the previous behaviour, so nothing that worked before stops working.
 */
export function useSoftNavigate(): (href: string) => void {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  return useCallback(
    (href: string) => {
      if (router) router.replace(href);
      else if (typeof window !== 'undefined') window.location.href = href;
    },
    [router],
  );
}
