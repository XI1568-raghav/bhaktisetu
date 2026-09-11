/**
 * Route helpers for /astrology/view, extracted from page.tsx.
 *
 * They used to be exported from the page itself, which fails the build: Next's
 * App Router generates a per-page type check permitting only a fixed export set
 * (default, metadata, revalidate, dynamic, generateStaticParams …). Any other
 * export resolves to `never` and the build stops with "incompatible with index
 * signature". A page cannot double as a module.
 *
 * They live here rather than being made module-local because the DF-12 guard
 * test pins `isRenderableAstrologerId` against the API's own regex — that
 * assertion is the point of the helper, so it has to stay importable. Same
 * shape as app/pujas/home-puja/book/resolve-book-route.ts.
 */

/** Mirrors UUID_RE in apps/api/src/routes/astrology.ts. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a visitor with no usable id should end up. */
export const ASTROLOGER_DIRECTORY = '/astrology/astrologers/live';

/** First value of a query param that may repeat, trimmed. */
export function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

/**
 * True when the API could conceivably serve this id. Pinned by the guard test
 * against the API's own regex — if the two drift, this page starts 404ing
 * profiles that are live and bookable.
 */
export function isRenderableAstrologerId(id: string): boolean {
  return UUID_RE.test(id.trim());
}
