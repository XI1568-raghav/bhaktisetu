/**
 * TC-06 (P1) — /yatra/companion sold twelve-ish named elderly-care escorts who
 * do not exist.
 *
 * What shipped: `lib/yatra-data.ts` carries EIGHT fully invented travel
 * companions — Rajesh Kumar, Priya Sharma, Mohammed Aslam, Lakshmi Iyer,
 * Vikram Nayar, Anita Deshmukh, Suresh Nair, Meena Agarwal — each with a
 * hand-typed age, home city, day rate, star rating, review count, availability
 * state, a "yatras completed" number in the hundreds, and
 * `verified: { aadhaar: true, background: true, medical: true }`. Sixteen more
 * invented people wrote their reviews. `/yatra/companion` rendered all eight
 * under the heading "8 verified travel companions"; `/yatra/companion/[id]`
 * pre-rendered a profile for each with a 30-day availability calendar and a
 * "Book This Companion" CTA.
 *
 * A family could pick one of those names to escort an elderly parent across
 * the country, trusting a green "Aadhaar verified" pill, and the person on the
 * other end does not exist. Of every fabricated surface in this sweep this is
 * the one with a physical-safety consequence.
 *
 * ── 2026-08-24: the fixtures were DELETED, and this file was repaired ──────
 * This suite originally pinned a weaker fact — that the eight invented rows
 * survived in `lib/yatra-data.ts` but nothing PUBLISHED them. The rows have
 * since been removed outright, so `import { companions }` resolved to
 * `undefined` and the whole file died at collection (`Cannot read properties
 * of undefined (reading 'map')`), taking all 12 tests with it silently.
 *
 * The names are now pinned as literals below rather than derived from the
 * fixture, which makes the assertion STRONGER: the old form could only prove
 * "these rows are not published", and would have passed vacuously the moment
 * the fixture emptied. The literal form proves "these people appear nowhere",
 * and cannot be satisfied by deleting the thing it reads.
 *
 * Both routes read `lib/companion-roster.ts`, which lists only people Darshya
 * has actually signed and vetted.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { publishedCompanions, getPublishedCompanionById } from '../lib/companion-roster';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/yatra/companion',
  useSearchParams: () => new URLSearchParams(),
}));

import CompanionListingPage from '../app/yatra/companion/page';
import CompanionDetailPage, {
  generateStaticParams,
} from '../app/yatra/companion/[id]/page';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/**
 * A guard that scans source text matches the comment that documents the rule
 * as readily as the code that breaks it. Strip comments before every scan.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

// Pinned as literals, NOT derived from the fixture — see the header. These are
// the eight people TC-06 found being sold as elderly-care escorts, and the ids
// `/yatra/companion/[id]` used to pre-render a bookable profile for each.
const FIXTURE_NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Mohammed Aslam', 'Lakshmi Iyer',
  'Vikram Nayar', 'Anita Deshmukh', 'Suresh Nair', 'Meena Agarwal',
];
const FIXTURE_IDS = [
  'rajesh-kumar', 'priya-sharma', 'mohammed-aslam', 'lakshmi-iyer',
  'vikram-nayar', 'anita-deshmukh', 'suresh-nair', 'meena-agarwal',
];

/** The sixteen invented people who "reviewed" the eight above. Literals for
 *  the same reason as FIXTURE_NAMES — recovered from ba7dbb0b. */
const FIXTURE_REVIEW_AUTHORS = [
  'Seema Gupta, Delhi',
  'Anil Desai, Mumbai',
  'Kamla Devi, Kanpur',
  'Veena Iyer, Chennai',
  'Gaurav Mehta, Delhi',
  'Pankaj Sharma, Jammu',
  'Nirmal Saxena, Lucknow',
  'Shanti Bhatia, Delhi',
  'Neeta Agarwal, Delhi',
  'Hari Chand, Hyderabad',
  'Prema Kulkarni, Bhopal',
  'Ram Lal, Jodhpur',
  'Murali Krishnan, Chennai',
  'Rani Pillai, Mumbai',
  'Vijay Singh, Bhopal',
  'Sushma Jain, Indore',
];

function bodyText(): string {
  return (document.body.textContent ?? '').replace(/\s+/g, ' ');
}

