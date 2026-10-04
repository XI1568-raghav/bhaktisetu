/**
 * DB-04 / PF-02 (prod sweep 2026-08-12) — five dead controls on the browse page.
 *
 * The sweep drove every option of every dropdown (9 category, 11 deity, 10
 * occasion, 6 price = 36 selections) and the rendered card list was identical
 * after each one — always the same ten slugs in the same order, always
 * "Showing 10 of 10 pujas", URL unchanged, no request, no console error.
 * Selecting "Under ₹500" still listed the ₹3,501 Ram Charit Manas Path.
 * The "Sort: Popularity" button had no onClick and no href.
 *
 * The fixtures below are the real catalogue rows the sweep saw, so the
 * assertions are about the actual data a devotee is filtering.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  applyPujaCatalogue,
  filterPujas,
  hasActivePujaFilters,
  matchesPrice,
  parsePujaFilters,
  pujaCatalogueHref,
  sortPujas,
  DEFAULT_PUJA_SORT,
  EMPTY_PUJA_FILTERS,
  buildPujaFacets,
  facetToken,
  PUJA_PRICE_OPTIONS,
  PUJA_SORT_OPTIONS,
  type FilterablePuja,
} from '../lib/puja-catalogue-filters';

const pujaPageSrc = readFileSync(
  path.resolve(__dirname, '..', 'app/pujas/(index)/page.tsx'),
  'utf8',
);

/** Comments explain what was removed and so quote the removed markup. Only what
 *  the page actually renders is under test. */
const pujaPage = pujaPageSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*/g, '$1');

const card = (
  slug: string,
  name: string,
  category: string,
  deity: string,
  price: number,
): FilterablePuja => ({
  slug,
  name,
  category,
  deity,
  price,
  temple: 'Multiple temples',
  description: `${name} performed by verified pandits.`,
});

/** The catalogue as captured on /pujas. */
const CATALOGUE: FilterablePuja[] = [
  card('rudrabhishek', 'Rudrabhishek', 'Abhishekam', 'Lord Shiva', 1100),
  card('ganesh-puja', 'Ganesh Puja', 'Shanti Puja', 'Lord Ganesha', 751),
  card('satyanarayan-katha', 'Satyanarayan Katha', 'Path / Paath', 'Lord Vishnu', 2100),
  card('maha-mrityunjay-jaap', 'Maha Mrityunjay Jaap', 'Jaap', 'Lord Shiva', 5100),
  card('lakshmi-puja', 'Lakshmi Puja', 'Shanti Puja', 'Goddess Lakshmi', 1500),
  card('navgraha-shanti-puja', 'Navgraha Shanti Puja', 'Dosh Nivaran', 'Navagraha', 3100),
  card('sunderkand-path', 'Sunderkand Path', 'Path / Paath', 'Lord Hanuman', 1251),
  card('hanuman-chalisa-path', 'Hanuman Chalisa Path', 'Path / Paath', 'Lord Hanuman', 451),
  card('ram-charit-manas-path', 'Ram Charit Manas Path', 'Path / Paath', 'Lord Rama', 3501),
];

const slugs = (list: FilterablePuja[]) => list.map((p) => p.slug);

/** Options as the page derives them, from the catalogue it is about to render. */
const FACETS = buildPujaFacets(CATALOGUE);

/**
 * The REAL shapes GET /pujas/types answers with (read from the running API,
 * 2026-08-13). None of them resembles the hard-coded labels the dead control
 * offered, which is why the options are derived rather than listed.
 */
const LIVE_SHAPED: FilterablePuja[] = [
  card('rudrabhishek', 'Rudrabhishek', 'planetary', 'Lord Shiva', 1100),
  card('satyanarayan-katha', 'Satyanarayan Katha', 'special_occasion', 'Lord Vishnu (Satyanarayan)', 2100),
  card('maha-mrityunjay-jaap', 'Maha Mrityunjay Jaap', 'health', 'Lord Shiva (Tryambaka)', 5100),
  card('navgraha-shanti-puja', 'Navgraha Shanti Puja', 'planetary', 'Navagraha (Nine Planets)', 3100),
  card('pitra-dosh-nivaran', 'Pitra Dosh Nivaran', 'memorial', 'Pitru Devata (Ancestors)', 2500),
];

