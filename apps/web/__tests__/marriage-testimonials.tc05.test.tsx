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
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { marriageTestimonials } from '../lib/home-pujas';

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
