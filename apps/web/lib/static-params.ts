// Build-time slug discovery for generateStaticParams.
//
// Why: the Cloudflare Worker (free plan, 10 ms CPU) cannot render a page per request,
// and its read-only static-assets cache never revalidates, so a [slug] route without
// generateStaticParams is rendered on EVERY request. Fetching the slug list from the live
// API at build time lets those pages prerender once. An unreachable API must never fail
// the build: every failure returns [] and the route falls back to on-demand rendering
// (dynamicParams stays true). Render's `next build` uses the same function.

function apiBase(): string {
  const candidate = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

export async function fetchSlugParams(
  path: string,
  pickList: (json: unknown) => unknown,
  key = 'slug',
): Promise<{ slug: string }[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${apiBase()}${path}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return [];
    const list = pickList(await res.json());
    if (!Array.isArray(list)) return [];
    const out = new Set<string>();
    for (const row of list) {
      const v = (row as Record<string, unknown> | null)?.[key];
      if (typeof v === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(v)) out.add(v);
    }
    return [...out].map((slug) => ({ slug }));
  } catch {
    return [];
  }
}
