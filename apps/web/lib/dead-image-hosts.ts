/**
 * PF-04 / F066 — hosts that are known not to resolve, so we never ask.
 *
 * `images.darshya.online` has no DNS record. Measured again on 2026-09-01, with
 * production back up after the billing suspension:
 *
 *   $ nslookup images.darshya.online
 *   *** can't find images.darshya.online: Non-existent domain
 *   $ curl -o /dev/null -w '%{http_code}' https://images.darshya.online/priests/pandit-ramesh-shastri.jpg
 *   000                                    (connection never established)
 *
 * and the live wedding page still serves those URLs:
 *
 *   $ curl -s https://darshya.online/pujas/marriage | grep -o 'images\.darshya\.online[^"]*'
 *   images.darshya.online/priests/pandit-ramesh-shastri.jpg
 *   images.darshya.online/priests/pandit-suresh-trivedi.jpg
 *   (…twice more, escaped, inside the RSC payload)
 *
 * The audit asked for two things: an `onError` fallback, AND that the `src`
 * values stop pointing at a host that cannot answer. `PanditAvatar` and
 * `AvatarWithFallback` did the first — a dead URL degrades to initials instead
 * of a broken-image icon. This is the second, done in code rather than by
 * waiting for a DNS record that would still 404 (no origin in this project
 * serves `/priests/*.jpg`).
 *
 * Why `onError` alone is not enough, even though it hides the icon:
 *
 *  - The browser still ISSUES the request, fails DNS resolution, and logs
 *    `net::ERR_NAME_NOT_RESOLVED` — the console error the sweep recorded.
 *  - The swap only happens after that failure, so the trust panel on a page
 *    asking for ₹25,000–₹51,000 flashes an empty/broken box first. DNS failure
 *    is not instant on a bad mobile connection.
 *  - `onError` never fires during server rendering, so the SSR'd HTML contains
 *    the broken `<img>` and only the hydrated client repairs it.
 *
 * Treating the host as unusable up front removes all three: the initials tile
 * is what gets rendered, on the server and on the client, with no request at
 * all.
 *
 * This list is for hosts that are DEAD, not merely slow or occasionally down.
 * The correct long-term fix is still to stop writing these URLs — the seed no
 * longer does (guarded by `__tests__/pf04-dead-avatar-host-surfaces.test.ts`),
 * but rows written before that are still in `priests.avatar_url` in production.
 */

/**
 * Hostnames with no DNS record that this product nonetheless has URLs for.
 * Compared case-insensitively against the URL's host, exactly — a subdomain
 * suffix match would also swallow a future, working `cdn.images.darshya.online`.
 */
export const DEAD_IMAGE_HOSTS: readonly string[] = ['images.darshya.online'];

/**
 * True when `url` points at a host known not to resolve.
 *
 * Anything that is not an absolute http(s) URL returns false: a relative
 * `/priests/x.jpg` is served by this origin and is not this function's problem,
 * and a malformed value is already handled by the callers' own emptiness check.
 */
export function isDeadImageHost(url: string | null | undefined): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  let host: string;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  return DEAD_IMAGE_HOSTS.includes(host);
}

/**
 * `url` if it is worth requesting, else null. The shape the avatar components
 * want: they already treat null as "there is no photo".
 */
export function usableImageSrc(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return isDeadImageHost(trimmed) ? null : trimmed;
}