describe('DB-04 — the price filter actually excludes out-of-band pujas', () => {
  it('"Under ₹500" returns only the sub-₹500 puja, not the ₹3,501 one', () => {
    const filters = parsePujaFilters({ price: 'under-500' }, FACETS);
    const out = filterPujas(CATALOGUE, filters);
    expect(slugs(out)).toEqual(['hanuman-chalisa-path']);
    expect(slugs(out)).not.toContain('ram-charit-manas-path');
  });

  it('"Above ₹5,000" returns only the ₹5,100 jaap', () => {
    const out = filterPujas(CATALOGUE, parsePujaFilters({ price: 'above-5000' }, FACETS));
    expect(slugs(out)).toEqual(['maha-mrityunjay-jaap']);
  });

  it('bands tile without overlap — a ₹1,000 puja lands in exactly one', () => {
    const bands = PUJA_PRICE_OPTIONS.filter((o) => o.value !== '');
    const hits = bands.filter((b) => matchesPrice(1000, b.value));
    expect(hits.map((b) => b.value)).toEqual(['1000-2500']);
  });

  it('every non-empty band matches at least one real catalogue row', () => {
    for (const band of PUJA_PRICE_OPTIONS.filter((o) => o.value !== '')) {
      const out = filterPujas(CATALOGUE, parsePujaFilters({ price: band.value }, FACETS));
      expect(out.length, `no puja matches "${band.label}"`).toBeGreaterThan(0);
    }
  });
});

describe('DB-04 — category and deity filters narrow the list', () => {
  it('Category=Abhishekam returns only Rudrabhishek', () => {
    const out = filterPujas(CATALOGUE, parsePujaFilters({ category: 'abhishekam' }, FACETS));
    expect(slugs(out)).toEqual(['rudrabhishek']);
  });

  it('Deity=Lord Hanuman returns both Hanuman pujas', () => {
    const out = filterPujas(CATALOGUE, parsePujaFilters({ deity: 'lord-hanuman' }, FACETS));
    expect(slugs(out).sort()).toEqual(['hanuman-chalisa-path', 'sunderkand-path']);
  });

  it('the sweep\'s exact query — Hanuman under ₹500 — returns the ₹451 path', () => {
    const out = filterPujas(
      CATALOGUE,
      parsePujaFilters({ deity: 'lord-hanuman', price: 'under-500' }, FACETS),
    );
    expect(slugs(out)).toEqual(['hanuman-chalisa-path']);
  });

  it('EVERY offered option returns at least one puja — no dead options, ever', () => {
    for (const opt of FACETS.categories.filter((o) => o.value !== '')) {
      const out = filterPujas(CATALOGUE, parsePujaFilters({ category: opt.value }, FACETS));
      expect(out.length, `category "${opt.label}" returns nothing`).toBeGreaterThan(0);
    }
    for (const opt of FACETS.deities.filter((o) => o.value !== '')) {
      const out = filterPujas(CATALOGUE, parsePujaFilters({ deity: opt.value }, FACETS));
      expect(out.length, `deity "${opt.label}" returns nothing`).toBeGreaterThan(0);
    }
  });

  it('deity tokens round-trip — "Goddess Lakshmi" is reachable', () => {
    const opt = FACETS.deities.find((o) => o.label === 'Goddess Lakshmi');
    expect(opt).toBeDefined();
    const out = filterPujas(CATALOGUE, parsePujaFilters({ deity: opt!.value }, FACETS));
    expect(slugs(out)).toEqual(['lakshmi-puja']);
  });
});

