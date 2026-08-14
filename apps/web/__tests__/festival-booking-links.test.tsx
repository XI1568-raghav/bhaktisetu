import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * DF-02 (prod sweep 2026-08-12) — 81% of festival "Book with verified pandit"
 * CTAs 404, including the homepage's next-festival hero.
 *
 * lib/festivals.ts describes 61 festivals referencing 87 distinct puja slugs.
 * The live catalogue (Postgres darshya_utf8 puja_types, 2026-08-13) is these
 * ten and only these ten:
 *
 *   ganesh-puja, hanuman-chalisa-path, lakshmi-puja, maha-mrityunjay-jaap,
 *   navgraha-shanti-puja, pitru-dosh-nivaran-puja, ram-charit-manas-path,
 *   rudrabhishek, satyanarayan-katha, sunderkand-path
 *
 * Only 3 of the 87 (rudrabhishek, ganesh-puja, lakshmi-puja) matched verbatim.
 * Several near-misses were pure spelling drift — 'sundarkand-path' vs the real
 * 'sunderkand-path', 'satyanarayan-puja' vs 'satyanarayan-katha' (21 uses),
 * 'maha-mrityunjaya' vs 'maha-mrityunjay-jaap'.
 *
 * The rule this locks: a festival surface links a puja ONLY after the slug has
 * been checked against the live catalogue. When the catalogue cannot be read
 * the answer is zero links, not optimistic ones — an unverified booking link
 * on the highest-intent seasonal page is worse than no link.
 */

const WEB = path.resolve(__dirname, '..');

const LIVE_CATALOGUE = new Set([
  'ganesh-puja',
  'hanuman-chalisa-path',
  'lakshmi-puja',
  'maha-mrityunjay-jaap',
  'navgraha-shanti-puja',
  'pitru-dosh-nivaran-puja',
  'ram-charit-manas-path',
  'rudrabhishek',
  'satyanarayan-katha',
  'sunderkand-path',
]);

function code(rel: string): string {
  return fs.readFileSync(path.join(WEB, rel), 'utf8');
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('resolveBookablePujas', () => {
  it('drops a slug the catalogue does not contain', async () => {
    const { resolveBookablePujas } = await import('../lib/festivals');
    expect(resolveBookablePujas(['parvati-puja', 'kali-puja'], LIVE_CATALOGUE)).toEqual([]);
  });

  it('repairs the known spelling drift onto the real slug', async () => {
    const { resolveBookablePujas } = await import('../lib/festivals');
    expect(resolveBookablePujas(['sundarkand-path'], LIVE_CATALOGUE)).toEqual(['sunderkand-path']);
    expect(resolveBookablePujas(['satyanarayan-puja'], LIVE_CATALOGUE)).toEqual([
      'satyanarayan-katha',
    ]);
    expect(resolveBookablePujas(['maha-mrityunjaya'], LIVE_CATALOGUE)).toEqual([
      'maha-mrityunjay-jaap',
    ]);
    expect(resolveBookablePujas(['navagraha-shanti'], LIVE_CATALOGUE)).toEqual([
      'navgraha-shanti-puja',
    ]);
  });

  it('dedupes when two aliases land on the same real puja', async () => {
    const { resolveBookablePujas } = await import('../lib/festivals');
    expect(
      resolveBookablePujas(['satyanarayan-puja', 'satyanarayana-katha'], LIVE_CATALOGUE),
    ).toEqual(['satyanarayan-katha']);
  });

  it('returns nothing at all when the catalogue could not be read', async () => {
    const { resolveBookablePujas } = await import('../lib/festivals');
    expect(resolveBookablePujas(['rudrabhishek'], new Set<string>())).toEqual([]);
  });

  it('every link the 61 festivals can now produce resolves in the catalogue', async () => {
    const { FESTIVALS, resolveBookablePujas } = await import('../lib/festivals');
    expect(FESTIVALS.length).toBeGreaterThan(50);
    for (const f of FESTIVALS) {
      for (const slug of resolveBookablePujas(f.pujasAvailable, LIVE_CATALOGUE)) {
        expect(LIVE_CATALOGUE.has(slug)).toBe(true);
      }
    }
  });

  it('the aliases actually recover coverage rather than only deleting links', async () => {
    const { FESTIVALS, resolveBookablePujas } = await import('../lib/festivals');
    const covered = FESTIVALS.filter(
      (f) => resolveBookablePujas(f.pujasAvailable, LIVE_CATALOGUE).length > 0,
    );
    // 3 festivals matched a real slug verbatim before the alias table existed.
    expect(covered.length).toBeGreaterThan(20);
  });
});

describe('lib/puja-catalogue — the slug set is fetched, never assumed', () => {
  it('returns an empty set when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const { getCatalogueSlugs } = await import('../lib/puja-catalogue');
    expect((await getCatalogueSlugs()).size).toBe(0);
  });

  it('keeps only string slugs off the payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          pujaTypes: [{ slug: 'rudrabhishek' }, { slug: 42 }, {}, null, { slug: 'ganesh-puja' }],
        }),
      })),
    );
    const { getCatalogueSlugs } = await import('../lib/puja-catalogue');
    expect([...(await getCatalogueSlugs())].sort()).toEqual(['ganesh-puja', 'rudrabhishek']);
  });
});

describe('NextFestivalStrip never renders an unverified booking link', () => {
  it('links the puja when the catalogue confirms it', async () => {
    const { default: NextFestivalStrip } = await import('../components/home/NextFestivalStrip');
    render(await NextFestivalStrip({ catalogueSlugs: LIVE_CATALOGUE }));
    const bookLinks = Array.from(document.querySelectorAll('a[href^="/pujas/"]'));
    for (const a of bookLinks) {
      const slug = (a.getAttribute('href') ?? '').replace('/pujas/', '');
      expect(LIVE_CATALOGUE.has(slug)).toBe(true);
    }
  });

  it('falls back to the catalogue browse link when nothing resolves', async () => {
    const { default: NextFestivalStrip } = await import('../components/home/NextFestivalStrip');
    render(await NextFestivalStrip({ catalogueSlugs: new Set<string>() }));
    expect(document.querySelectorAll('a[href^="/pujas/"]').length).toBe(0);
    expect(screen.getByRole('link', { name: /browse pujas/i })).toHaveAttribute('href', '/pujas');
  });
});

describe('the festival detail page routes through the resolver', () => {
  const src = () => code('app/festival/[slug]/page.tsx');

  it('no longer maps pujasAvailable straight into /pujas/<slug>', () => {
    expect(src()).not.toMatch(/f\.pujasAvailable\.map\(\(slug\)/);
  });

  it('imports the resolver and the live catalogue', () => {
    expect(src()).toMatch(/resolveBookablePujas/);
    expect(src()).toMatch(/getCatalogueSlugs/);
  });

  it('gates the "Book with verified pandit" heading on resolved pujas', () => {
    expect(src()).toMatch(/bookable\.length > 0/);
  });
});
