import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('../lib/puja-catalogue', () => ({ getCatalogueSlugs: async () => new Set<string>() }));

import { permanentRedirect, notFound } from 'next/navigation';
import FestivalPage, { generateStaticParams, generateMetadata } from '../app/festival/[slug]/page';
import { FESTIVAL_ALIASES } from '../lib/festivals';

beforeEach(() => {
  vi.mocked(permanentRedirect).mockClear();
  vi.mocked(notFound).mockClear();
});

describe('CI-03 — retired festival URLs redirect instead of 404ing', () => {
  it('still prerenders every retired slug', async () => {
    const slugs = (await generateStaticParams()).map((p) => p.slug);
    for (const alias of Object.keys(FESTIVAL_ALIASES)) {
      expect(slugs, alias).toContain(alias);
    }
  });

  it('redirects /festival/teej-hartalika to the surviving Hartalika Teej page', async () => {
    await expect(
      FestivalPage({ params: Promise.resolve({ slug: 'teej-hartalika' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/festival/hartalika-teej');
    expect(permanentRedirect).toHaveBeenCalledWith('/festival/hartalika-teej');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('a genuinely unknown slug still 404s', async () => {
    await expect(
      FestivalPage({ params: Promise.resolve({ slug: 'no-such-festival' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('CI-11 — a festival is never labelled with a year it does not fall in', () => {
  it('titles Maha Kumbh Mela with 2027, the year its own date sits in', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'maha-kumbh' }) });
    expect(String(meta.title)).toContain('2027');
    expect(String(meta.title)).not.toContain('2026');
  });

  it('still titles a genuine 2026 festival with 2026', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'diwali' }) });
    expect(String(meta.title)).toContain('2026');
  });
});