describe('DB-04 — the options come from the data, not from a wish list', () => {
  const live = buildPujaFacets(LIVE_SHAPED);

  it('offers the categories the API actually returns, humanised', () => {
    expect(live.categories.map((o) => o.value)).toEqual([
      '',
      'planetary',
      'health',
      'memorial',
      'special-occasion',
    ]);
    expect(live.categories.find((o) => o.value === 'special-occasion')!.label).toBe(
      'Special Occasion',
    );
  });

  it('keeps a parenthesised deity reachable — "Lord Vishnu (Satyanarayan)"', () => {
    const opt = live.deities.find((o) => o.label === 'Lord Vishnu (Satyanarayan)');
    expect(opt).toBeDefined();
    expect(opt!.value).toBe('lord-vishnu-satyanarayan');
    const out = filterPujas(LIVE_SHAPED, parsePujaFilters({ deity: opt!.value }, live));
    expect(slugs(out)).toEqual(['satyanarayan-katha']);
  });

  it('never emits an option no puja can satisfy', () => {
    for (const opt of [...live.categories, ...live.deities].filter((o) => o.value !== '')) {
      const asCategory = filterPujas(LIVE_SHAPED, { ...EMPTY_PUJA_FILTERS, category: opt.value });
      const asDeity = filterPujas(LIVE_SHAPED, { ...EMPTY_PUJA_FILTERS, deity: opt.value });
      expect(
        asCategory.length + asDeity.length,
        `option "${opt.label}" (${opt.value}) matches nothing`,
      ).toBeGreaterThan(0);
    }
  });

  it('the token a card is matched by is the token the option carries', () => {
    for (const p of LIVE_SHAPED) {
      expect(live.categories.some((o) => o.value === facetToken(p.category))).toBe(true);
      expect(live.deities.some((o) => o.value === facetToken(p.deity))).toBe(true);
    }
  });

  it('an empty catalogue offers only the "All" entries — never a stale list', () => {
    const none = buildPujaFacets([]);
    expect(none.categories).toEqual([{ value: '', label: 'All Categories' }]);
    expect(none.deities).toEqual([{ value: '', label: 'All Deities' }]);
  });
});

describe('DB-04 — an unrecognised facet degrades to the full catalogue, not a blank grid', () => {
  it('a junk price token is ignored', () => {
    const filters = parsePujaFilters({ price: 'under-1-rupee' }, FACETS);
    expect(filters.price).toBe('');
    expect(filterPujas(CATALOGUE, filters)).toHaveLength(CATALOGUE.length);
  });

  it('a junk sort token falls back to the default', () => {
    expect(parsePujaFilters({ sort: 'random' }, FACETS).sort).toBe(DEFAULT_PUJA_SORT);
  });

  it('no params at all is the untouched catalogue in catalogue order', () => {
    const filters = parsePujaFilters({}, FACETS);
    expect(filters).toEqual(EMPTY_PUJA_FILTERS);
    expect(slugs(applyPujaCatalogue(CATALOGUE, filters, {}))).toEqual(slugs(CATALOGUE));
  });
});

describe('DB-04 — Sort is a real control', () => {
  it('price ascending puts the ₹451 path first and the ₹5,100 jaap last', () => {
    const out = sortPujas(CATALOGUE, 'price-asc');
    expect(out[0]!.slug).toBe('hanuman-chalisa-path');
    expect(out[out.length - 1]!.slug).toBe('maha-mrityunjay-jaap');
  });

  it('price descending is the exact reverse of ascending', () => {
    expect(slugs(sortPujas(CATALOGUE, 'price-desc'))).toEqual(
      slugs(sortPujas(CATALOGUE, 'price-asc')).reverse(),
    );
  });

  it('popularity ranks on REAL completed-booking counts, not a fabricated score', () => {
    // lib/social-proof: rudrabhishek 13 completions, everything else absent.
    const out = sortPujas(CATALOGUE, 'popularity', { rudrabhishek: 13, 'lakshmi-puja': 4 });
    expect(slugs(out).slice(0, 2)).toEqual(['rudrabhishek', 'lakshmi-puja']);
  });

  it('with no completion data popularity leaves catalogue order alone', () => {
    expect(slugs(sortPujas(CATALOGUE, 'popularity', {}))).toEqual(slugs(CATALOGUE));
  });

  it('sorting never adds or drops a row', () => {
    for (const opt of PUJA_SORT_OPTIONS) {
      expect(sortPujas(CATALOGUE, opt.value, {})).toHaveLength(CATALOGUE.length);
    }
  });
});

