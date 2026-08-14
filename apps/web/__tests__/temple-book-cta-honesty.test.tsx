import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * COM-12 (prod sweep 2026-08-12, P2/ux) — 15 of 20 temple pages advertised
 * "Book Puja via Darshya — Verified priests, video proof, prasad delivery to
 * your door" with nothing bookable behind it.
 *
 * Verified against the database on 2026-08-13:
 *   select count(*) from temples                                    -> 20
 *   select count(distinct temple_id) from temple_puja_offerings
 *     where is_active                                               -> 5
 * The other 15 — akshardham-delhi, badrinath-uttarakhand,
 * vaishno-devi-katra, shirdi-sai-baba, meenakshi-madurai and the rest —
 * return `{"pujas":[]}`. Vaishno Devi and Badrinath are among the
 * highest-intent temple queries in India, so this is the traffic most likely
 * to convert landing on a promise with nothing behind it.
 *
 * The sibling half of the finding — the CTA carrying a truncated slug
 * (`/pujas?temple=vaishno-devi` for temple `vaishno-devi-katra`) — was closed
 * by DF-04's `templeBookHref`; see temple-booking-deeplinks.test.ts.
 *
 * The rule this locks: the booking promise is rendered from live offerings, or
 * it is not rendered at all. No fixture, no optimistic default.
 */

const OFFERINGS = [
  { isActive: true, pujaType: { slug: 'rudrabhishek', name: 'Rudrabhishek' } },
];
const INACTIVE = [
  { isActive: false, pujaType: { slug: 'lakshmi-puja', name: 'Lakshmi Puja' } },
];

afterEach(() => cleanup());

describe('templeBookCta', () => {
  it('offers booking when the temple has at least one active offering', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    const cta = templeBookCta('kashi-vishwanath', 'kashi-vishwanath-varanasi', OFFERINGS);
    expect(cta.available).toBe(true);
    expect(cta.href).toBe('/temples/kashi-vishwanath/pujas');
  });

  it('refuses to promise booking when the temple has zero offerings', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    expect(templeBookCta('vaishno-devi', 'vaishno-devi-katra', []).available).toBe(false);
    expect(templeBookCta('badrinath', 'badrinath-uttarakhand', null).available).toBe(false);
  });

  it('does not count an inactive offering as bookable', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    expect(templeBookCta('akshardham', 'akshardham-delhi', INACTIVE).available).toBe(false);
  });

  it('refuses when the API has no such temple, even if offerings were passed', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    expect(templeBookCta('some-curated-temple', null, OFFERINGS).available).toBe(false);
  });
});

describe('TempleBookPujaCta renders only what is true', () => {
  it('renders the booking promise for a temple that has offerings', async () => {
    const { default: Cta } = await import('../components/temple/TempleBookPujaCta');
    render(
      <Cta
        templeSlug="kashi-vishwanath"
        apiTempleSlug="kashi-vishwanath-varanasi"
        offerings={OFFERINGS}
      />,
    );
    expect(screen.getByText(/Book Puja via Darshya/i)).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('never shows the booking promise for a temple with nothing bookable', async () => {
    const { default: Cta } = await import('../components/temple/TempleBookPujaCta');
    render(
      <Cta templeSlug="vaishno-devi" apiTempleSlug="vaishno-devi-katra" offerings={[]} />,
    );
    expect(screen.queryByText(/Book Puja via Darshya/i)).toBeNull();
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it('the empty state still gives the devotee somewhere real to go', async () => {
    const { default: Cta } = await import('../components/temple/TempleBookPujaCta');
    const { container } = render(
      <Cta templeSlug="badrinath" apiTempleSlug="badrinath-uttarakhand" offerings={[]} />,
    );
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/pujas');
  });
});

describe('the temple page routes its CTA through the guard', () => {
  it('does not render the booking promise inline any more', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'app/temples/[slug]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('TempleBookPujaCta');
    // The literal promise must live in the guarded component, nowhere else.
    expect(src).not.toContain('Book Puja via Darshya');
  });
});
