/**
 * CM-12, the clause the federation pass left open: "'nearest match' suggestions
 * on zero results".
 *
 * The federation work pointed /search at `GET /api/v1/search`, so pujas,
 * temples and content now surface. What it did not change is HOW that endpoint
 * matches. apps/api/src/routes/search.ts filters with a single whole-string
 * `contains` per column:
 *
 *   { name: { contains: trimmed, mode: 'insensitive' } }
 *
 * `trimmed` is the user's raw query, unsplit. So the endpoint can only ever
 * answer a query that is a literal substring of one column. Every natural way a
 * devotee phrases the thing they want misses:
 *
 *   "rudrabhishek puja"  -> no column contains that exact string  -> 0 results
 *   "shiva abhishek"     -> "Rudrabhishek" does not contain it     -> 0 results
 *   "rudrabhishekam"     -> the fuller Sanskrit form is longer     -> 0 results
 *   "hanuman chalisa path" (with any extra word) -> 0 results
 *
 * The local article index in SearchClient already tokenises and ANDs, which is
 * why the two halves of the same page disagree about what "matches" means. The
 * catalogue half — the only half that can take money — is the strict one.
 *
 * Widening the SQL is an apps/api change and out of lane. What is in lane is
 * the recovery the finding actually asks for: when the exact query returns
 * nothing, relax it and say so. A devotee gets the Rudrabhishek they can book
 * instead of a dead end, and the banner never pretends the relaxed term was
 * what they typed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

import { buildRelaxedQueries } from '../lib/search-relax';

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
}));

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

import SearchClient from '../app/search/SearchClient';

const EMPTY = { results: { temples: [], pujas: [], content: [], total: 0 } };

/** Verbatim shape of GET /api/v1/search (routes/search.ts:100-113). */
const RUDRA = {
  results: {
    temples: [],
    pujas: [
      {
        id: 'p1',
        slug: 'rudrabhishek',
        name: 'Rudrabhishek',
        subtitle: 'Shiva',
        href: '/pujas/rudrabhishek',
      },
    ],
    content: [],
    total: 1,
  },
};

describe('CM-12 — buildRelaxedQueries', () => {
  it('drops marketplace filler so a phrased query reaches the catalogue', () => {
    // The single most common phrasing in this market. The API cannot answer it
    // because no column literally contains "rudrabhishek puja".
    const relaxed = buildRelaxedQueries('rudrabhishek puja');
    expect(relaxed).toContain('rudrabhishek');
  });

  it('splits a multi-word query the whole-string `contains` cannot answer', () => {
    const relaxed = buildRelaxedQueries('hanuman chalisa path');
    expect(relaxed).toContain('hanuman');
    expect(relaxed).toContain('chalisa');
  });

  it('strips a Sanskrit inflectional tail', () => {
    // "Rudrabhishekam" is the same rite; the row is seeded as "Rudrabhishek",
    // and `contains` is substring-of-column, not column-is-substring-of-query.
    expect(buildRelaxedQueries('rudrabhishekam')).toContain('rudrabhishek');
    expect(buildRelaxedQueries('chalisas')).toContain('chalisa');
  });

  it('never re-issues the query that already returned nothing', () => {
    for (const q of ['rudrabhishek puja', 'rudrabhishekam', 'hanuman chalisa']) {
      expect(buildRelaxedQueries(q)).not.toContain(q.trim().toLowerCase());
    }
  });

  it('offers nothing to relax for a query that is already one bare word', () => {
    // Nothing to strip, nothing to split — do not invent a broader search the
    // user did not ask for.
    expect(buildRelaxedQueries('shiva')).toEqual([]);
    expect(buildRelaxedQueries('')).toEqual([]);
    expect(buildRelaxedQueries('a')).toEqual([]);
  });

  it('keeps every candidate long enough to mean something', () => {
    for (const q of ['om namah shivaya ke liye puja', 'satyanarayana katha ki booking']) {
      for (const candidate of buildRelaxedQueries(q)) {
        expect(candidate.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('does not strip a query down to nothing when every word is filler', () => {
    // "puja" alone is a real catalogue term; relaxing must not erase it and
    // leave the caller with an empty search.
    expect(buildRelaxedQueries('puja booking')).toContain('puja');
  });
});

describe('CM-12 — /search recovers a zero-result catalogue query', () => {
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    nav.params = new URLSearchParams('q=rudrabhishek+puja');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.startsWith('/search-index.json')) {
          return { ok: true, json: async () => [] } as unknown as Response;
        }
        // The API answers the raw phrase with nothing and the relaxed head-word
        // with the puja the devotee actually wanted.
        const q = new URL(url, 'https://api.test').searchParams.get('q') ?? '';
        const body = q === 'rudrabhishek' ? RUDRA : EMPTY;
        return { ok: true, json: async () => body } as unknown as Response;
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('surfaces the bookable puja instead of a dead end', async () => {
    render(<SearchClient />);
    const hit = await screen.findByText('Rudrabhishek');
    expect(hit.closest('a')?.getAttribute('href')).toBe('/pujas/rudrabhishek');
  });

  it('says the term was widened rather than passing it off as an exact match', async () => {
    render(<SearchClient />);
    await screen.findByText('Rudrabhishek');
    const page = document.body.textContent ?? '';
    expect(page).toContain('rudrabhishek puja');
    expect(page).toMatch(/no exact match/i);
  });

  it('tries the exact query first and only then the relaxed one', async () => {
    render(<SearchClient />);
    await screen.findByText('Rudrabhishek');
    const queries = calls
      .filter((u) => u.includes('/search?q='))
      .map((u) => new URL(u, 'https://api.test').searchParams.get('q'));
    expect(queries[0]).toBe('rudrabhishek puja');
    expect(queries).toContain('rudrabhishek');
  });

  it('does not claim "no exact match" while displaying exact matches', async () => {
    // The mixed case, and the one that makes a careless banner lie: the article
    // index DID answer the typed query, and only the catalogue half had to be
    // widened. Saying "no exact match for X" over a list that contains exact
    // matches for X is a false statement rendered to a user.
    nav.params = new URLSearchParams('q=rudrabhishek+puja');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.startsWith('/search-index.json')) {
          return {
            ok: true,
            json: async () => [
              {
                category: 'sanatan',
                slug: 'rudrabhishek-puja-vidhi',
                title: 'Rudrabhishek Puja Vidhi',
                summary: 'The order of the rite.',
              },
            ],
          } as unknown as Response;
        }
        const q = new URL(url, 'https://api.test').searchParams.get('q') ?? '';
        return {
          ok: true,
          json: async () => (q === 'rudrabhishek' ? RUDRA : EMPTY),
        } as unknown as Response;
      }),
    );

    render(<SearchClient />);
    await screen.findByText('Rudrabhishek');
    // The exact article hit is on the page...
    expect(screen.getByText('Rudrabhishek Puja Vidhi')).toBeTruthy();
    const page = document.body.textContent ?? '';
    // ...so the page must not say nothing matched.
    expect(page).not.toMatch(/no exact match/i);
    // But it still has to disclose that the catalogue half was widened.
    expect(page).toMatch(/rudrabhishek/i);
    expect(page).toMatch(/catalogue/i);
  });

  it('does not relax when the exact query already found something', async () => {
    nav.params = new URLSearchParams('q=rudrabhishek');
    render(<SearchClient />);
    await screen.findByText('Rudrabhishek');
    await waitFor(() => {
      const queries = calls.filter((u) => u.includes('/search?q='));
      expect(queries).toHaveLength(1);
    });
    expect(document.body.textContent ?? '').not.toMatch(/no exact match/i);
  });
});
