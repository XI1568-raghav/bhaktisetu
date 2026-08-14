/**
 * DF-04 (prod sweep 2026-08-12) — one resolver for "which temples-table row is
 * this URL about".
 *
 * The curated slug a temple page is served at (kashi-vishwanath) is not the
 * slug the temples table stores (kashi-vishwanath-varanasi), so every surface
 * that wants live temple data has to bridge the two. Before this there were two
 * independent bridges: the detail page walked the temple list and matched on
 * `canonicalTempleSlug`, while app/temples/[slug]/pujas/page.tsx carried its own
 * hand-written eleven-row `SHORT_TO_API_SLUG` table. They disagreed — a temple
 * the detail page resolved could 404 on its own /pujas child route, which made
 * linking between them unsafe.
 *
 * This is that one bridge. It never fabricates a shell temple: a null return
 * means the API genuinely has no such temple, and callers must render an honest
 * missing state rather than an empty-but-plausible one.
 *
 * (Named `temple-resolve` because lib/temple-api.ts is the temple-PORTAL
 * authenticated client — a different concern entirely.)
 */

import { getTempleBySlug, getTemples, type TempleDetail } from './api';
import { canonicalTempleSlug } from './temple-slug';

export async function resolveApiTemple(slug: string): Promise<TempleDetail | null> {
  // `getTempleBySlug` throws on a non-OK response, so a throw OR null means
  // "API has no such temple".
  try {
    const temple = await getTempleBySlug(slug);
    if (temple) return temple;
  } catch {
    // fall through to the reverse lookup
  }

  // Walk the temple list and take the row whose slug canonicalises to this one
  // (kashi-vishwanath-varanasi -> kashi-vishwanath).
  try {
    const list = await getTemples({ limit: 100 });
    const match = list.data.find(
      (t) => t.slug && t.slug !== slug && canonicalTempleSlug(t.slug) === slug,
    );
    if (!match) return null;
    return (await getTempleBySlug(match.slug)) ?? null;
  } catch {
    return null;
  }
}
