import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Owner decision 2026-10-06 (reverses COM-12): the Book Puja CTA is NEVER hidden.
 * Every registered temple gets standard offerings
 * (ops/sql/seed-default-temple-offerings.sql + the admin "Add standard
 * offerings" button), so the CTA must always render and always lead somewhere
 * that books: the temple-scoped puja list for a temple the API knows, the
 * catalogue for a curated-only page. No "coming soon" card, ever.
 */

const OFFERINGS = [
  { isActive: true, pujaType: { slug: 'rudrabhishek', name: 'Rudrabhishek' } },
];
const INACTIVE = [
  { isActive: false, pujaType: { slug: 'lakshmi-puja', name: 'Lakshmi Puja' } },
];

afterEach(() => cleanup());

describe('templeBookCta', () => {
  it('always offers booking, whatever the offerings say', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    expect(templeBookCta('kashi-vishwanath', 'kashi-vishwanath-varanasi', OFFERINGS)).toEqual({
      available: true,
      href: '/temples/kashi-vishwanath/pujas',
    });
    for (const offerings of [[], null, undefined, INACTIVE]) {
      const cta = templeBookCta('vaishno-devi', 'vaishno-devi-katra', offerings);
      expect(cta.available).toBe(true);
      expect(cta.href).toBe('/temples/vaishno-devi/pujas');
    }
  });

  it('a curated-only page (no API temple) still leads to the booking catalogue', async () => {
    const { templeBookCta } = await import('../lib/temple-booking');
    expect(templeBookCta('some-curated-temple', null, OFFERINGS)).toEqual({
      available: true,
      href: '/pujas',
    });
  });
});

describe('TempleBookPujaCta always renders the booking CTA', () => {
  it.each([
    ['with offerings', OFFERINGS],
    ['with no offerings', []],
    ['with null offerings', null],
    ['with only inactive offerings', INACTIVE],
  ])('card variant %s', async (_l, offerings) => {
    const { default: Cta } = await import('../components/temple/TempleBookPujaCta');
    const { container } = render(
      <Cta templeSlug="badrinath" apiTempleSlug="badrinath-uttarakhand" offerings={offerings} />,
    );
    expect(screen.getByText(/Book Puja via Darshya/i)).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/temples/badrinath/pujas');
  });

  it('button variant links to booking even with zero offerings', async () => {
    const { default: Cta } = await import('../components/temple/TempleBookPujaCta');
    const { container } = render(
      <Cta variant="button" templeSlug="vaishno-devi" apiTempleSlug="vaishno-devi-katra" offerings={[]} />,
    );
    expect(screen.getByText(/Book Puja/)).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/temples/vaishno-devi/pujas');
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
