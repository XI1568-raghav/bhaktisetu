import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { TIRTHAS } from '../lib/tirthas';
import { resolveNearbyTirthas } from '../lib/tirtha-slug';
import TirthaPage from '../app/tirth/[slug]/page';

// CI-13 — the "Nearby tirthas" block rendered `t.nearbyTirthas` verbatim, and
// half the catalogue stores those as slugs. 37 of the 84 pages therefore
// printed bullets reading "thillai-kali-temple" and "mukteshwar-temple", and
// not one of the 392 entries across all 84 pages was a link, including the
// ones naming a tirtha the site publishes a full page for.

const RAW_SLUG = /^[a-z0-9]+(-[a-z0-9]+)+$/;

describe('CI-13 — nearby tirthas read as names and link where a page exists', () => {
  it('the catalogue really does store slugs, not labels', () => {
    // Premise guard: this is what makes the humanising step necessary.
    const rawEntries = TIRTHAS.flatMap((t) => t.nearbyTirthas).filter((n) => RAW_SLUG.test(n));
    expect(rawEntries.length).toBeGreaterThan(100);
  });

  it('no entry on any of the 84 pages survives as a raw slug', () => {
    for (const t of TIRTHAS) {
      for (const item of resolveNearbyTirthas(t.nearbyTirthas)) {
        expect(RAW_SLUG.test(item.label), `${t.slug}: ${item.label}`).toBe(false);
        expect(item.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('an entry naming a published tirtha becomes a link to its canonical URL', () => {
    const items = resolveNearbyTirthas(['kedarnath-jyotirlinga', 'badrinath-temple']);
    // Both are alias slugs — they must resolve THROUGH the alias table.
    expect(items[0]).toMatchObject({ href: '/tirth/kedarnath', label: 'Kedarnath' });
    expect(items[1]).toMatchObject({ href: '/tirth/badrinath', label: 'Badrinath' });
  });

  it('an entry with no page is plain text, never a link into a 404', () => {
    const [item] = resolveNearbyTirthas(['thillai-kali-temple']);
    expect(item?.href).toBeUndefined();
    expect(item?.label).toBe('Thillai Kali Temple');
  });

  it('leaves an already-human label alone', () => {
    const [item] = resolveNearbyTirthas(['Konark Sun Temple (35 km)']);
    expect(item?.label).toBe('Konark Sun Temple (35 km)');
    expect(item?.href).toBeUndefined();
  });

  it('every href it produces resolves to a real, non-redirecting page', () => {
    const canonical = new Set(TIRTHAS.map((t) => t.slug));
    for (const t of TIRTHAS) {
      for (const item of resolveNearbyTirthas(t.nearbyTirthas)) {
        if (!item.href) continue;
        const slug = item.href.replace('/tirth/', '');
        expect(canonical.has(slug), `${t.slug} -> ${item.href}`).toBe(true);
      }
    }
  });

  it('the page renders those links instead of bullets of slugs', async () => {
    // alandi-jnaneshwar-samadhi stores five slug-style neighbours: three name
    // published tirthas (one of them through the alias table) and two do not.
    render(await TirthaPage({ params: Promise.resolve({ slug: 'alandi-jnaneshwar-samadhi' }) }));
    const heading = screen.getByRole('heading', { name: /Nearby tirthas/i });
    const items = [...heading.parentElement!.querySelectorAll('li')];
    expect(items).toHaveLength(5);
    for (const li of items) {
      expect(RAW_SLUG.test(li.textContent!.trim()), li.textContent!).toBe(false);
    }
    // Resolved through TIRTHA_ALIASES, so it points at the surviving URL.
    const linked = screen.getByRole('link', { name: 'Trimbakeshwar Jyotirlinga' });
    expect(linked.getAttribute('href')).toBe('/tirth/trimbakeshwar');
    // Unpublished neighbour: readable, but not a link into a 404.
    const orphan = items.find((li) => li.textContent === 'Dehu Tukaram Samadhi');
    expect(orphan).toBeDefined();
    expect(orphan!.querySelector('a')).toBeNull();
  });
});
