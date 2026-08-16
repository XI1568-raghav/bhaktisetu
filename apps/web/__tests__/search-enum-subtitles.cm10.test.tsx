/**
 * CM-10, the half of the finding that survived the /pujas fix.
 *
 * `lib/puja-labels.ts` closed the catalogue pages: `/pujas` and `/pujas/<slug>`
 * now print "Special occasions" instead of the column value. Search was never
 * touched, and search re-opens the same hole from a different direction because
 * the raw enum arrives over the wire as a *subtitle string*:
 *
 *   apps/api/src/routes/search.ts
 *     pujas:   subtitle: p.deity ?? p.category ?? ''      <- PujaCategory enum
 *     content: subtitle: `${c.type}${c.deity ? ' · ' + c.deity : ''}`
 *                                                          <- ContentType enum
 *
 * So a puja row with a null `deity` — Pitru Dosh Nivaran and the other
 * non-deity rites are exactly that shape — hands the client the literal string
 * `special_occasion`, and every content row hands it a lowercase enum member,
 * `video_reel` among them. Both surfaces render `{subtitle}` verbatim:
 * components/GlobalSearch.tsx and app/search/SearchClient.tsx.
 *
 * The result is a database column with an underscore in it printed in the
 * header typeahead of a storefront, at the moment a buyer is deciding whether
 * these people can be trusted with ₹1,100.
 *
 * These assertions are on RENDERED TEXT, not on source, so the label map cannot
 * be satisfied by a comment or an unused import.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
}));

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

import SearchClient from '../app/search/SearchClient';
import { GlobalSearch } from '../components/GlobalSearch';

/**
 * Verbatim shape of GET /api/v1/search when the matched puja has no deity and
 * the matched content row is a reel — i.e. the two rows that leak.
 */
const RAW_ENUM_PAYLOAD = {
  query: 'pitru',
  results: {
    temples: [],
    pujas: [
      {
        id: 'p1',
        slug: 'pitru-dosh-nivaran',
        name: 'Pitru Dosh Nivaran',
        subtitle: 'special_occasion',
        href: '/pujas/pitru-dosh-nivaran',
      },
      {
        id: 'p2',
        slug: 'navgraha-shanti',
        name: 'Navgraha Shanti',
        subtitle: 'planetary',
        href: '/pujas/navgraha-shanti',
      },
    ],
    content: [
      {
        id: 'c1',
        slug: 'pitru-paksha-reel',
        name: 'Pitru Paksha explained',
        subtitle: 'video_reel · Vishnu',
        href: '/content/pitru-paksha-reel',
      },
    ],
    total: 3,
  },
};

function mockFetch(body: unknown) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
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
  nav.params = new URLSearchParams('q=pitru');
  vi.restoreAllMocks();
  mockFetch(RAW_ENUM_PAYLOAD);
});
afterEach(() => cleanup());

describe('CM-10 — /search does not print database enum values', () => {
  it('renders the puja category as a label, not as the column value', async () => {
    render(<SearchClient />);
    await screen.findByText('Pitru Dosh Nivaran');

    const page = document.body.textContent ?? '';
    expect(page, 'a snake_case column value must never reach a storefront').not.toContain(
      'special_occasion',
    );
    expect(page).toContain('Special occasions');
  });

  it('labels a single-word category too, so "planetary" is not shipped bare', async () => {
    render(<SearchClient />);
    await screen.findByText('Navgraha Shanti');

    expect(document.body.textContent ?? '').toContain('Planetary remedies');
  });

  it('labels the content type and keeps the deity that follows it', async () => {
    render(<SearchClient />);
    await screen.findByText('Pitru Paksha explained');

    const page = document.body.textContent ?? '';
    expect(page).not.toContain('video_reel');
    expect(page).toContain('Video reels');
    // The API joins type and deity with " · "; the deity half is real data and
    // must survive the relabelling.
    expect(page).toContain('Vishnu');
  });
});

describe('CM-10 — the header typeahead does not print enum values either', () => {
  function openOverlay() {
    render(<GlobalSearch />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0]!);
    const input = screen.getByLabelText('Search temples, pujas and aartis');
    fireEvent.change(input, { target: { value: 'pitru' } });
  }

  it('shows the puja category label in the dropdown', async () => {
    openOverlay();
    await screen.findByText('Pitru Dosh Nivaran', {}, { timeout: 3000 });

    await waitFor(() => {
      const panel = document.querySelector('[role="dialog"]')!.textContent ?? '';
      expect(panel).not.toContain('special_occasion');
      expect(panel).toContain('Special occasions');
    });
  });

  it('shows the content type label in the dropdown', async () => {
    openOverlay();
    await screen.findByText('Pitru Paksha explained', {}, { timeout: 3000 });

    await waitFor(() => {
      const panel = document.querySelector('[role="dialog"]')!.textContent ?? '';
      expect(panel).not.toContain('video_reel');
      expect(panel).toContain('Video reels');
    });
  });

  it('passes a real deity subtitle through untouched', async () => {
    mockFetch({
      query: 'hanuman',
      results: {
        temples: [],
        pujas: [
          {
            id: 'p9',
            slug: 'sunderkand-path',
            name: 'Sunderkand Path',
            subtitle: 'Hanuman',
            href: '/pujas/sunderkand-path',
          },
        ],
        content: [],
        total: 1,
      },
    });
    openOverlay();
    await screen.findByText('Sunderkand Path', {}, { timeout: 3000 });

    const panel = document.querySelector('[role="dialog"]')!.textContent ?? '';
    expect(panel).toContain('Hanuman');
  });
});