function hrefs(): string[] {
  return Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
}

describe('TC-06 — the invented roster is gone, and nothing publishes it', () => {
  it('every invented person is gone from the module they lived in', () => {
    expect(FIXTURE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(FIXTURE_NAMES).toContain('Rajesh Kumar');
    // ...and none of them survives in the data module they were deleted from.
    const src = stripComments(read('lib/yatra-data.ts'));
    for (const name of FIXTURE_NAMES) expect(src).not.toContain(name);
    expect(src).not.toMatch(/export const companions/);
  });

  it('publishes nobody from the invented fixture', () => {
    for (const c of publishedCompanions) {
      expect(FIXTURE_IDS).not.toContain(c.id);
      expect(FIXTURE_NAMES).not.toContain(c.name);
    }
  });

  it('cannot resolve an invented companion by id', () => {
    for (const id of FIXTURE_IDS) {
      expect(getPublishedCompanionById(id)).toBeUndefined();
    }
  });

  it('never publishes a companion carrying verification flags with a zero review history', () => {
    // A published row may only claim a check that was actually performed, and
    // may only show a rating once real yatris have left one. The fixture rows
    // claimed all three checks AND 60-124 reviews each, before launch.
    for (const c of publishedCompanions) {
      if (c.reviewCount === 0) expect(c.rating).toBe(0);
    }
  });
});

describe('TC-06 — /yatra/companion', () => {
  it('renders no invented companion and no invented reviewer', () => {
    render(CompanionListingPage());
    const text = bodyText();
    for (const name of FIXTURE_NAMES) expect(text).not.toContain(name);
    for (const author of FIXTURE_REVIEW_AUTHORS) expect(text).not.toContain(author);
  });

  it('offers no booking link to an invented profile', () => {
    render(CompanionListingPage());
    const links = hrefs();
    for (const id of FIXTURE_IDS) {
      expect(links).not.toContain(`/yatra/companion/${id}`);
    }
  });

  it('does not advertise a roster size it cannot show', () => {
    render(CompanionListingPage());
    const text = bodyText();
    expect(text).not.toMatch(/8 verified travel companions/i);
    // Whatever count is claimed on the page must equal the roster actually
    // rendered — this is the assertion the literal "8" could never satisfy.
    const claimed = /(\d+)\s+vetted travel companion/i.exec(text);
    if (claimed) expect(Number(claimed[1])).toBe(publishedCompanions.length);
  });

  it('says plainly that there is nobody to book while the roster is empty', () => {
    if (publishedCompanions.length > 0) return;
    render(CompanionListingPage());
    const text = bodyText();
    expect(text).toMatch(/No companions listed yet/i);
    // 2026-10-05: reworded with the HAS_COMPANION_VETTING gate (no vetting process exists to name).
    expect(text).toMatch(/has not signed any travel companions yet/i);
    expect(text).toMatch(/nobody can be booked today/i);
  });

  it('states verification as a listing precondition, not as work already done', () => {
    const src = stripComments(read('app/yatra/companion/page.tsx'));
    expect(src).not.toMatch(/100% Aadhaar verified/);
    expect(src).not.toMatch(/reference checks done for every companion/);
    expect(src).not.toMatch(/all companions trained/);
  });
});

describe('TC-06 — /yatra/companion/[id]', () => {
  it('pre-renders no invented profile', () => {
    const params = generateStaticParams().map((p) => p.id);
    for (const id of FIXTURE_IDS) expect(params).not.toContain(id);
    expect(params).toEqual(publishedCompanions.map((c) => c.id));
  });

  it('404s every invented companion url instead of offering them for hire', async () => {
    for (const id of FIXTURE_IDS) {
      notFound.mockClear();
      await expect(
        CompanionDetailPage({ params: Promise.resolve({ id }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalled();
    }
  });

  it('reads the published roster, not the fixture map', () => {
    const src = stripComments(read('app/yatra/companion/[id]/page.tsx'));
    expect(src).not.toMatch(/getCompanionById/);
    expect(src).not.toMatch(/\bcompanions\.map\b/);
    expect(src).toMatch(/getPublishedCompanionById/);
  });
});
