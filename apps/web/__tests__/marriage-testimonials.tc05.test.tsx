/**
 * TC-05 (P1), wedding half — /pujas/marriage.
 *
 * The temple half of TC-05 removed 51 hand-written five-star testimonials from
 * /temples/[slug] and replaced them with the real reviews route (lib/reviews.ts).
 * The wedding surface kept its own set: `marriageTestimonials` in
 * lib/home-pujas.ts, three entries, every one `rating: 5`, with invented couples
 * (Aanya & Kabir Malhotra, Divya & Karthik Iyer, Simran & Jaspreet Singh),
 * invented officiating pandits (Acharya Vidyadhar Bhatt, Acharya Sundaresan
 * Shastri, Giani Harpreet Singh Ji) and dates in Feb/Mar 2026 — each one
 * asserting a wedding Darshya had already performed, under the heading "Couples
 * who said yes with Darshya" and the line "Real stories from recent weddings".
 *
 * There have been no completed weddings. The pandit names attach a real trade
 * credential (Acharya, Giani) to a person who does not exist, and the reviews
 * were the strongest social proof on a page that takes ₹11,000+ bookings.
 *
 * There is no wedding equivalent of the temple reviews route — no endpoint
 * serves rated wedding bookings — so the honest replacement is nothing at all,
 * not different data. The fixture is emptied rather than deleted so the page's
 * `.map()` keeps typechecking and the shape is on record for the day a real
 * source exists.
 *
 * Confirmed RED before the fix: `marriageTestimonials` had length 3 and the
 * rendered marriage page contained all three couples and all three pandits.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { marriageTestimonials } from '../lib/home-pujas';
import { getPublicPriests } from '../lib/pandit-api';

vi.mock('../lib/pandit-api', () => ({
  getPublicPriests: vi.fn(async () => []),
}));

import MarriagePage from '../app/pujas/marriage/page';

/** The fixture rows quote themselves in the comment that replaced them. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const homePujasSource = () =>
  stripComments(readFileSync(resolve(__dirname, '..', 'lib/home-pujas.ts'), 'utf8'));

/** Exactly what shipped, quoted from git history. */
const INVENTED_COUPLES = [
  'Aanya & Kabir Malhotra',
  'Divya & Karthik Iyer',
  'Simran & Jaspreet Singh',
];

const INVENTED_PANDITS = [
  'Acharya Vidyadhar Bhatt',
  'Acharya Sundaresan Shastri',
  'Giani Harpreet Singh Ji',
];

afterEach(() => {
  cleanup();
});

