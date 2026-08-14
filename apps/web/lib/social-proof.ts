/**
 * CM-05 (prod sweep 2026-08-12) — real, database-derived social proof.
 *
 * THE RULE FOR THIS FILE: every number that reaches a page must be a COUNT the
 * server computed from `puja_bookings`. There is no fallback, no seed, no
 * "approximately", no rounding up. If the API cannot answer, callers get an
 * empty map and the UI renders nothing. An empty page is honest; "500+ pujas
 * completed" is what this codebase has been shipping and is not.
 *
 * SOURCE. GET /api/v1/pujas/types/popular already returns exactly what is
 * needed and required no API change: pujaService.getPopular() groups
 * `puja_bookings` by pujaTypeId filtered to status in
 * (completed, delivered, video_uploaded) and returns `bookingCount` per puja.
 * Those three statuses all mean the ritual was actually performed, so
 * "N pujas completed" is a true reading of the number.
 *
 * Two properties of that endpoint make fabrication structurally impossible:
 *   1. A puja with zero completed bookings is ABSENT from the response, so it
 *      gets no entry here and renders nothing.
 *   2. When the platform has no completed bookings at all, getPopular() falls
 *      back to a catalogue listing with `bookingCount: 0` for every row — which
 *      this module keeps as 0, and 0 renders nothing (see MIN_COMPLETIONS_TO_SHOW).
 *
 * Live values at time of writing (Postgres darshya_utf8, 2026-08-13):
 *   rudrabhishek 13 · ganesh-puja 0 (absent) · satyanarayan-katha 0 (absent).
 */

/** Slug → number of completed pujas, as counted by the API. */
export type PujaCompletionCounts = Record<string, number>;

/**
 * Below this, a count is noise rather than proof and nothing is rendered.
 * Deliberately a floor on TRUTH, not a floor on marketing: 2 real completions
 * is true but says nothing, so we stay silent instead of dressing it up.
 */
export const MIN_COMPLETIONS_TO_SHOW = 3;

function resolveApiBase(): string {
  const candidate =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

/**
 * Parse the /pujas/types/popular body into a slug → count map.
 *
 * Anything that is not a non-negative INTEGER is dropped, not coerced. A
 * string "13" from a future API change must not silently become 13 on a trust
 * surface — if the contract drifts, the badge disappears rather than guessing.
 */
export function completionsFromPayload(payload: unknown): PujaCompletionCounts {
  if (!payload || typeof payload !== 'object') return {};
  const rows = (payload as { pujaTypes?: unknown }).pujaTypes;
  if (!Array.isArray(rows)) return {};

  const out: PujaCompletionCounts = {};
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { slug, bookingCount } = row as { slug?: unknown; bookingCount?: unknown };
    if (typeof slug !== 'string' || slug.length === 0) continue;
    if (typeof bookingCount !== 'number') continue;
    if (!Number.isInteger(bookingCount) || bookingCount < 0) continue;
    out[slug] = bookingCount;
  }
  return out;
}

/**
 * Fetch real completion counts. Never throws; an outage yields `{}` so every
 * caller degrades to showing no social proof at all.
 */
export async function getPujaCompletionCounts(): Promise<PujaCompletionCounts> {
  try {
    const res = await fetch(`${resolveApiBase()}/pujas/types/popular?limit=50`, {
      next: { revalidate: 300, tags: ['pujas'] },
    } as RequestInit);
    if (!res.ok) return {};
    return completionsFromPayload(await res.json());
  } catch {
    return {};
  }
}

/** True when `count` is a real integer big enough to be worth stating. */
export function hasEnoughCompletions(count: unknown): count is number {
  return typeof count === 'number' && Number.isInteger(count) && count >= MIN_COMPLETIONS_TO_SHOW;
}
