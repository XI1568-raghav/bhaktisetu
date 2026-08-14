/**
 * /temples told the user "Showing 33 of 22 temples" on a completely unfiltered
 * page — a subset larger than the set it was drawn from.
 *
 * The numerator and the denominator came from two different places.
 * `TemplesData` builds `merged` = the 22 rich-detail temples + every API row
 * whose canonicalised slug found no rich twin (11 on prod, so 33 cards), but
 * passed `total` = `Math.max(pagination.total, richCards.length)` = 22. The
 * browser then rendered `Showing {filtered.length} of {total}`.
 *
 * The invariant these tests pin: whatever `total` means, it is the size of the
 * list the browser was handed, so the number after "of" can never be smaller
 * than the number before it. Test 1 holds the page (the actual source of the
 * mismatch); test 2 holds the component, so a future caller passing a stale
 * total cannot resurrect the contradiction on screen.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { TempleListItem } from '../lib/api';

// 11 API temples whose slugs canonicalise to nothing in TEMPLE_DETAILS, so
// every one of them is appended to the rich cards instead of merging — the
// exact prod shape that produced 33 cards against a total of 22.
const EXTRA_API_TEMPLES: TempleListItem[] = Array.from({ length: 11 }, (_, i) => ({
  id: `api-${i}`,
  name: `API Temple ${i}`,
  nameLocal: null,
  slug: `unlisted-api-temple-${i}`,
  description: 'Seeded by the API, absent from the rich-detail map.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva'],
  tradition: 'Shaiva',
  city: 'Somewhere',
  state: 'Uttar Pradesh',
  lat: 0,
  lng: 0,
  images: [],
  isVerified: true,
  trustScore: 90,
  liveDarshanEnabled: false,
  status: 'ACTIVE',
}));

// pagination.total is 22 here — the API's own count of the rows it considers
// canonical. It is NOT the size of the merged list, which is the whole bug.
vi.mock('../lib/api', () => ({
  getTemples: vi.fn(async () => ({
    data: EXTRA_API_TEMPLES,
    pagination: { page: 1, limit: 50, total: 22, totalPages: 1 },
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/temples',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import TemplesPage from '../app/temples/page';
import { TemplesBrowser, type TempleCardData } from '../components/temples/TemplesBrowser';

interface BrowserProps {
  temples: TempleCardData[];
  total: number;
}

/** Drive the page down to the props it hands TemplesBrowser. */
async function templesBrowserProps(): Promise<BrowserProps> {
  const page = TemplesPage() as ReactElement<{ children: ReactElement }>;
  const dataElement = page.props.children;
  const TemplesData = dataElement.type as () => Promise<ReactElement<BrowserProps>>;
  const browser = await TemplesData();
  return browser.props;
}

/**
 * Read the count line as the user sees it. The "of N" clause is omitted when
 * nothing is filtered out, in which case the denominator IS the shown count.
 */
function countLine(): { shown: number; total: number; text: string } {
  const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
  const match = /Showing (\d+)(?: of (\d+))? temple/.exec(text);
  if (!match) throw new Error(`no count line in: ${text.slice(0, 200)}`);
  const shown = Number(match[1]);
  return { shown, total: match[2] === undefined ? shown : Number(match[2]), text };
}

function templeFixture(over: Partial<TempleCardData> & { slug: string }): TempleCardData {
  return {
    name: over.slug,
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

describe('/temples count line never reports a subset larger than its total', () => {
  it('hands TemplesBrowser a total that covers every temple it also hands over', async () => {
    const { temples, total } = await templesBrowserProps();

    // Sanity: the mock must actually reproduce the merge that overflows —
    // 22 rich cards + 11 unmatched API rows.
    expect(temples.length).toBe(33);
    expect(total).toBeGreaterThanOrEqual(temples.length);
  });

  it('shows no "of N" contradiction on an unfiltered page', async () => {
    const { temples, total } = await templesBrowserProps();
    render(<TemplesBrowser temples={temples} total={total} />);

    const { shown, total: shownTotal, text } = countLine();
    expect(shown).toBe(temples.length);
    expect(shownTotal, `count line reads: "${text.match(/Showing[^.]*/)?.[0]}"`).toBeGreaterThanOrEqual(
      shown,
    );
  });

  it('keeps the denominator honest even when handed a stale total', () => {
    const temples = Array.from({ length: 33 }, (_, i) =>
      templeFixture({ slug: `temple-${i}`, name: `Temple ${i}` }),
    );

    render(<TemplesBrowser temples={temples} total={22} />);

    const { shown, total } = countLine();
    expect(shown).toBe(33);
    expect(total).toBeGreaterThanOrEqual(shown);
  });

  it('still reports the full set as the denominator once a filter narrows the list', () => {
    const temples = [
      ...Array.from({ length: 20 }, (_, i) =>
        templeFixture({ slug: `shiva-${i}`, name: `Shiva Temple ${i}` }),
      ),
      ...Array.from({ length: 13 }, (_, i) =>
        templeFixture({
          slug: `vishnu-${i}`,
          name: `Vishnu Temple ${i}`,
          deityType: 'Vishnu',
          deityPrimary: 'Lord Vishnu',
        }),
      ),
    ];

    render(<TemplesBrowser temples={temples} total={22} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lord Vishnu' }));

    const { shown, total } = countLine();
    expect(shown).toBe(13);
    expect(total).toBe(33);
  });
});
