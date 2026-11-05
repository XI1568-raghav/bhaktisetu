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

import { ApiResponseError, getTempleBySlug, getTemples, type TempleDetail } from './api';
import { canonicalTempleSlug } from './temple-slug';

export async function resolveApiTempleStrict(slug: string): Promise<TempleDetail | null> {
  // Only an HTTP 404 means "the API has no such temple". A timeout, a 5xx or a
  // network blip is NOT a missing temple: answering null there made the page
  // call notFound() and the 404 was cached (and baked in at build), so
  // /temples/<slug>/pujas showed "Page not found" for temples that exist.
  // Retry once, then let the error surface (a 500 is not cached as a 404).
  const isMissing = (e: unknown) => e instanceof ApiResponseError && e.status === 404;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const temple = await getTempleBySlug(slug);
      if (temple) return temple;
      break;
    } catch (e) {
      if (isMissing(e)) break;
      if (attempt === 1) throw e;
    }
  }

  // Walk the temple list and take the row whose slug canonicalises to this one
  // (kashi-vishwanath-varanasi -> kashi-vishwanath).
  const list = await getTemples({ limit: 100 });
  const match = list.data.find(
    (t) => t.slug && t.slug !== slug && canonicalTempleSlug(t.slug) === slug,
  );
  if (!match) return null;
  try {
    return (await getTempleBySlug(match.slug)) ?? null;
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

/**
 * Forgiving form: any failure reads as "no API row". Right for the detail page,
 * which can still render a curated temple while the API is down. The /pujas
 * child route must use resolveApiTempleStrict instead, because there a null
 * becomes a cached "Page not found".
 */
export async function resolveApiTemple(slug: string): Promise<TempleDetail | null> {
  try {
    return await resolveApiTempleStrict(slug);
  } catch {
    return null;
  }
}
