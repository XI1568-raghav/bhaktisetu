/**
 * CI-04 (delta completion sweep 2026-08-20) — the `/content/<slug>` soft-404
 * farm.
 *
 * `app/content/[slug]/page.tsx` resolved an unknown slug by spreading the
 * built-in Hanuman Chalisa fixture over it:
 *
 *     return { ...fallbackContent, slug, title: titleCase(slug),
 *              body: 'Content is loading. Please check back in a moment.' };
 *
 * so `/content/<anything>` returned 200 forever, carrying Hanuman Chalisa's
 * deity ("Lord Hanuman"), its 12.5M view count, its 890k likes and its
 * 9m42s runtime under a title invented from the URL. Fourteen of the 27
 * slugs in `generateStaticParams` have no row behind them and were being
 * prerendered into exactly that. Search engines index it as real content.
 *
 * The defect was that the page could not tell "this slug does not exist" from
 * "the API is down": `lib/api.serverFetch` throws on any non-OK response, so
 * a 404 and a dead socket arrived as the same `catch`. This module keeps the
 * three outcomes apart, the same way `app/pujas/[slug]` does after S2C-06:
 *
 *   found        → render it
 *   not-found    → notFound(); a real 404, no invented page
 *   unavailable  → an honest, noindex "temporarily unavailable" panel
 *
 * `unavailable` deliberately does NOT throw the way `/pujas/[slug]` does:
 * this route prerenders 27 slugs in `generateStaticParams`, `pnpm turbo build`
 * runs in CI with no API reachable, and throwing would fail the build. A
 * noindex panel with no fabricated fields degrades honestly instead, and ISR
 * (revalidate 3600) replaces it with the real row — or a real 404 — as soon
 * as the API answers.
 */

import type { ContentItem } from './api';

export type ContentLookup =
  | { status: 'found'; item: ContentItem }
  | { status: 'not-found' }
  | { status: 'unavailable' };

function resolveApiBase(): string {
  const candidate =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

/**
 * Look up one content row by slug.
 *
 * Only a literal 404 from the API is treated as "this does not exist". Any
 * other non-OK status (5xx, 502 from a cold Render dyno, a gateway timeout)
 * and any transport failure are `unavailable` — mislabelling an outage as
 * not-found would 404 the entire published corpus for the length of the ISR
 * window.
 */
export async function lookupContent(slug: string): Promise<ContentLookup> {
  try {
    const res = await fetch(`${resolveApiBase()}/content/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300, tags: [`content-${slug}`] },
    } as RequestInit);
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'unavailable' };
    const payload = (await res.json()) as { content?: ContentItem } | null;
    const item = payload?.content;
    if (!item || typeof item !== 'object') return { status: 'not-found' };
    return { status: 'found', item };
  } catch {
    return { status: 'unavailable' };
  }
}
