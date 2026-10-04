/**
 * TC-05 (P1) — fabricated five-star customer reviews rendered as real on the
 * temple pages.
 *
 * `lib/temple-details.ts` carries 17 `testimonials:` blocks holding 51
 * hand-written testimonials, 46 of them five-star. Each has an invented full
 * name, an invented home city, initials rendered into an avatar circle and a
 * row of filled stars, and several assert a transaction that never happened —
 * "Booked Mangala Aarti through Darshya and reached Gate 4 at 2:30 AM",
 * "Booked the Light & Sound VIP seating plus next-morning VIP darshan",
 * "Prasad delivery reached home in 4 days". `/temples/[slug]` rendered them
 * under "Tips from Devotees" on every one of those 17 pages, above a booking
 * CTA. Invented customer testimonials on a page that then asks for money are a
 * consumer-protection problem, and the same class as the invented astrologer
 * reviews removed under AW-02.
 *
 * The fixture rows are deliberately NOT deleted. `temple-details.ts` is shared
 * (hero copy, timings, FAQs, similar-temple links) and `testimonials` is an
 * optional field, so what is under test is that nothing PUBLISHES them — the
 * same shape as the astrologer fixture map, where deleting the structure would
 * have broken the real rows that overlay onto it.
 *
 * Empty is honest. An invented five-star review is not.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TEMPLE_DETAILS } from '../lib/temple-details';

vi.mock('../lib/temple-resolve', () => ({
  resolveApiTemple: vi.fn(async () => null),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  permanentRedirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/temples',
  useSearchParams: () => new URLSearchParams(),
}));

import TempleDetailPage from '../app/temples/[slug]/page';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/**
 * Strip comments before every source scan. The comment that records why the
 * testimonials were removed necessarily quotes them, so a raw-text scan would
 * match its own documentation and pass while the bug was still live. That
 * exact mistake has been made repeatedly in this sweep.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

type Testimonial = { name: string; city: string; text: string; rating: number };

const withTestimonials = Object.values(TEMPLE_DETAILS).filter(
  (t) => (t.testimonials?.length ?? 0) > 0,
);
const allTestimonials: Testimonial[] = withTestimonials.flatMap(
  (t) => (t.testimonials ?? []) as Testimonial[],
);

describe('TC-05 — the fixture is intact, so this pins a gate and not a deletion', () => {
  it('still holds the fabricated testimonial rows', () => {
    expect(withTestimonials.length).toBeGreaterThanOrEqual(17);
    expect(allTestimonials.length).toBeGreaterThanOrEqual(51);
    expect(allTestimonials.filter((t) => t.rating === 5).length).toBeGreaterThanOrEqual(46);
  });
});

describe('TC-05 — /temples/[slug] publishes no invented review', () => {
  const CASES = withTestimonials.slice(0, 6);

  for (const rich of CASES) {
    it(`renders no testimonial author, city line or quote for /temples/${rich.slug}`, async () => {
      cleanup();
      const el = await TempleDetailPage({ params: Promise.resolve({ slug: rich.slug }) });
      render(el);
      const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');

      for (const t of (rich.testimonials ?? []) as Testimonial[]) {
        expect(text).not.toContain(t.name);
        expect(text).not.toContain(t.text);
      }
      // The section heading the invented reviews shipped under. Read the
      // markup here, not textContent: happy-dom drops the text node that
      // follows an inline <svg> in the same element, and this heading is
      // <Heart/>Tips from Devotees — a textContent scan would pass while the
      // heading was still on screen.
      expect(document.body.innerHTML ?? '').not.toMatch(/Tips from Devotees/i);
      // Sanity: the page really did render, so "not present" means removed and
      // not merely never mounted.
      expect(text).toContain(rich.name);
    });
  }

  it('never renders a review claiming a Darshya booking that never happened', async () => {
    cleanup();
    const el = await TempleDetailPage({
      params: Promise.resolve({ slug: 'kashi-vishwanath' }),
    });
    render(el);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/Booked Mangala Aarti through Darshya/i);
    expect(text).not.toMatch(/reached Gate 4 at 2:30 AM/i);
  });
});

describe('TC-05 — no temple surface reads the testimonial fixture', () => {
  const RENDERERS = [
    'app/temples/[slug]/page.tsx',
    'app/temples/(index)/page.tsx',
    'app/temples/[slug]/pujas/page.tsx',
    'components/temple/TempleBookPujaCta.tsx',
  ];

  for (const rel of RENDERERS) {
    it(`${rel} does not read .testimonials`, () => {
      const src = stripComments(read(rel));
      expect(src).not.toMatch(/\.testimonials/);
    });
  }
});
