import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CI-01 / CI-04 / CI-05 / CI-06 (delta completion sweep 2026-08-20).
 *
 * CI-01. `/aarti/<slug>` and `/chalisa/<slug>` render a "Book a related puja"
 * card grid straight off the editorial `relatedPujas` array with no catalogue
 * check whatsoever. Measured on this tree: 517 links are emitted across the
 * 155 pages (314 from lib/aartis.ts, 203 from lib/chalisas.ts) and exactly 15
 * of them name a slug the live catalogue actually sells - 502 dead links, at
 * the top of the acquisition funnel.
 *
 * DF-02 solved the identical problem for `/festival` and `/calendar` and the
 * fix was never wired here. This locks the same rule onto the two content
 * routes: a puja is linked only after the live catalogue confirms the slug,
 * and when nothing resolves the page routes to `/pujas` instead of guessing.
 *
 * CI-05. Both routes previously rendered NOTHING bookable when the editorial
 * list was empty or unresolvable, so most of the corpus offered no path to
 * commerce at all. Every page must now end at something bookable.
 *
 * CI-06. `deitySlug` is hand-written in the same two datasets and 24 of the
 * 131 references name a deity that has no `/deity/<slug>` page.
 *
 * CI-04. `/content/<slug>` synthesised a page for ANY slug - Hanuman
 * Chalisa's deity, its 12.5M view count and its 890k likes under the body
 * text "Content is loading" - and returned 200 forever.
 */

const WEB = path.resolve(__dirname, '..');

/**
 * The live catalogue, as recorded by DF-02 against Postgres `puja_types`
 * (darshya_utf8, 2026-08-13) and re-used verbatim from
 * __tests__/festival-booking-links.test.tsx so the two suites cannot drift.
 */
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

