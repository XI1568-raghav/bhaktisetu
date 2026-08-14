/**
 * HN-03, the half the federation did not close.
 *
 * CM-12 pointed /search at the federated endpoint the header typeahead uses, so
 * pujas and temples now surface. But `GET /api/v1/search` answers
 * `{ results: { temples, pujas, content } }` — three buckets — and
 * SearchClient's `ApiResults` declares only two. The `content` bucket, which is
 * where every aarti, chalisa, mantra and bhajan lives (routes/search.ts:65
 * queries `contentItem` and maps `href: /content/${c.slug}`), is read off the
 * response and thrown away.
 *
 * That is precisely the pair of terms the sweep recorded as returning nothing:
 *
 *   /search?q=hanuman  -> "0 results ... No matches"
 *   /search?q=aarti    -> "0 results"
 *
 * while the header typeahead for the same word "hanuman" returned four correct
 * hits, of which /content/hanuman-chalisa and /content/bajrang-baan are content
 * rows. Two surfaces over one endpoint, disagreeing because one of them drops a
 * third of the payload.
 *
 * Rendered behaviour, not a source scan: the assertion is that a devotee typing
 * the most-searched deity term in this market sees the pages the site already
 * has for it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
}));

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

import SearchClient from '../app/search/SearchClient';

/** Verbatim shape of GET /api/v1/search for q=hanuman (routes/search.ts:100-113). */
const HANUMAN = {
  results: {
    temples: [],
    pujas: [
      {
        id: 'p1',
        slug: 'hanuman-chalisa-path',
        name: 'Hanuman Chalisa Path',
        subtitle: 'Hanuman',
        href: '/pujas/hanuman-chalisa-path',
      },
      {
        id: 'p2',
        slug: 'sunderkand-path',
        name: 'Sunderkand Path',
        subtitle: 'Hanuman',
        href: '/pujas/sunderkand-path',
      },
    ],
    content: [
      {
        id: 'c1',
        slug: 'hanuman-chalisa',
        name: 'Hanuman Chalisa',
        subtitle: 'Chalisa',
        href: '/content/hanuman-chalisa',
      },
      {
        id: 'c2',
        slug: 'bajrang-baan',
        name: 'Bajrang Baan',
        subtitle: 'Stotra',
        href: '/content/bajrang-baan',
      },
    ],
    total: 4,
  },
};

function mockFetch(body: unknown) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // The static article index — deliberately empty so nothing here can pass
    // by accident through the encyclopedia path.
    if (url.includes('search-index.json')) {
      return new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  nav.params = new URLSearchParams('q=hanuman');
  vi.restoreAllMocks();
});
afterEach(() => cleanup());

describe('HN-03 — /search shows the content the typeahead already finds', () => {
  it('renders the /content hits for "hanuman"', async () => {
    mockFetch(HANUMAN);
    render(<SearchClient />);

    const chalisa = await screen.findByText('Hanuman Chalisa');
    expect(chalisa).toBeTruthy();
    expect(await screen.findByText('Bajrang Baan')).toBeTruthy();
  });

  it('links them at their real /content/<slug> hrefs', async () => {
    mockFetch(HANUMAN);
    render(<SearchClient />);

    await screen.findByText('Hanuman Chalisa');
    const hrefs = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/content/hanuman-chalisa');
    expect(hrefs).toContain('/content/bajrang-baan');
  });

  it('counts them, so the page cannot say "0 results" over four hits', async () => {
    mockFetch(HANUMAN);
    render(<SearchClient />);

    await screen.findByText('Hanuman Chalisa');
    await waitFor(() => {
      expect(screen.getByText(/4 results for/i)).toBeTruthy();
    });
    expect(screen.queryByText(/No matches/i)).toBeNull();
  });

  it('still shows the honest empty state when every bucket is genuinely empty', async () => {
    mockFetch({ results: { temples: [], pujas: [], content: [], total: 0 } });
    render(<SearchClient />);
    expect(await screen.findByText(/No matches/i)).toBeTruthy();
  });

  it('never invents a content hit when the API omits the bucket entirely', async () => {
    mockFetch({ results: { temples: [], pujas: [] } });
    render(<SearchClient />);
    expect(await screen.findByText(/No matches/i)).toBeTruthy();
  });
});
