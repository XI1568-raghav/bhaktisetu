'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { API_BASE_URL } from './api-config';

/**
 * QA pricing: a tester account on the server's QA_PAYER_EMAILS allowlist pays
 * about Rs 1 per flow (no platform fee, no prasad fee, no store delivery fee,
 * donation minimum Rs 1, consultation minimum Rs 1 / 1 minute).
 *
 * The SERVER is the authority: it decides from the signed-in account's email on
 * every priced request. This flag only makes the page show the same numbers the
 * server will charge (otherwise the API's own total check would refuse the
 * order), so it is read fresh from `GET /auth/me` -> `user.qaPricing` once per
 * page load and never from anything the visitor can set (not the address bar,
 * not any saved browser state, not the persisted session user, which could go stale).
 *
 * Without a flag, or on any error, every page shows the normal prices.
 */

export const QA_PRICING_BANNER_TEXT = 'QA pricing active: fees waived for this tester account';

/** Normal-customer minimums, and the QA ones, mirrored from apps/api/src/lib/qa-payer.ts. */
export const QA_DONATION_MIN_INR = 1;
export const CONSULTATION_MIN_MINUTES = 5;
export const QA_CONSULTATION_MIN_MINUTES = 1;

/** `data` is the parsed GET /auth/me body. Only a literal `true` counts. */
export function qaPricingFromMe(data: unknown): boolean {
  const user = (data as { user?: { qaPricing?: unknown } } | null | undefined)?.user;
  return user?.qaPricing === true;
}

// One /auth/me read per access token per page load, shared by every component.
const byToken = new Map<string, Promise<boolean>>();

function loadQaPricing(accessToken: string): Promise<boolean> {
  let p = byToken.get(accessToken);
  if (!p) {
    p = fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(qaPricingFromMe)
      .catch(() => false);
    byToken.set(accessToken, p);
  }
  return p;
}

/** Test hook: forget cached answers. */
export function resetQaPricingCache(): void {
  byToken.clear();
}

/** True only for a signed-in tester on the server allowlist. false until known. */
export function useQaPricing(): boolean {
  const [qa, setQa] = useState(false);

  // useAuth throws outside an AuthProvider; hooks run in the same order either way.
  let accessToken: string | undefined;
  try {
    const auth = useAuth(); // eslint-disable-line react-hooks/rules-of-hooks
    accessToken = auth.session?.accessToken;
  } catch {
    /* no provider: normal prices */
  }

  useEffect(() => {
    if (!accessToken || accessToken.startsWith('demo-')) {
      setQa(false);
      return;
    }
    let cancelled = false;
    void loadQaPricing(accessToken).then((v) => {
      if (!cancelled) setQa(v);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return qa;
}
