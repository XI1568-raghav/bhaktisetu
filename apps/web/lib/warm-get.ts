import { DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';

/**
 * Start a GET before the component that needs it has mounted, and hand the in-flight
 * request to that component when it does.
 *
 * Measured on prod 2026-10-30 (priest portal, first screen): `POST /auth/refresh`, then
 * `/priest/dashboard`, `/provider-kyc` and `/payouts/balance` together, then
 * `/priest/temple-invites` and `/onboarding/provider` only AFTER the dashboard returned,
 * because the two cards that ask for them are not mounted while the page shows its
 * loading spinner. That third level was a whole API round trip of waiting for nothing.
 * The page now calls `warmGet` for both in the same effect that starts the dashboard, and
 * the cards `takeWarmed` the request instead of issuing their own.
 *
 * Rules that keep it safe: an entry is keyed on url AND token (a different session never
 * receives it), is consumed exactly once (a reload, a retry or an action that refreshes
 * the data always makes a fresh request), and expires after 20 s so a card that never
 * mounts cannot hand out an old answer later.
 */
const TTL_MS = 20_000;
const pending = new Map<string, { at: number; request: Promise<Response> }>();

const keyOf = (url: string, token: string) => `${token}\n${url}`;

export function warmGet(url: string, token: string, timeoutMs: number = DATA_FETCH_TIMEOUT_MS): void {
  const key = keyOf(url, token);
  const hit = pending.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return;
  const request = fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } }, timeoutMs);
  // A rejection nobody takes must not surface as an unhandled rejection.
  request.catch(() => undefined);
  pending.set(key, { at: Date.now(), request });
}

/** The warmed request for exactly this url and token, once; null when there is none (or it is stale). */
export function takeWarmed(url: string, token: string): Promise<Response> | null {
  const key = keyOf(url, token);
  const hit = pending.get(key);
  if (!hit) return null;
  pending.delete(key);
  return Date.now() - hit.at < TTL_MS ? hit.request : null;
}

/** Test hook. */
export function __warmGetClear(): void {
  pending.clear();
}
