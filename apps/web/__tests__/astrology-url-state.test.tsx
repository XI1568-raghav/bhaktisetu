/**
 * LC-12 (prod sweep 2026-08-12), /astrology half — the temples half shipped in
 * an earlier wave; this file closes the other page named by the same finding.
 *
 * AstrologyClient carried the identical defect: four list controls
 * (specialization pills, sort <select>, "Online only" checkbox, rashi picker)
 * that filtered on screen while `location.href` stayed at /astrology forever.
 * The write path was a `router.replace()` inside an effect — an App Router
 * NAVIGATION, so every pill click fired `GET /astrology?…&_rsc=…` and the
 * address bar only moved once that round trip committed; `replace` also writes
 * no history entry, so Back could not undo a filter. The read path already
 * worked (the four `useState` initialisers seed from `searchParams`), so only
 * half the round trip existed: /astrology?filter=Vastu rendered filtered, but
 * nothing on the page could ever produce that URL.
 *
 * These tests mock `next/navigation` exactly as production wires it — a
 * `router.replace` that does NOT touch `window.location` — which is what makes
 * them fail against the old code: filtering works, the URL does not move.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import AstrologyClient from '../app/astrology/AstrologyClient';
import {
  parseAstrologyFilters,
  buildAstrologyQuery,
  ASTROLOGY_SPECIALIZATIONS,
  DEFAULT_ASTROLOGY_FILTERS,
} from '../lib/astrology-filters';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }),
  usePathname: () => '/astrology',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ASTROLOGERS = [
  {
    id: 'ast-1',
    name: 'Pt. Harish Chandra',
    specializations: ['Vedic Astrology'],
    experienceYears: 35,
    rating: 5,
    perMinuteRate: 100,
    isOnline: true,
    verified: true,
  },
  {
    id: 'ast-2',
    name: 'Acharya Bhaskar Rao',
    specializations: ['Vastu'],
    experienceYears: 28,
    rating: 4.5,
    perMinuteRate: 90,
    isOnline: false,
    verified: true,
  },
  {
    id: 'ast-3',
    name: 'Smt. Kavita Joshi',
    specializations: ['Vedic Astrology', 'Numerology'],
    experienceYears: 12,
    rating: 4.2,
    perMinuteRate: 40,
    isOnline: true,
    verified: true,
  },
];

/**
 * Astrologer cards are <a href="/astrology/{id}">. The page also links to the
 * static /astrology/chat, /astrology/kundli and /astrology/horoscope tools, so
 * match only the ids this fixture supplies.
 */
function cardHrefs(): string[] {
  return Array.from(document.querySelectorAll('a[href^="/astrology/ast-"]')).map(
    (a) => a.getAttribute('href') ?? '',
  );
}

async function renderDirectory() {
  render(<AstrologyClient />);
  await waitFor(() => expect(cardHrefs().length).toBeGreaterThan(0));
}

function clickText(label: string) {
  const el = screen.getAllByRole('button').find((b) => (b.textContent ?? '').trim() === label);
  if (!el) throw new Error(`no button labelled "${label}"`);
  act(() => {
    el.click();
  });
}

