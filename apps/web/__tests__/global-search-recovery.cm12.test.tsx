/**
 * CM-12, the half the /search federation left open.
 *
 * The finding's own fix list has two clauses. The first — "make the header
 * search federated: pujas, temples … in one result set, grouped, with pujas
 * first" — was applied to app/search/SearchClient.tsx, the DESTINATION page.
 * The header overlay that every user actually types into,
 * components/GlobalSearch.tsx, was already federated and so was never revisited,
 * and it still fails the same two clauses:
 *
 *   1. It groups Temples FIRST and Pujas second. Temples is the branch CM-14
 *      measured as 75% dead — 15 of 20 temples have zero offerings — so the
 *      typeahead leads with the results that cannot take money and buries the
 *      ones that can.
 *
 *   2. Its zero-result state is the complete string 'No matches for "x".' —
 *      the exact hard dead end the finding names: "no route back into the
 *      catalogue at the moment the user has proven both intent and a
 *      willingness to type". /search got recovery links; the overlay, which is
 *      the only search affordance a phone gets (see HN-12 in GlobalSearch),
 *      did not.
 *
 * Rendered behaviour, not source text.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

import { GlobalSearch } from '../components/GlobalSearch';

const NOTHING = {
  query: 'zzzqqqnothing',
  results: { temples: [], pujas: [], content: [], total: 0 },
};

/** Both buckets populated, so ordering is observable. */
const BOTH = {
  query: 'shiva',
  results: {
    temples: [
      {
        id: 't1',
        slug: 'kashi-vishwanath',
        name: 'Kashi Vishwanath',
        subtitle: 'Varanasi, Uttar Pradesh',
        href: '/temples/kashi-vishwanath',
      },
    ],
    pujas: [
      {
        id: 'p1',
        slug: 'rudrabhishek',
        name: 'Rudrabhishek',
        subtitle: 'Shiva',
        href: '/pujas/rudrabhishek',
      },
    ],
    content: [
      {
        id: 'c1',
        slug: 'shiv-chalisa',
        name: 'Shiv Chalisa',
        subtitle: 'chalisa · Shiva',
        href: '/content/shiv-chalisa',
      },
    ],
    total: 3,
  },
};

function mockFetch(body: unknown) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

function panel(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[role="dialog"]');
  if (!el) throw new Error('search overlay is not open');
  return el;
}

function openAndType(term: string) {
  render(<GlobalSearch />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0]!);
  fireEvent.change(screen.getByLabelText('Search temples, pujas and aartis'), {
    target: { value: term },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => cleanup());

describe('CM-12 — the typeahead leads with what a devotee can book', () => {
  it('groups Pujas above Temples', async () => {
    mockFetch(BOTH);
    openAndType('shiva');
    await screen.findByText('Rudrabhishek', {}, { timeout: 3000 });

    const text = panel().textContent ?? '';
    expect(text.indexOf('Pujas')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Temples')).toBeGreaterThanOrEqual(0);
    expect(
      text.indexOf('Pujas'),
      'pujas are the only results a devotee can act on with money',
    ).toBeLessThan(text.indexOf('Temples'));
  });

  it('still renders every bucket', async () => {
    mockFetch(BOTH);
    openAndType('shiva');
    await screen.findByText('Rudrabhishek', {}, { timeout: 3000 });

    expect(screen.getByText('Kashi Vishwanath')).toBeTruthy();
    expect(screen.getByText('Shiv Chalisa')).toBeTruthy();
  });
});

describe('CM-12 — a zero-result typeahead is a fork, not a wall', () => {
  it('offers a route back into the catalogue', async () => {
    mockFetch(NOTHING);
    openAndType('zzzqqqnothing');
    await screen.findByText(/No matches/i, {}, { timeout: 3000 });

    await waitFor(() => {
      const hrefs = within(panel())
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'));
      expect(hrefs, 'the catalogue must be one tap away').toContain('/pujas');
      expect(hrefs).toContain('/temples');
    });
  });

  it('carries the typed term into the full search page', async () => {
    mockFetch(NOTHING);
    openAndType('zzzqqqnothing');
    await screen.findByText(/No matches/i, {}, { timeout: 3000 });

    await waitFor(() => {
      const hrefs = within(panel())
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'));
      expect(
        hrefs.some((h) => h?.startsWith('/search?q=')),
        'the user already typed the term once; do not make them type it again',
      ).toBe(true);
    });
  });

  it('does not show recovery links before anything has been searched', () => {
    mockFetch(NOTHING);
    render(<GlobalSearch />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0]!);

    const hrefs = within(panel())
      .queryAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/pujas');
  });
});
