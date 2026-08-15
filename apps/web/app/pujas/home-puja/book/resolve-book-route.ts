import { homePujaCategories } from '../../../../lib/home-pujas';

/**
 * PF-10 — what the /pujas/home-puja/book route should do with a `?slug=`.
 *
 * Kept out of page.tsx on purpose. `next build` type-checks a page file against
 * the set of exports the App Router recognises (default, metadata,
 * generateMetadata, revalidate, dynamic, …) and rejects anything else, so a
 * named helper exported from the page would pass tsc and vitest and then break
 * the build. Same class of trap as importing a NodeNext barrel into a
 * Turbopack page.
 */
export type BookRouteOutcome =
  | { kind: 'redirect'; to: string }
  | { kind: 'not-found' }
  | { kind: 'render'; slug: string };

/** Where the catalogue of at-home ceremonies lives. */
export const HOME_PUJA_CATALOGUE = '/pujas/home-puja';

/** First value of a query param that may repeat, trimmed. */
export function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

/**
 * A missing slug is a navigation mistake, not a missing resource — send it to
 * the catalogue. A slug that names no ceremony is a genuine 404.
 */
export function resolveBookRoute(slug: string): BookRouteOutcome {
  if (!slug) return { kind: 'redirect', to: HOME_PUJA_CATALOGUE };
  if (!homePujaCategories.some((c) => c.slug === slug)) return { kind: 'not-found' };
  return { kind: 'render', slug };
}
