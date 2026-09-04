/**
 * react-query wrappers for the two PUBLIC search routes.
 *
 * Same reason ./portal-queries exists: @poojly/api-client is owned by another
 * workstream and carries no hooks for these. They go through the shared `api`
 * client so headers, base URL and error shaping match every other mobile call.
 *
 *   GET /api/v1/temples/search?q&page&limit   routes/temples.ts:127
 *   GET /api/v1/content/search?q&page&limit   routes/content.ts:47
 *
 * Both are unauthenticated, so search works signed-out — which is the point:
 * it is the first thing a new devotee reaches for.
 *
 * Response shaping stays out of this file. The raw body goes to the selectors
 * in ./search, which are pinned to each route's `select:` block.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@poojly/api-client';
import { canSearch, normalizeQuery } from './search';

/** The routes clamp to 100; 20 is a screenful and keeps the payload small. */
const PAGE_SIZE = 20;

export const searchQueryKeys = {
  temples: (q: string) => ['search', 'temples', q] as const,
  content: (q: string) => ['search', 'content', q] as const,
};

function searchPath(base: string, q: string): string {
  return `${base}?q=${encodeURIComponent(q)}&page=1&limit=${PAGE_SIZE}`;
}

export function useTempleSearch(rawQuery: string) {
  const q = normalizeQuery(rawQuery);
  return useQuery<unknown>({
    queryKey: searchQueryKeys.temples(q),
    queryFn: () => api.get<unknown>(searchPath('/api/v1/temples/search', q)),
    // Below the minimum the server answers 200 with an empty page, which the
    // screen would render as a confident "No results" for a half-typed word.
    enabled: canSearch(rawQuery),
    staleTime: 60_000,
  });
}

export function useContentSearch(rawQuery: string) {
  const q = normalizeQuery(rawQuery);
  return useQuery<unknown>({
    queryKey: searchQueryKeys.content(q),
    queryFn: () => api.get<unknown>(searchPath('/api/v1/content/search', q)),
    enabled: canSearch(rawQuery),
    staleTime: 60_000,
  });
}