describe('DB-04 — every filtered view is a shareable URL', () => {
  it('builds a URL carrying the active facets', () => {
    const filters = parsePujaFilters({ deity: 'lord-hanuman', price: 'under-500' }, FACETS);
    expect(pujaCatalogueHref(filters)).toBe('/pujas?deity=lord-hanuman&price=under-500');
  });

  it('omits the default sort but keeps a chosen one', () => {
    expect(pujaCatalogueHref(EMPTY_PUJA_FILTERS)).toBe('/pujas');
    expect(pujaCatalogueHref(EMPTY_PUJA_FILTERS, { sort: 'price-asc' })).toBe(
      '/pujas?sort=price-asc',
    );
  });

  it('"Load more" keeps the facets — the pager must not silently unfilter', () => {
    const filters = parsePujaFilters({ q: 'hanuman', category: 'path-paath' }, FACETS);
    const href = pujaCatalogueHref(filters, { page: 2 });
    expect(href).toContain('q=hanuman');
    expect(href).toContain('category=path-paath');
    expect(href).toContain('page=2');
  });

  it('hasActivePujaFilters drives the Clear control', () => {
    expect(hasActivePujaFilters(EMPTY_PUJA_FILTERS)).toBe(false);
    expect(hasActivePujaFilters(parsePujaFilters({ sort: 'price-asc' }, FACETS))).toBe(false);
    expect(hasActivePujaFilters(parsePujaFilters({ category: 'abhishekam' }, FACETS))).toBe(true);
    // A token no option offers is not an "active filter" — it is dropped.
    expect(hasActivePujaFilters(parsePujaFilters({ category: 'aarti' }, FACETS))).toBe(false);
  });
});

describe('DB-04 — the page wires the controls instead of rendering them inert', () => {
  it('the selects live inside a GET form pointed at /pujas', () => {
    expect(pujaPage).toMatch(/<form[^>]*action="\/pujas"[^>]*method="get"/);
  });

  it('every select carries a name the server reads', () => {
    for (const name of ['category', 'deity', 'price', 'sort']) {
      expect(pujaPage, `select name="${name}" missing`).toMatch(
        new RegExp(`name="${name}"`),
      );
    }
  });

  it('no select is left without a name and a defaultValue', () => {
    const selects = pujaPage.match(/<select[\s\S]*?>/g) ?? [];
    expect(selects.length).toBeGreaterThan(0);
    for (const s of selects) {
      expect(s, `inert <select>: ${s.slice(0, 80)}`).toMatch(/name=/);
      expect(s, `unbound <select>: ${s.slice(0, 80)}`).toMatch(/defaultValue=/);
    }
  });

  it('the occasion facet is gone rather than shipped inert (no data backs it)', () => {
    expect(pujaPage).not.toMatch(/All Occasions/);
  });

  it('the page derives its options from the catalogue it renders', () => {
    expect(pujaPage).toContain('buildPujaFacets(catalogue)');
    expect(pujaPage).toContain('facets.categories.map');
    expect(pujaPage).toContain('facets.deities.map');
    // A hard-coded label list is exactly what shipped dead options. (The
    // offline FALLBACK_PUJAS rows legitimately carry category strings — those
    // are catalogue DATA, and the facets derive from them like any other.)
    expect(pujaPage).not.toMatch(/const\s+(categories|deities|occasions|priceRanges)\s*=\s*\[/);
    expect(pujaPage).not.toMatch(/\{(categories|deities|occasions|priceRanges)\.map\(/);
  });

  it('the page filters through the shared module', () => {
    expect(pujaPageSrc).toMatch(/from ['"][^'"]*lib\/puja-catalogue-filters['"]/);
    expect(pujaPage).toContain('applyPujaCatalogue');
  });
});
