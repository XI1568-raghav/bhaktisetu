/**
 * Per-IP ceiling that sits ABOVE the per-credential rate limit.
 *
 * rateLimitKey partitions signed-in traffic by a hash of the bearer token, and
 * it cannot verify that token (it runs in an onRequest hook, before auth). So
 * any caller can send `Authorization: Bearer <random>` and get a fresh bucket
 * per request: the per-credential limit never bites for them. Measured
 * 2026-10-13 against an API with real limits. This ceiling counts every request
 * by client IP regardless of credential, at a multiple of the normal limit, so
 * the rotation trick is capped without throttling a real user.
 */
export interface CeilingResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function createIpCeiling(max: number, windowMs = 60_000, maxEntries = 50_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function check(ip: string, now = Date.now()): CeilingResult {
    if (!(max > 0)) return { limited: false, retryAfterSeconds: 0 };
    let e = hits.get(ip);
    if (!e || e.resetAt <= now) {
      if (hits.size >= maxEntries) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
        if (hits.size >= maxEntries) hits.clear();
      }
      e = { count: 0, resetAt: now + windowMs };
      hits.set(ip, e);
    }
    e.count += 1;
    return e.count > max
      ? { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) }
      : { limited: false, retryAfterSeconds: 0 };
  };
}
