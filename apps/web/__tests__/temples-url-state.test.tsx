/**
 * LC-12 (prod sweep 2026-08-12) — /temples filter + sort state never reached
 * the URL, so no filtered view was shareable, bookmarkable or SEO-indexable,
 * and Back exited the page instead of clearing the filter.
 *
 * The read path already worked (/temples?deity=Vishnu renders 9 temples); only
 * the WRITE half was missing. TemplesBrowser called `router.replace()` inside
 * an effect, which in the App Router is a full navigation: every deity chip,
 * every sort change and every debounced keystroke fired
 * `GET /temples?...&_rsc=…`, re-running the server component — including the
 * `getTemples()` API call behind the Suspense boundary. The address bar only
 * updates once that round trip commits, so on a cold or wedged API (Render free
 * tier spins down; the sweep saw the API stop answering under load) the URL
 * never changed at all. `router.replace` also writes no history entry, so Back
 * could never undo a filter.
 *
 * Filtering here is 100% client side over an already-loaded array — the server
 * has nothing to contribute. The fix uses the native History API (supported by
 * the Next App Router since 14.1) so filter state lands in the URL with no
 * server round trip, plus a popstate listener so Back actually reverts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { TemplesBrowser, type TempleCardData } from '../components/temples/TemplesBrowser';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/temples',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function temple(over: Partial<TempleCardData> & { slug: string; name: string }): TempleCardData {
  return {
    city: 'Somewhere',
    state: 'Uttar Pradesh',
    tradition: 'Shaiva',
    deityPrimary: 'Lord Shiva',
    deityType: 'Shiva',
    description: 'A sacred temple.',
    isVerified: true,
    trustScore: 90,
    liveDarshanEnabled: false,
    viewers: 0,
    isJyotirlinga: false,
    isShaktiPeetha: false,
    isDivyaDesam: false,
    popularity: 50,
    hasRichDetail: true,
    imageUrl: null,
    ...over,
  };
}

const TEMPLES: TempleCardData[] = [
  temple({ slug: 'kashi-vishwanath', name: 'Kashi Vishwanath', popularity: 100 }),
  temple({ slug: 'somnath', name: 'Somnath', state: 'Gujarat', popularity: 90 }),
  temple({
    slug: 'tirupati-balaji',
    name: 'Tirupati Balaji',
    state: 'Andhra Pradesh',
    deityType: 'Vishnu',
    deityPrimary: 'Lord Venkateswara',
    popularity: 80,
    liveDarshanEnabled: true,
  }),
  temple({
    slug: 'jagannath-puri',
    name: 'Jagannath Puri',
    state: 'Odisha',
    deityType: 'Vishnu',
    deityPrimary: 'Lord Jagannath',
    popularity: 70,
  }),
];

function shownCount(): number {
  const text = document.body.textContent ?? '';
  const m = /Showing\s*(\d+)/.exec(text);
  return m ? Number(m[1]) : -1;
}

function clickText(label: string) {
  const el = screen
    .getAllByRole('button')
    .find((b) => (b.textContent ?? '').trim() === label);
  if (!el) throw new Error(`no button labelled "${label}"`);
  act(() => {
    el.click();
  });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/temples');
});

describe('LC-12 — /temples filter state must land in the URL', () => {
  it('a deity chip writes ?deity= into the address bar', () => {
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    expect(shownCount()).toBe(4);

    clickText('Lord Vishnu');

    expect(window.location.search).toBe('?deity=Vishnu');
    expect(shownCount()).toBe(2);
  });

  it('the sort mode is shareable too', () => {
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    const sort = document.querySelector('select[aria-label="Sort temples"]') as HTMLSelectElement;
    expect(sort).toBeTruthy();
    act(() => {
      sort.value = 'alphabetical';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(window.location.search).toBe('?sort=alphabetical');
  });

  it('the Live Darshan toggle and the state select both reach the URL', () => {
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    clickText('Live Darshan');
    expect(window.location.search).toBe('?live=1');
    expect(shownCount()).toBe(1);

    const stateSelect = document.querySelector(
      'select[aria-label="Filter by state"]',
    ) as HTMLSelectElement;
    expect(stateSelect).toBeTruthy();
  });

  it('applying a filter pushes a history entry so Back can undo it', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    clickText('Lord Vishnu');
    expect(push).toHaveBeenCalled();
    expect(String(push.mock.calls[0]![2])).toContain('deity=Vishnu');
  });

  it('Back (popstate) reverts the rendered list, not just the URL', () => {
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    clickText('Lord Vishnu');
    expect(shownCount()).toBe(2);

    // What the browser does on Back: URL rewinds, then popstate fires.
    act(() => {
      window.history.replaceState(null, '', '/temples');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(shownCount()).toBe(4);
    const vishnuChip = screen
      .getAllByRole('button')
      .find((b) => (b.textContent ?? '').trim() === 'Lord Vishnu')!;
    expect(vishnuChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('Clear wipes every control out of the URL, sort included', () => {
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    clickText('Lord Vishnu');
    const sort = document.querySelector('select[aria-label="Sort temples"]') as HTMLSelectElement;
    act(() => {
      sort.value = 'alphabetical';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(window.location.search).toContain('sort=alphabetical');

    clickText('Clear');

    expect(window.location.search).toBe('');
    expect(shownCount()).toBe(4);
    expect(
      (document.querySelector('select[aria-label="Sort temples"]') as HTMLSelectElement).value,
    ).toBe('popularity');
  });

  it('the debounced search box reaches the URL, but via replace — typing must not bury Back', async () => {
    vi.useFakeTimers();
    try {
      const push = vi.spyOn(window.history, 'pushState');
      render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
      const box = document.querySelector('input[type="text"]') as HTMLInputElement;
      fireEvent.change(box, { target: { value: 'Tirupati' } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(window.location.search).toBe('?q=Tirupati');
      expect(shownCount()).toBe(1);
      expect(push).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('mounts already filtered when the URL carries params (deep link / SEO landing)', () => {
    window.history.replaceState(null, '', '/temples?deity=Vishnu&sort=alphabetical');
    render(<TemplesBrowser temples={TEMPLES} total={TEMPLES.length} />);
    expect(shownCount()).toBe(2);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Jagannath Puri', 'Tirupati Balaji']);
  });
});
