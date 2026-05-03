'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { API_BASE_URL } from './api-config';

// Layer AR — premium hook. Used by AQ ad-gate, NRI surcharge bypass,
// priority-booking gating, and the M3 AI astro paywall waiver.

export function useIsPremium(): { isPremium: boolean; loading: boolean } {
  const { isAuthenticated, session } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !session?.accessToken) {
      setIsPremium(false);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/subscriptions/is-premium`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok) throw new Error(`is-premium ${res.status}`);
        const data = (await res.json()) as { isPremium?: boolean };
        if (!cancelled) setIsPremium(!!data.isPremium);
      } catch {
        if (!cancelled) setIsPremium(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session?.accessToken]);

  return { isPremium, loading };
}