describe('TC-05 — the wedding page publishes no invented testimonials', () => {
  it('ships no testimonial fixture at all', () => {
    expect(marriageTestimonials).toHaveLength(0);
  });

  it('holds none of the invented couples in source', () => {
    const src = homePujasSource();
    for (const name of INVENTED_COUPLES) {
      expect(src).not.toContain(name);
    }
  });

  /**
   * Found while closing the above and NOT in the handoff note: the same three
   * couples appeared a second time in this file, as review rows inside
   * `weddingPandits`. Each of the 13 pandits in `homePandits`/`weddingPandits`
   * carried five — 65 invented customer reviews signed with full names.
   *
   * Nothing rendered them (the two booking pages that read these fixtures use
   * `rating`, `reviewCount` and `weddingsPerformed` only), which is exactly why
   * they had to go rather than be corrected: a ready-made block of five-star
   * testimonials one `.map()` from a render has no honest value.
   */
  it('keeps no dead review rows inside the pandit fixtures either', () => {
    const src = homePujasSource();
    expect(src).not.toMatch(/\breviews\s*:/);
    expect(src).not.toMatch(/\{\s*author\s*:/);
  });

  it('renders none of them on /pujas/marriage', async () => {
    const el = await MarriagePage();
    render(el);
    const html = document.body.innerHTML ?? '';
    // Sanity: the page mounted, so the absences below mean something.
    expect(html).toContain('Marriage Ceremony');

    for (const name of [...INVENTED_COUPLES, ...INVENTED_PANDITS]) {
      expect(html).not.toContain(name);
    }
    // Every fixture row carried `Officiated by <invented pandit>`.
    expect(html).not.toMatch(/Officiated by/i);
  });

  it('renders no testimonial section around the empty array', async () => {
    // Emptying the fixture left the SECTION standing: a heading reading
    // "Couples who said yes with Darshya" and the line "Real stories from
    // recent weddings." above an empty grid. Both sentences are claims in their
    // own right — a reader takes them as true and assumes the stories are
    // loading, which is worse than the fabrications they replaced because there
    // is now nothing on screen to disbelieve.
    const el = await MarriagePage();
    render(el);
    const html = document.body.innerHTML ?? '';
    expect(html).toContain('Marriage Ceremony');
    expect(html).not.toContain('Couples who said yes with Darshya');
    expect(html).not.toContain('Real stories from recent weddings');
  });

  it('cannot be refilled with a five-star row that has no booking behind it', () => {
    // A regression here would arrive as new literals in the array, not as a
    // shape change — so pin the array itself, not just the names above.
    for (const t of marriageTestimonials as { rating: number }[]) {
      throw new Error(
        `marriageTestimonials must stay empty until a real wedding review source exists; found rating ${t.rating}`,
      );
    }
    expect(marriageTestimonials.length).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-05, second half — the invented pandit directory
// ───────────────────────────────────────────────────────────────────────────

/**
 * The predecessor emptied `marriageTestimonials` and deleted the 65 dead
 * `reviews` rows, then left the fixture that fed them: `homePandits` (8) and
 * `weddingPandits` (5), thirteen hand-typed people who do not exist, each with
 * a name, a title, a city, a service area, a bio, university credentials, a
 * star rating to one decimal, a review count in the hundreds, a weddings-
 * performed tally up to 620, a seven-day availability calendar and a
 * `verified: { aadhaar, background, vedicCert }` block.
 *
 * Unlike the reviews, these WERE rendered — as the selectable roster in step 3
 * of the wedding checkout and step 2 of the home-puja checkout, under the
 * headings "13 Vedic-certified officiants" and "N verified specialists". A
 * couple picked a specific named officiant, with a specific rating, for a
 * specific price, and the person was not real. That is a stronger claim than
 * any testimonial on the page above it.
 *
 * Emptying the arrays was not available: an empty roster leaves a required
 * wizard step with nothing selectable. The real directory already exists and
 * both LANDING pages already use it — `getPublicPriests()` in lib/pandit-api.ts,
 * served by `GET /priests`, which returns only rows the platform actually has.
 * So both wizards are pointed at it, with an explicit "no preference" option so
 * the step still completes when the directory is empty.
 *
 * The astrology precedent was checked before deleting: nothing merges a live
 * overlay onto these arrays. `grep -rn 'homePandits\|weddingPandits' apps/web`
 * returned the declarations plus exactly two render sites, both rewritten here.
 */
const INVENTED_DIRECTORY = [
  'Acharya Shashank Tripathi',
  'Pandit Yogesh Sharma',
  'Acharya Ramesh Iyer',
  'Pandit Mukesh Shukla',
  'Acharya Hardik Mehta',
  'Pandit Debashish Chatterjee',
  'Pandit Kailash Trivedi',
  'Acharya Bhaskar Reddy',
  'Acharya Vidyadhar Bhatt',
  'Pandit Girish Joshi',
  'Acharya Sundaresan Shastri',
  'Giani Harpreet Singh Ji',
  'Pandit Ashok Pandey',
];

const bookingSource = (rel: string) =>
  stripComments(readFileSync(resolve(__dirname, '..', rel), 'utf8'));

describe('TC-05 — the booking wizards select from the real directory', () => {
  it('lib/home-pujas.ts exports no hand-typed pandit roster', async () => {
    const mod = await import('../lib/home-pujas');
    // Top-level module exports, not a nested field — the roster was two bare
    // `export const` arrays and that is exactly what must be gone.
    expect(Object.keys(mod)).not.toContain('homePandits');
    expect(Object.keys(mod)).not.toContain('weddingPandits');
  });

  it('holds none of the thirteen invented pandits in source', () => {
    const src = homePujasSource();
    for (const name of INVENTED_DIRECTORY) {
      expect(src, `home-pujas.ts still carries ${name}`).not.toContain(name);
    }
  });

  it('publishes no hand-typed rating, review count, wedding tally or credential flag', () => {
    const src = homePujasSource();
    expect(src).not.toMatch(/\breviewCount\s*:/);
    expect(src).not.toMatch(/\bweddingsPerformed\s*:/);
    expect(src).not.toMatch(/\bvedicCert\s*:/);
    expect(src).not.toMatch(/\bpujasPerformed\s*:/);
    // `rating: 4.9` on a person with no bookings is the same fabrication in one
    // number instead of a paragraph.
    expect(src).not.toMatch(/\brating\s*:\s*\d/);
  });

  it('the wedding wizard reads GET /priests instead of the fixture', () => {
    const src = bookingSource('app/pujas/marriage/book/page.tsx');
    expect(src).not.toMatch(/weddingPandits/);
    expect(src).toMatch(/getPublicPriests/);
    for (const name of INVENTED_DIRECTORY) {
      expect(src, `marriage/book still carries ${name}`).not.toContain(name);
    }
  });

  it('the home-puja wizard reads GET /priests instead of the fixture', () => {
    const src = bookingSource('app/pujas/home-puja/book/BookHomePujaClient.tsx');
    expect(src).not.toMatch(/homePandits/);
    expect(src).toMatch(/getPublicPriests/);
    for (const name of INVENTED_DIRECTORY) {
      expect(src, `home-puja/book still carries ${name}`).not.toContain(name);
    }
  });

  it('drops the dangling recommendedPanditIds pointing at deleted rows', () => {
    // Every category listed four ids from p1..p8. With the roster gone they
    // point at nothing, and a future reader would take them for real linkage.
    const src = homePujasSource();
    expect(src).not.toMatch(/recommendedPanditIds/);
  });

  it('neither wizard can strand a couple on a step with nothing to select', () => {
    // The real directory can legitimately be empty — GET /priests filters on
    // isVerified AND status='active', and the seeded rows are three. A required
    // step over an empty list is an unfinishable checkout, so both wizards
    // carry an explicit opt-out that is itself a selectable value.
    //
    // Matching the words "No preference" would NOT test this: both files
    // already contained that string, in the WhatsApp handoff message, before
    // the roster was touched. The sentinel is what makes it selectable.
    for (const rel of [
      'app/pujas/marriage/book/page.tsx',
      'app/pujas/home-puja/book/BookHomePujaClient.tsx',
    ]) {
      const src = bookingSource(rel);
      expect(src, `${rel} has no selectable no-preference value`).toMatch(
        /NO_PREFERENCE/,
      );
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-05 — the wizard, driven
// ───────────────────────────────────────────────────────────────────────────

/**
 * The source assertions above prove the fixture is gone and `getPublicPriests`
 * is imported. They do not prove the step RENDERS the real rows, which is the
 * thing a couple actually sees. This drives the wedding wizard to step 3 with a
 * stubbed directory and reads the roster off the screen.
 */
describe('TC-05 — the wedding wizard renders the real directory at step 3', () => {
  const REAL_PRIESTS = [
    {
      id: 'priest-1',
      displayName: 'Acharya Real Row',
      avatarUrl: null,
      bio: 'Performs vivah sanskar.',
      languages: ['Hindi', 'Sanskrit'],
      specializations: ['Marriage'],
      experienceYears: 12,
      ratingAvg: 0,
      ratingCount: 0,
      isVerified: true,
      offeringCount: 2,
    },
    {
      id: 'priest-2',
      displayName: 'Pandit Second Row',
      avatarUrl: null,
      bio: 'Wedding ceremonies.',
      languages: ['Tamil'],
      specializations: ['Wedding'],
      experienceYears: 8,
      ratingAvg: 4.5,
      ratingCount: 6,
      isVerified: true,
      offeringCount: 1,
    },
  ];

  async function driveToStep3() {
    const { default: BookMarriage } = await import('../app/pujas/marriage/book/page');
    render(<BookMarriage />);
    // The directory arrives from an effect. Flush it before driving the wizard,
    // or React reports the resolution as an unwrapped update.
    await act(async () => {});

    const names = screen.getAllByPlaceholderText('Full name');
    fireEvent.change(names[0], { target: { value: 'Bride' } });
    fireEvent.change(names[1], { target: { value: 'Groom' } });
    fireEvent.change(screen.getByPlaceholderText('DD/MM/YYYY'), {
      target: { value: '2027-02-14' },
    });

    // Step 1 -> 2 -> 3. Ceremony type and tier both carry defaults.
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
  }

  it('lists the priests GET /priests returned, and offers no preference', async () => {
    vi.mocked(getPublicPriests).mockResolvedValue(REAL_PRIESTS);
    await driveToStep3();

    await screen.findByText('Acharya Real Row');
    expect(screen.getByText('Pandit Second Row')).toBeTruthy();
    expect(screen.getByText('No preference')).toBeTruthy();
    // The row with no reviews says so rather than inventing a score. The
    // deleted fixture printed 4.7-5.0 on every row, reviews or not.
    expect(document.body.textContent).toContain('No reviews yet');
  });

  it('still lets the couple finish the step when the directory is empty', async () => {
    vi.mocked(getPublicPriests).mockResolvedValue([]);
    await driveToStep3();

    await screen.findByText('No preference');
    expect(document.body.textContent).toMatch(/No pandit profiles are published yet/i);
    // And the step is completable: selecting it enables the next Continue.
    fireEvent.click(screen.getByText('No preference'));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(document.body.textContent).toMatch(/Venue & details/i);
  });
});
