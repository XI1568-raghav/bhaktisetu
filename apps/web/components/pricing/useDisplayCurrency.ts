'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import {
  browserTimeZone,
  readStoredCurrency,
  resolveDisplayCurrency,
  storeCurrency,
  type DisplayCurrency,
} from '../../lib/nri-pricing';

const CHANGE_EVENT = 'darshya:display-currency';

/**
 * The currency this devotee is shown prices in, and a setter that remembers the
 * choice. Server render and first client render are always INR (so hydration
 * matches); the real answer is resolved after mount from, in order: the
 * remembered choice, the signed-in `isNri` flag, the browser timezone.
 *
 * Only the DISPLAY changes. The booking wizard tells the server which price it
 * is showing (`nriPricing`), and the order is INR either way.
 */
export function useDisplayCurrency(): {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  /** false until the browser has resolved the real preference */
  ready: boolean;
} {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('INR');
  const [ready, setReady] = useState(false);
  const [profileIsNri, setProfileIsNri] = useState<boolean | null>(null);

  // useAuth throws outside an AuthProvider (isolated renders, some error pages).
  // Hooks run in the same order either way, so a guarded read is safe.
  let accessToken: string | undefined;
  let userIsNri: boolean | undefined;
  try {
    const auth = useAuth(); // eslint-disable-line react-hooks/rules-of-hooks
    accessToken = auth.session?.accessToken;
    userIsNri = auth.user?.isNri;
  } catch {
    /* no provider: anonymous behaviour */
  }

  // login responses do not carry isNri; ask /auth/me once for signed-in users.
  useEffect(() => {
    if (userIsNri !== undefined) {
      setProfileIsNri(userIsNri);
      return;
    }
    if (!accessToken || accessToken.startsWith('demo-')) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.user) setProfileIsNri(d.user.isNri === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, userIsNri]);

  const resolve = useCallback(
    () =>
      resolveDisplayCurrency({
        stored: readStoredCurrency(),
        timeZone: browserTimeZone(),
        isNri: profileIsNri,
      }),
    [profileIsNri],
  );

  useEffect(() => {
    setCurrencyState(resolve());
    setReady(true);
    const onChange = () => setCurrencyState(resolve());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [resolve]);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    storeCurrency(c);
    setCurrencyState(c);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { currency, setCurrency, ready };
}
