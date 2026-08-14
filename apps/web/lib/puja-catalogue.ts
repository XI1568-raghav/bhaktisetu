/**
 * DF-02 (prod sweep 2026-08-12) — the live set of bookable puja slugs.
 *
 * lib/festivals.ts is a hand-written editorial calendar: 61 festivals naming 87
 * puja slugs. The catalogue is a database table holding ten. Nothing connected
 * the two, so 84 of the 87 "Book with verified pandit" links 404'd — including
 * the homepage's only time-sensitive CTA during the Navratri → Diwali → Chhath
 * window the GTM plan calls the year's biggest revenue period.
 *
 * This module is the connection. It answers one question — "which slugs can a
 * devotee actually book right now" — and answers it from the API, never from a
 * list checked into the repo.
 *
 * An unreachable API yields an EMPTY set, which makes every festival render
 * zero booking links. That is deliberate: on the highest-intent seasonal
 * surface in the product, a link that might 404 costs more than no link.
 */

function resolveApiBase(): string {
  const candidate =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

/** Parse GET /pujas/types into a slug set. Non-string slugs are dropped. */
export function catalogueSlugsFromPayload(payload: unknown): Set<string> {
  const out = new Set<string>();
  if (!payload || typeof payload !== 'object') return out;
  const rows = (payload as { pujaTypes?: unknown }).pujaTypes;
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const slug = (row as { slug?: unknown }).slug;
    if (typeof slug === 'string' && slug.length > 0) out.add(slug);
  }
  return out;
}

/** Live bookable slugs. Never throws; an outage yields an empty set. */
export async function getCatalogueSlugs(): Promise<Set<string>> {
  try {
    const res = await fetch(`${resolveApiBase()}/pujas/types?limit=100`, {
      next: { revalidate: 600, tags: ['pujas'] },
    } as RequestInit);
    if (!res.ok) return new Set<string>();
    return catalogueSlugsFromPayload(await res.json());
  } catch {
    return new Set<string>();
  }
}
