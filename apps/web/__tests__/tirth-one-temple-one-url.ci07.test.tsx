import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { permanentRedirect } from 'next/navigation';
import { TIRTHAS, tirthaSlugs } from '../lib/tirthas';
import { TIRTHA_ALIASES, canonicalTirthaSlug, dedupeTirthas } from '../lib/tirtha-slug';
import TirthIndexPage, { metadata as indexMetadata } from '../app/tirth/page';
import TirthaPage, {
  generateStaticParams,
  generateMetadata,
} from '../app/tirth/[slug]/page';

beforeEach(() => {
  vi.mocked(permanentRedirect).mockClear();
});

// CI-07 — /tirth published the same temple at two slugs twelve times over:
// somnath + somnath-jyotirlinga, kedarnath + kedarnath-jyotirlinga,
// kalighat-kolkata + kalighat-kali-temple (identical `name`), and so on. Each
// URL declared ITSELF canonical, so the pair competed in the index and split
// the internal link equity.

describe('CI-07 — one temple, one /tirth URL', () => {
  it('the raw catalogue really does carry duplicate temples', () => {
    // Premise guard: if someone deletes the duplicate records outright this
    // says so, instead of the alias map quietly becoming a no-op.
    const canon = TIRTHAS.map((t) => canonicalTirthaSlug(t.slug));
    expect(new Set(canon).size).toBeLessThan(TIRTHAS.length);
  });

  it('every alias resolves to a real, non-alias tirtha', () => {
    const slugs = new Set(TIRTHAS.map((t) => t.slug));
    for (const [from, to] of Object.entries(TIRTHA_ALIASES)) {
      expect(slugs.has(from), `alias ${from} names no record`).toBe(true);
      expect(slugs.has(to), `${from} -> ${to} points at nothing`).toBe(true);
      expect(TIRTHA_ALIASES[to], `${to} is itself an alias`).toBeUndefined();
    }
  });

  it('leaves an unknown slug untouched', () => {
    expect(canonicalTirthaSlug('not-a-tirtha')).toBe('not-a-tirtha');
  });

  it('dedupeTirthas keeps exactly one record per temple', () => {
    const kept = dedupeTirthas(TIRTHAS);
    const canon = kept.map((t) => canonicalTirthaSlug(t.slug));
    expect(new Set(canon).size).toBe(kept.length);
    expect(kept.length).toBe(TIRTHAS.length - Object.keys(TIRTHA_ALIASES).length);
    for (const alias of Object.keys(TIRTHA_ALIASES)) {
      expect(kept.map((t) => t.slug), alias).not.toContain(alias);
    }
  });

  it('the index grid links one card per temple', () => {
    render(<TirthIndexPage />);
    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/tirth/'));
    expect(hrefs.length).toBeGreaterThan(50);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const alias of Object.keys(TIRTHA_ALIASES)) {
      expect(hrefs, alias).not.toContain(`/tirth/${alias}`);
    }
  });

  it('the index no longer announces 12 destinations above a grid of eighty-odd', () => {
    const shown = dedupeTirthas(TIRTHAS).length;
    render(<TirthIndexPage />);
    expect(document.body.textContent).not.toMatch(/\b12 destinations\b/);
    expect(document.body.textContent).toContain(String(shown));
    expect(String(indexMetadata.title)).not.toMatch(/^12 Most Sacred Tirthas/);
    // The circuits cross-link counted 8 ("and 6 more") while /pilgrimage has 18.
    expect(document.body.textContent).not.toMatch(/and 6 more circuits/);
  });

  it('every tirtha in the catalogue reaches the index grid', () => {
    render(<TirthIndexPage />);
    const hrefs = new Set(
      screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? ''),
    );
    for (const t of dedupeTirthas(TIRTHAS)) {
      expect(hrefs, `${t.slug} (${t.category}) is orphaned`).toContain(`/tirth/${t.slug}`);
    }
  });

  it('a duplicate URL permanently redirects to the surviving temple page', async () => {
    await expect(
      TirthaPage({ params: Promise.resolve({ slug: 'somnath-jyotirlinga' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/tirth/somnath');
  });

  it('still prerenders the retired URLs so they redirect rather than 404', async () => {
    const slugs = generateStaticParams().map((p) => p.slug);
    for (const alias of Object.keys(TIRTHA_ALIASES)) {
      expect(slugs, alias).toContain(alias);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(TIRTHAS.length);
  });

  it('the sitemap feed advertises only URLs that serve a page', () => {
    // app/sitemap.ts builds its tirtha section from tirthaSlugs().
    const advertised = tirthaSlugs();
    for (const alias of Object.keys(TIRTHA_ALIASES)) {
      expect(advertised, `${alias} redirects; the sitemap must not list it`).not.toContain(alias);
    }
    expect(advertised).toHaveLength(dedupeTirthas(TIRTHAS).length);
  });

  it('a duplicate URL declares the survivor canonical, not itself', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'kedarnath-jyotirlinga' }),
    });
    expect(meta.alternates?.canonical).toBe('https://darshya.online/tirth/kedarnath');
  });
});
