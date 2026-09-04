'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout, readJsonBody } from './api-config';

/**
 * Server-truth entitlement client — TC-04 / PM-05 (F057).
 *
 * Two premium hooks shipped before this file and neither could gate anything:
 *
 *   apps/web/lib/use-premium.ts        asked the server (GET /subscriptions/
 *                                     is-premium) and had ZERO call sites.
 *                                     DELETED in this change — described in
 *                                     the past tense because the file is gone;
 *                                     kept in this note because the reason it
 *                                     existed is the reason this file does.
 *   apps/web/components/useIsPremium.ts has one call site (AdSlot.tsx) and
 *                                     never asks the server at all — it tests
 *                                     `user.subscriptionTier` against a
 *                                     hardcoded set of four tier strings. No
 *                                     API path ever writes User.subscription-
 *                                     Tier when a subscription activates, so
 *                                     the one gate that was wired could not
 *                                     fire for the plan that sold it.
 *
 * The failure mode both share is that "premium" is a boolean about a PERSON,
 * so every consumer has to guess which of six benefits it licenses. This asks
 * by CAPABILITY instead: `useEntitlement('ads.suppressed')` means exactly one
 * thing, and the server only returns capabilities something actually
 * enforces (apps/api/src/services/subscription-entitlements.ts).
 *
 * The failure default is DENY. A network error, a timeout, a 5xx or a signed
 * out user all resolve to "no entitlement", never to "assume premium".
 *
 * NOTE the timeout. The deleted `lib/use-premium.ts` called bare `fetch` with
 * no AbortController — the RES-01 / AUTH-01 class that leaves a component
 * spinning forever on a half-open socket. Every request here goes through
 * `fetchWithTimeout`.
 */

export type EntitlementKey =
  | 'ads.suppressed'
  | 'booking.nri_surcharge_waived'
  | 'booking.priority_window'
  | 'consultation.weekly_priest_call'
  | 'donation.receipt_pdf_free'
  | 'ai_astro.unlimited';

export interface EntitlementSnapshot {
  tier: string | null;
  entitlements: EntitlementKey[];
}

export const NO_ENTITLEMENTS: EntitlementSnapshot = { tier: null, entitlements: [] };

/**
 * Fetches the caller's entitlements. Resolves to NO_ENTITLEMENTS on any
 * failure — a gate must never open because a request went wrong.
 */
export async function fetchEntitlements(accessToken?: string | null): Promise<EntitlementSnapshot> {
  if (!accessToken) return NO_ENTITLEMENTS;

  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/subscriptions/entitlements`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      DATA_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return NO_ENTITLEMENTS;

    const body = await readJsonBody<Partial<EntitlementSnapshot>>(res);
    if (!body || !Array.isArray(body.entitlements)) return NO_ENTITLEMENTS;

    return {
      tier: typeof body.tier === 'string' ? body.tier : null,
      entitlements: body.entitlements.filter((k): k is EntitlementKey => typeof k === 'string'),
    };
  } catch {
    return NO_ENTITLEMENTS;
  }
}

/**
 * Whether a snapshot licenses one specific capability. Kept separate from the
 * hook so server components and non-React callers can use the same rule.
 */
export function hasEntitlement(snapshot: EntitlementSnapshot, key: EntitlementKey): boolean {
  return snapshot.entitlements.includes(key);
}

/**
 * React hook for a single capability.
 *
 * `loading` exists so a consumer can hold a benefit-bearing UI back rather
 * than flashing the un-entitled state; it must never be treated as "granted".
 */
export function useEntitlement(key: EntitlementKey): { granted: boolean; loading: boolean } {
  const { isAuthenticated, session } = useAuth();
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(NO_ENTITLEMENTS);
  const [loading, setLoading] = useState(true);

  const token = session?.accessToken;

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !token) {
      setSnapshot(NO_ENTITLEMENTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      const next = await fetchEntitlements(token);
      if (cancelled) return;
      setSnapshot(next);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  return { granted: hasEntitlement(snapshot, key), loading };
}
