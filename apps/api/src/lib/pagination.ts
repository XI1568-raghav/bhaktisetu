/**
 * Pagination input hardening.
 *
 * RES-12 (2026-08-12): `page` arrived from the query string as
 * `Number(page) || 1`, which lets a NEGATIVE page through untouched — `-1` is
 * a perfectly good number, so the `|| 1` fallback never fires. Every list
 * service then computes `skip = (page - 1) * limit`, so `?page=-1` asks
 * Postgres for `OFFSET -40` and Prisma rejects it. Measured against the live
 * API: GET /api/v1/temples?page=-1 -> 500 {"error":"Failed to fetch temples"},
 * /api/v1/pujas/types?page=-1 -> 500, /api/v1/content?page=-1 -> 500, while
 * ?page=1 -> 200. Those are three of the most-crawled public catalogue
 * endpoints, so a scanner or a hand-edited URL turns a client input mistake
 * into a server error in monitoring.
 *
 * A page number is an ordinal: the smallest legal value is 1, and anything
 * that is not a finite number is "the first page". Clamp at the boundary and
 * answer 200 with page 1 rather than 500.
 */

/** Clamp any caller-supplied page to a 1-based ordinal. */
export function clampPage(value: unknown, fallback = 1): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return Math.max(1, Math.floor(fallback));
  const floored = Math.floor(n);
  return floored < 1 ? 1 : floored;
}

/**
 * Clamp any caller-supplied page size into [1, max].
 *
 * A negative `take` is legal in Prisma (it means "walk backwards from the
 * cursor") but it is never what a public list endpoint means by `?limit=-5`,
 * and combined with a skip it silently returns a different window than the
 * caller asked for.
 */
export function clampLimit(value: unknown, fallback = 20, max = 100): number {
  const safeFallback = Math.min(Math.max(1, Math.floor(fallback)), max);
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return safeFallback;
  return Math.min(Math.floor(n), max);
}

/** `skip` for a 1-based page — never negative, whatever the caller sent. */
export function pageSkip(page: unknown, limit: unknown, defaultLimit = 20, max = 100): number {
  return (clampPage(page) - 1) * clampLimit(limit, defaultLimit, max);
}
