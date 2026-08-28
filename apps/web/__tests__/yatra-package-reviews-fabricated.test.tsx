/**
 * The nine yatra packages publish twenty-seven testimonials from people who do
 * not exist.
 *
 * TC-06 found this exact pattern in this exact file and swept only half of it.
 * Its own header names the instruments — "the fake-review pattern the CCPA
 * framework and BIS IS 19000:2022 address" — and it deleted the eight invented
 * travel companions together with their sixteen invented reviewers. But
 * `lib/yatra-data.ts` also carries a `reviews` array on every one of the nine
 * `Yatra` records, and those were never in TC-06's scope:
 *
 *   char-dham         Ramesh Iyer (Chennai), Meena Sharma (Delhi), Kapil Malhotra
 *   do-dham           Sanjay Gupta (Kanpur), Lakshmi Narayan (Hyderabad), Asha Devi
 *   jyotirlinga-yatra Om Prakash (Lucknow), Sushma and Vinod Desai (Pune), Harish Agarwal
 *   four-dhams-india  Anand Bhatt, Vasudha Nair, Madhav Rao
 *   amarnath          Vikram Singh, Priya Saxena, Rohit Verma
 *   vaishno-devi      Sunita Agarwal, Rajesh Khanna, Geeta Patel
 *   shirdi-sai        Ashwini Deshmukh, Suresh Iyengar, and a third
 *   tirupati-south    three more
 *   ayodhya-kashi     three more
 *
 * Each is a full name, a home city, a star rating out of five, a calendar month
 * and a first-person narrative — "Did it with my 75-year-old mother", "Third
 * time doing it with Darshya", "Completed Char Dham at 68". They render on
 * `/yatra/<slug>` under the heading "Pilgrim reviews / Stories from past
 * devotees" (app/yatra/[slug]/page.tsx), three cards per package, each with a
 * filled five-star row above the quote.
 *
 * Not one of them can be real. The yatra desk takes no money: `/yatra/<slug>/book`
 * posts a lead to `POST /api/v1/yatra-inquiry`, there is no Yatra model in
 * Prisma, and lib/faqs.ts states the model outright — "Inquiry-only model:
 * submit at /yatra/{slug}/book and our team responds within 24 hours". Nobody
 * has travelled a Darshya yatra, so nobody has reviewed one. "Third time doing
 * it with Darshya" is a claim about a repeat customer the platform has never
 * had, and one of the invented names is that of a famous Indian actor.
 *
 * THE RULE, already written twice in this codebase and applied here: a review
 * publishes only once a real customer left it (lib/companion-roster.ts —
 * "`rating`/`reviewCount` at 0 until real yatris have rated them"), and a
 * social-proof surface with nothing true to say renders its empty state rather
 * than a remembered figure (lib/social-proof.ts).
 *
 * These assertions read the RUNTIME records and the RENDERED page. Nothing here
 * scans source text, so there is no comment to strip and no way for a reworded
 * testimonial to slip past.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { yatras as YATRAS, getYatraBySlug } from '../lib/yatra-data';
import YatraDetailPage from '../app/yatra/[slug]/page';

/** Every string reachable from a record, including inside nested arrays. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

/** The three names that shipped on /yatra/vaishno-devi. */
const SHIPPED_NAMES = ['Sunita Agarwal', 'Rajesh Khanna', 'Geeta Patel'];

describe('no yatra package publishes a testimonial', () => {
  it('there are nine packages, so the sweep is looking at all of them', () => {
    expect(YATRAS.length).toBe(9);
  });

  it.each(YATRAS.map((y) => y.slug))('%s carries no reviews', (slug) => {
    const y = getYatraBySlug(slug);
    expect(y, `${slug} is missing from YATRAS`).toBeDefined();
    expect(
      y!.reviews,
      `${slug} publishes a testimonial; the yatra desk is inquiry-only and has never sold a seat`,
    ).toEqual([]);
  });

  it('no package record quotes a person who supposedly travelled with us', () => {
    const haystack = strings(YATRAS).join('   ');
    for (const name of SHIPPED_NAMES) {
      expect(haystack, `${name} is still quoted somewhere in the yatra records`).not.toContain(name);
    }
    // The two most specific first-person claims, which no data source produced.
    expect(haystack).not.toMatch(/third time doing it with darshya/i);
    expect(haystack).not.toMatch(/did it with my 75-year-old mother/i);
  });

  it('every package still carries the real content, so this is not a blanket wipe', () => {
    for (const y of YATRAS) {
      expect(y.itinerary.length, `${y.slug} lost its itinerary`).toBeGreaterThan(0);
      expect(y.packages.length, `${y.slug} lost its price tiers`).toBeGreaterThan(0);
      expect(y.faqs.length, `${y.slug} lost its FAQs`).toBeGreaterThan(0);
      expect(y.startingPrice, `${y.slug} lost its price`).toBeGreaterThan(0);
    }
  });
});

describe('/yatra/vaishno-devi renders no testimonial and says so honestly', () => {
  async function renderYatra(slug: string): Promise<string> {
    const ui = await YatraDetailPage({ params: Promise.resolve({ slug }) });
    const { container } = render(ui);
    return container.textContent ?? '';
  }

  it('prints none of the three names that shipped', async () => {
    const text = await renderYatra('vaishno-devi');
    for (const name of SHIPPED_NAMES) {
      expect(text, `${name} is still on the page`).not.toContain(name);
    }
  });

  it('does not leave a "Pilgrim reviews" heading standing over nothing', async () => {
    const text = await renderYatra('vaishno-devi');
    // The section keeps its place in the page, but says what is true: there is
    // nothing here yet. Same shape as /yatra/companion/[id], which already
    // renders this empty state for the roster TC-06 emptied.
    expect(text).toMatch(/no reviews yet/i);
  });

  it('still renders the yatra itself', async () => {
    const text = await renderYatra('vaishno-devi');
    expect(text).toContain('Vaishno Devi');
    expect(text).toMatch(/Yatra Parchi/i);
  });
});
