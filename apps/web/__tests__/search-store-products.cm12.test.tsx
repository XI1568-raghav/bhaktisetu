/**
 * [CM-12] /search returns store products, and the placeholders only promise
 * things search can actually answer.
 *
 * The finding's own fix names "temples, pujas, content AND store products in
 * one result set". The API shipped three buckets and the page read three, so a
 * devotee searching "rudraksha mala" — a thing the site sells — got nothing.
 *
 * Two separate defects are covered here and they fail for different reasons:
 *  1. the products bucket is not read or rendered (behavioural, asserted by
 *     rendering with a stubbed API);
 *  2. the search box rotates placeholders promising a kundli / a saint / a
 *     tirth, none of which any corpus behind this box contains (asserted
 *     against the placeholder list AND the corpora, so it cannot pass by
 *     someone merely renaming a variable).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('[CM-12] the store bucket reaches the page', () => {
  beforeEach(() => {
    searchParams.set('q', 'rudraksha');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/search-index.json')) {
          return { ok: true, json: async () => [] } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({
            query: 'rudraksha',
            results: {
              temples: [],
              pujas: [],
              content: [],
              products: [
                {
                  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
                  slug: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
                  name: 'Rudraksha Mala (5 mukhi)',
                  subtitle: 'Malas',
                  price: 599,
                  imageUrl: null,
                  href: '/store/seller/3f2504e0-4f89-11d3-9a0c-0305e82c3301',
                },
              ],
              total: 1,
            },
          }),
        } as unknown as Response;
      }),
    );
  });

  it('renders a store product the API returned, linked to a page that exists', async () => {
    const { default: SearchClient } = await import('../app/search/SearchClient');
    render(React.createElement(SearchClient));
    const hit = await screen.findByText('Rudraksha Mala (5 mukhi)');
    expect(hit.closest('a')?.getAttribute('href')).toBe(
      '/store/seller/3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    );
  });

  it('counts the product in the result total it prints', async () => {
    const { default: SearchClient } = await import('../app/search/SearchClient');
    render(React.createElement(SearchClient));
    await screen.findByText('Rudraksha Mala (5 mukhi)');
    await waitFor(() => {
      expect(screen.getByText(/1 result for/i)).toBeTruthy();
    });
  });
});

describe('[CM-12] a products-only response is not reported as "no matches"', () => {
  it('does not relax or fall back when only the store bucket answered', async () => {
    searchParams.set('q', 'rudraksha');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/search-index.json')) {
          return { ok: true, json: async () => [] } as unknown as Response;
        }
        calls.push(url);
        return {
          ok: true,
          json: async () => ({
            results: {
              temples: [],
              pujas: [],
              content: [],
              products: [
                { id: 'p1', slug: 'p1', name: 'Brass Puja Thali', subtitle: 'Thali', href: '/store/seller/p1' },
              ],
              total: 1,
            },
          }),
        } as unknown as Response;
      }),
    );
    const { default: SearchClient } = await import('../app/search/SearchClient');
    render(React.createElement(SearchClient));
    await screen.findByText('Brass Puja Thali');
    // If `isEmpty` still ignored the products bucket, the client would treat a
    // products-only answer as empty and fire relaxed retries.
    expect(calls.length, `relaxed retries fired: ${calls.join(' | ')}`).toBe(1);
    expect(screen.queryByText(/No matches/i)).toBeNull();
  });
});

describe('[CM-12] the rotating placeholders only promise answerable searches', () => {
  const globalSearch = readFileSync(path.join(WEB, 'components/GlobalSearch.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const placeholders: string[] = (() => {
    const block = /ROTATING_PLACEHOLDERS\s*=\s*\[([\s\S]*?)\]/.exec(globalSearch)?.[1] ?? '';
    return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  })();

  const index = JSON.parse(readFileSync(path.join(WEB, 'public/search-index.json'), 'utf8')) as
    Array<Record<string, unknown>>;
  const apiRoute = readFileSync(
    path.resolve(WEB, '..', 'api', 'src', 'routes', 'search.ts'),
    'utf8',
  );

  it('found the placeholder list (this guard is measuring something)', () => {
    expect(placeholders.length).toBeGreaterThan(3);
    expect(index.length).toBeGreaterThan(50);
  });

  /** Words a placeholder may only use if some corpus behind the box has them. */
  const CORPUS_CLAIMS: Array<{ word: RegExp; corpusHas: () => boolean }> = [
    { word: /kundli/i, corpusHas: () => /kundli/i.test(apiRoute) || index.some((e) => /kundli/i.test(JSON.stringify(e))) },
    { word: /saint/i, corpusHas: () => /saint/i.test(apiRoute) || index.some((e) => /saint/i.test(JSON.stringify(e))) },
    { word: /tirth|pilgrimage/i, corpusHas: () => /tirth|yatra/i.test(apiRoute) || index.some((e) => /tirth|pilgrimage/i.test(JSON.stringify(e))) },
  ];

  for (const { word, corpusHas } of CORPUS_CLAIMS) {
    it(`no placeholder promises ${word.source} unless a corpus can answer it`, () => {
      const offending = placeholders.filter((p) => word.test(p));
      if (corpusHas()) return; // legitimately searchable — nothing to assert
      expect(
        offending,
        `the search box invites a query the box cannot answer: ${offending.join(' | ')}. ` +
          'Either delete the placeholder or add the corpus.',
      ).toEqual([]);
    });
  }

  it('the store bucket is declared in the client response type', () => {
    expect(globalSearch, 'GlobalSearch drops the products bucket on the floor').toMatch(
      /products\??:/,
    );
  });
});