/**
 * Source-text guards must never match a COMMENT. A guard that reads the
 * comment documenting the fix passes on a file where the fix was reverted.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

vi.mock('../lib/puja-catalogue', () => ({
  getCatalogueSlugs: vi.fn(async () => LIVE_CATALOGUE),
  catalogueSlugsFromPayload: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// --- CI-01: the generator ---------------------------------------------------

describe('CI-01 lib/puja-link - a content page links a puja only after the catalogue confirms it', () => {
  it('drops a slug the catalogue does not sell', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['durga-puja', 'navaratri-puja'], LIVE_CATALOGUE)).toEqual([]);
  });

  it('reuses the festival alias table rather than keeping a second copy', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['satyanarayan-puja'], LIVE_CATALOGUE)).toEqual([
      'satyanarayan-katha',
    ]);
    expect(resolveContentPujas(['navgraha-puja'], LIVE_CATALOGUE)).toEqual([
      'navgraha-shanti-puja',
    ]);
    expect(resolveContentPujas(['sundarkand-path'], LIVE_CATALOGUE)).toEqual(['sunderkand-path']);
  });

  it('repairs the drift that only the aarti/chalisa corpus uses', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['sundara-kanda-parayana'], LIVE_CATALOGUE)).toEqual([
      'sunderkand-path',
    ]);
    expect(resolveContentPujas(['diwali-lakshmi-puja'], LIVE_CATALOGUE)).toEqual(['lakshmi-puja']);
    expect(resolveContentPujas(['ganesh-chaturthi-puja'], LIVE_CATALOGUE)).toEqual(['ganesh-puja']);
    expect(resolveContentPujas(['pitra-dosh-shanti'], LIVE_CATALOGUE)).toEqual([
      'pitru-dosh-nivaran-puja',
    ]);
  });

  it('dedupes when two editorial spellings collapse onto one real puja', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(
      resolveContentPujas(['sundarkand-path', 'sundara-kanda-parayana'], LIVE_CATALOGUE),
    ).toEqual(['sunderkand-path']);
  });

  it('returns nothing at all when the catalogue could not be read', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    expect(resolveContentPujas(['rudrabhishek'], new Set<string>())).toEqual([]);
  });

  it('every link the whole aarti + chalisa corpus can now produce is bookable', async () => {
    const { resolveContentPujas } = await import('../lib/puja-link');
    const { AARTIS } = await import('../lib/aartis');
    const { CHALISAS } = await import('../lib/chalisas');
    const corpus = [...AARTIS, ...CHALISAS];
    expect(corpus.length).toBe(155);

    let emitted = 0;
    for (const entry of corpus) {
      for (const slug of resolveContentPujas(entry.relatedPujas, LIVE_CATALOGUE)) {
        expect(LIVE_CATALOGUE.has(slug)).toBe(true);
        emitted += 1;
      }
    }
    // 15 of the 517 raw links resolved before this existed; the alias table
    // must recover materially more than that, not merely delete the other 502.
    expect(emitted).toBeGreaterThan(40);
  });

  it('the raw editorial arrays are still overwhelmingly unbookable - the gate is load-bearing', async () => {
    const { AARTIS } = await import('../lib/aartis');
    const { CHALISAS } = await import('../lib/chalisas');
    const raw = [...AARTIS, ...CHALISAS].flatMap((e) => e.relatedPujas);
    expect(raw.length).toBe(517);
    expect(raw.filter((s) => LIVE_CATALOGUE.has(s)).length).toBe(15);
  });
});

// --- CI-01 + CI-05: the two routes ------------------------------------------

describe('CI-01 the /aarti detail page never emits an unverified /pujas link', () => {
  it('renders only catalogue-confirmed pujas when some resolve', async () => {
    const { default: AartiPage } = await import('../app/aarti/[slug]/page');
    render(await AartiPage({ params: Promise.resolve({ slug: 'om-jai-jagdish-hare' }) }));
    const hrefs = Array.from(document.querySelectorAll('a[href^="/pujas/"]')).map((a) =>
      (a.getAttribute('href') ?? '').replace('/pujas/', ''),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const slug of hrefs) expect(LIVE_CATALOGUE.has(slug)).toBe(true);
  });

  it('emits zero puja links and a /pujas fallback when nothing resolves', async () => {
    const { default: AartiPage } = await import('../app/aarti/[slug]/page');
    render(await AartiPage({ params: Promise.resolve({ slug: 'durga-aarti' }) }));
    expect(document.querySelectorAll('a[href^="/pujas/"]').length).toBe(0);
    expect(screen.getByRole('link', { name: /browse all pujas/i })).toHaveAttribute(
      'href',
      '/pujas',
    );
  });

  it('emits zero puja links when the catalogue is unreadable', async () => {
    const cat = await import('../lib/puja-catalogue');
    vi.mocked(cat.getCatalogueSlugs).mockResolvedValueOnce(new Set<string>());
    const { default: AartiPage } = await import('../app/aarti/[slug]/page');
    render(await AartiPage({ params: Promise.resolve({ slug: 'om-jai-jagdish-hare' }) }));
    expect(document.querySelectorAll('a[href^="/pujas/"]').length).toBe(0);
  });
});

describe('CI-01 the /chalisa detail page never emits an unverified /pujas link', () => {
  it('renders only catalogue-confirmed pujas when some resolve', async () => {
    const { default: ChalisaPage } = await import('../app/chalisa/[slug]/page');
    render(await ChalisaPage({ params: Promise.resolve({ slug: 'hanuman-chalisa' }) }));
    const hrefs = Array.from(document.querySelectorAll('a[href^="/pujas/"]')).map((a) =>
      (a.getAttribute('href') ?? '').replace('/pujas/', ''),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const slug of hrefs) expect(LIVE_CATALOGUE.has(slug)).toBe(true);
  });

  it('emits zero puja links and a /pujas fallback when nothing resolves', async () => {
    const { default: ChalisaPage } = await import('../app/chalisa/[slug]/page');
    render(await ChalisaPage({ params: Promise.resolve({ slug: 'durga-chalisa' }) }));
    expect(document.querySelectorAll('a[href^="/pujas/"]').length).toBe(0);
    expect(screen.getByRole('link', { name: /browse all pujas/i })).toHaveAttribute(
      'href',
      '/pujas',
    );
  });
});

describe('CI-01 neither route maps the editorial array straight into a link', () => {
  it('the aarti page routes through the resolver', () => {
    const src = stripComments(code('app/aarti/[slug]/page.tsx'));
    expect(src).not.toMatch(/a\.relatedPujas\.map\(/);
    expect(src).toMatch(/resolveContentPujas/);
    expect(src).toMatch(/getCatalogueSlugs/);
  });

  it('the chalisa page routes through the resolver', () => {
    const src = stripComments(code('app/chalisa/[slug]/page.tsx'));
    expect(src).not.toMatch(/c\.relatedPujas\.map\(/);
    expect(src).toMatch(/resolveContentPujas/);
    expect(src).toMatch(/getCatalogueSlugs/);
  });
});

// --- CI-05: every content page ends somewhere bookable ----------------------

describe('CI-05 every aarti and chalisa page offers a path to something bookable', () => {
  it('the aarti index links the catalogue', () => {
    expect(stripComments(code('app/aarti/page.tsx'))).toMatch(/href="\/pujas"/);
  });

  it('the chalisa index links the catalogue', () => {
    expect(stripComments(code('app/chalisa/page.tsx'))).toMatch(/href="\/pujas"/);
  });

  it('an aarti with no resolvable puja still shows a booking CTA', async () => {
    const { default: AartiPage } = await import('../app/aarti/[slug]/page');
    render(await AartiPage({ params: Promise.resolve({ slug: 'shitala-mata-aarti' }) }));
    expect(screen.getByRole('link', { name: /browse all pujas/i })).toBeInTheDocument();
  });

  it('a chalisa with no resolvable puja still shows a booking CTA', async () => {
    const { default: ChalisaPage } = await import('../app/chalisa/[slug]/page');
    render(await ChalisaPage({ params: Promise.resolve({ slug: 'tara-chalisa' }) }));
    expect(screen.getByRole('link', { name: /browse all pujas/i })).toBeInTheDocument();
  });
});

// --- CI-06: deity cross-links -----------------------------------------------

describe('CI-06 lib/content-deity-link - no /deity link is emitted for a deity with no page', () => {
  it('resolves a real deity', async () => {
    const { deityHref } = await import('../lib/content-deity-link');
    expect(deityHref('hanuman')).toBe('/deity/hanuman');
  });

  it('repairs the transliteration drift onto the deity that does have a page', async () => {
    const { deityHref } = await import('../lib/content-deity-link');
    expect(deityHref('venkateswara')).toBe('/deity/venkateshwara');
    expect(deityHref('bhairav')).toBe('/deity/bhairava');
    expect(deityHref('kuber')).toBe('/deity/kubera');
    expect(deityHref('mahalakshmi')).toBe('/deity/mahalakshmi-ashtalakshmi');
  });

  it('returns null rather than a 404 for a deity with no page', async () => {
    const { deityHref } = await import('../lib/content-deity-link');
    expect(deityHref('vindhyavasini')).toBeNull();
    expect(deityHref('tara')).toBeNull();
    expect(deityHref(undefined)).toBeNull();
  });

  it('never points at a slug that is not in DEITIES', async () => {
    const { deityHref } = await import('../lib/content-deity-link');
    const { DEITIES } = await import('../lib/deities');
    const known = new Set(DEITIES.map((d) => d.slug));
    const { AARTIS } = await import('../lib/aartis');
    const { CHALISAS } = await import('../lib/chalisas');
    let resolved = 0;
    for (const e of [...AARTIS, ...CHALISAS]) {
      const href = deityHref(e.deitySlug);
      if (href === null) continue;
      resolved += 1;
      expect(known.has(href.replace('/deity/', ''))).toBe(true);
    }
    // 107 of the 131 references already pointed at a real deity; the alias
    // table must recover more of the remaining 24, not just delete them.
    expect(resolved).toBeGreaterThan(110);
  });

  it('the aarti page does not link a deity that has no page', async () => {
    const { default: AartiPage } = await import('../app/aarti/[slug]/page');
    render(await AartiPage({ params: Promise.resolve({ slug: 'shitala-mata-aarti' }) }));
    expect(document.querySelectorAll('a[href^="/deity/"]').length).toBe(0);
  });

  it('the chalisa page repairs a drifted deity slug instead of 404ing', async () => {
    const { default: ChalisaPage } = await import('../app/chalisa/[slug]/page');
    render(await ChalisaPage({ params: Promise.resolve({ slug: 'bhairav-chalisa' }) }));
    const hrefs = Array.from(document.querySelectorAll('a[href^="/deity/"]')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('/deity/bhairava');
  });

  it('/deity/[slug] serves the alias slugs and 308s them onto the canonical page', async () => {
    const permanentRedirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });
    vi.doMock('next/navigation', () => ({ notFound: vi.fn(), permanentRedirect }));
    const mod = await import('../app/deity/[slug]/page');

    // dynamicParams is false on this route, so a slug absent from
    // generateStaticParams is a hard 404 the page code never sees.
    const params = (await mod.generateStaticParams()).map((p) => p.slug);
    expect(params).toContain('murugan');
    expect(params).toContain('venkateswara');

    await expect(
      mod.default({ params: Promise.resolve({ slug: 'murugan' }) }),
    ).rejects.toThrow('REDIRECT:/deity/kartikeya');
    expect(permanentRedirect).toHaveBeenCalledWith('/deity/kartikeya');
    vi.doUnmock('next/navigation');
  });

  it('murugan — used by lib/festivals.ts and lib/cities.ts — resolves', async () => {
    const { deityHref } = await import('../lib/content-deity-link');
    expect(deityHref('murugan')).toBe('/deity/kartikeya');
  });

  it('no alias key collides with a real deity slug', async () => {
    const { CONTENT_DEITY_SLUG_ALIASES } = await import('../lib/content-deity-link');
    const { DEITIES } = await import('../lib/deities');
    const known = new Set(DEITIES.map((d) => d.slug));
    for (const key of Object.keys(CONTENT_DEITY_SLUG_ALIASES)) {
      expect(known.has(key), `${key} is a real deity and must not be aliased away`).toBe(false);
    }
    // and every target must exist, or the alias 308s onto a 404
    for (const target of Object.values(CONTENT_DEITY_SLUG_ALIASES)) {
      expect(known.has(target), `${target} has no page`).toBe(true);
    }
  });

  it('neither route interpolates deitySlug into a href directly', () => {
    expect(stripComments(code('app/aarti/[slug]/page.tsx'))).not.toMatch(
      /\/deity\/\$\{a\.deitySlug\}/,
    );
    expect(stripComments(code('app/chalisa/[slug]/page.tsx'))).not.toMatch(
      /\/deity\/\$\{c\.deitySlug\}/,
    );
  });
});

// --- CI-04: the soft-404 farm -----------------------------------------------

describe('CI-04 lib/content-detail - an unknown content slug is not invented', () => {
  it('reports not-found when the API says 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    const { lookupContent } = await import('../lib/content-detail');
    expect((await lookupContent('this-page-does-not-exist')).status).toBe('not-found');
  });

  it('reports unavailable when the API cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const { lookupContent } = await import('../lib/content-detail');
    expect((await lookupContent('hanuman-chalisa')).status).toBe('unavailable');
  });

  it('reports unavailable - never not-found - on a 5xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    const { lookupContent } = await import('../lib/content-detail');
    expect((await lookupContent('hanuman-chalisa')).status).toBe('unavailable');
  });

  it('returns the real row when there is one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ content: { id: 'c1', slug: 'gayatri-mantra', title: 'Gayatri' } }),
      })),
    );
    const { lookupContent } = await import('../lib/content-detail');
    const res = await lookupContent('gayatri-mantra');
    expect(res.status).toBe('found');
    expect(res.status === 'found' && res.item.slug).toBe('gayatri-mantra');
  });
});

describe('CI-04 /content/[slug] 404s a slug with no row behind it', () => {
  it('calls notFound() instead of synthesising a page', async () => {
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    vi.doMock('next/navigation', () => ({ notFound, redirect: vi.fn() }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    const { default: ContentPage } = await import('../app/content/[slug]/page');
    await expect(
      ContentPage({ params: Promise.resolve({ slug: 'this-page-does-not-exist' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    vi.doUnmock('next/navigation');
  });

  it('its metadata is noindex for a slug it could not resolve', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const mod = await import('../app/content/[slug]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'this-page-does-not-exist' }),
    });
    expect(meta.robots).toMatchObject({ index: false });
  });

  it('no longer spreads the Hanuman Chalisa fallback over an unknown slug', () => {
    const src = stripComments(code('app/content/[slug]/page.tsx'));
    expect(src).not.toMatch(/\.\.\.fallbackContent,\s*slug,/);
    expect(src).not.toMatch(/Content is loading/);
    expect(src).toMatch(/lookupContent/);
    expect(src).toMatch(/notFound\(\)/);
  });
});