beforeEach(() => {
  replace.mockClear();
  window.history.replaceState(null, '', '/astrology');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ astrologers: ASTROLOGERS }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LC-12 — /astrology list-control state must land in the URL', () => {
  it('a specialization pill writes ?filter= into the address bar', async () => {
    await renderDirectory();
    expect(cardHrefs()).toHaveLength(3);

    clickText('Vastu');

    expect(window.location.search).toBe('?filter=Vastu');
    expect(cardHrefs()).toEqual(['/astrology/ast-2']);
  });

  it('the sort <select> is shareable and carries an accessible name', async () => {
    await renderDirectory();
    const sort = document.querySelector(
      'select[aria-label="Sort astrologers"]',
    ) as HTMLSelectElement;
    expect(sort).toBeTruthy();

    act(() => {
      sort.value = 'price';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(window.location.search).toBe('?sort=price');
    // Price: low to high — ast-3 (40) then ast-2 (90) then ast-1 (100).
    expect(cardHrefs()).toEqual(['/astrology/ast-3', '/astrology/ast-2', '/astrology/ast-1']);
  });

  it('the Online-only checkbox and the rashi picker both reach the URL', async () => {
    await renderDirectory();
    const online = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    act(() => {
      online.click();
    });
    expect(window.location.search).toBe('?online=1');
    expect(cardHrefs()).toEqual(['/astrology/ast-1', '/astrology/ast-3']);

    const aries = screen.getAllByRole('button').find((b) => b.getAttribute('data-rashi') === 'aries');
    expect(aries).toBeTruthy();
    act(() => {
      aries!.click();
    });
    expect(window.location.search).toBe('?online=1&rashi=aries');
  });

  it('applying a filter pushes a history entry so Back can undo it', async () => {
    const push = vi.spyOn(window.history, 'pushState');
    await renderDirectory();
    clickText('Vastu');
    expect(push).toHaveBeenCalled();
    expect(String(push.mock.calls[0]![2])).toContain('filter=Vastu');
  });

  it('Back (popstate) reverts the rendered list, not just the URL', async () => {
    await renderDirectory();
    clickText('Vastu');
    expect(cardHrefs()).toEqual(['/astrology/ast-2']);

    // What the browser does on Back: URL rewinds, then popstate fires.
    act(() => {
      window.history.replaceState(null, '', '/astrology');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(cardHrefs()).toHaveLength(3);
    const pill = screen.getAllByRole('button').find((b) => (b.textContent ?? '').trim() === 'Vastu')!;
    expect(pill.getAttribute('aria-pressed')).toBe('false');
  });

  it('mounts already filtered when the URL carries params (deep link / SEO landing)', async () => {
    window.history.replaceState(null, '', '/astrology?filter=Vedic%20Astrology&sort=experience');
    await renderDirectory();
    expect(cardHrefs()).toEqual(['/astrology/ast-1', '/astrology/ast-3']);
  });

  it('every rendered specialization pill is a value the parser accepts', async () => {
    await renderDirectory();
    // Drift between the pill list and the parser's allowlist reintroduces the
    // bug one string at a time: the click writes ?filter=X, the reload parses
    // it back to "All", and the shared link silently shows everything.
    const labels = Array.from(
      document.querySelectorAll('button[aria-pressed]:not([data-rashi])'),
    ).map((b) => (b.textContent ?? '').trim());

    // Exact, in both directions: an extra pill or a missing one is drift.
    expect(labels).toEqual([...ASTROLOGY_SPECIALIZATIONS]);

    for (const label of labels) {
      const parsed = parseAstrologyFilters(
        new URLSearchParams(buildAstrologyQuery({ ...DEFAULT_ASTROLOGY_FILTERS, spec: label })),
      );
      expect(parsed.spec).toBe(label);
    }
  });

  it('never navigates: the router is untouched, so no _rsc round trip is required', async () => {
    await renderDirectory();
    clickText('Vastu');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('LC-12 — the astrology URL <-> filter mapping is a single round trip', () => {
  it('every filter survives build -> parse unchanged', () => {
    const f = { spec: 'Vastu', sort: 'price' as const, rashi: 'leo', online: true };
    expect(parseAstrologyFilters(new URLSearchParams(buildAstrologyQuery(f)))).toEqual(f);
  });

  it('defaults are omitted from the querystring', () => {
    expect(buildAstrologyQuery(DEFAULT_ASTROLOGY_FILTERS)).toBe('');
  });

  it('junk params fall back to the defaults rather than filtering to nothing', () => {
    const f = parseAstrologyFilters(
      new URLSearchParams('?filter=<script>&sort=DROP&rashi=not-a-rashi&online=yes'),
    );
    expect(f).toEqual(DEFAULT_ASTROLOGY_FILTERS);
  });
});
