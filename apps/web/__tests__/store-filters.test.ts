import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  filterAndSortProducts,
  parseStoreFilters,
  buildStoreQuery,
  DEFAULT_STORE_FILTERS,
  type FilterableProduct,
} from '../lib/store-filters';

// S-04 (prod sweep 2026-08-12): the search box, both dropdowns and every
// category pill on /store were inert markup on a server component — no value,
// no onChange, no onClick, active pill hardcoded to `i === 0`. A shopper could
// not sort, filter or search 24 products.

const P = (over: Partial<FilterableProduct>): FilterableProduct => ({
  title: 'Item',
  description: '',
  category: 'Puja Essentials',
  collection: 'puja-essentials',
  price: 100,
  rating: 4.5,
  reviewCount: 10,
  freeDelivery: false,
  tag: null,
  ...over,
});

const CATALOGUE: FilterableProduct[] = [
  P({ title: 'Rudraksha Mala', collection: 'rudraksha-malas', price: 899, rating: 4.8, reviewCount: 120 }),
  P({ title: 'Brass Diya', collection: 'puja-essentials', price: 249, rating: 4.1, reviewCount: 40 }),
  P({ title: 'Ganesh Idol', collection: 'idols-murtis', price: 2999, rating: 3.6, reviewCount: 5, freeDelivery: true }),
  P({ title: 'Bhagavad Gita', collection: 'books-scriptures', price: 349, rating: 4.9, reviewCount: 300 }),
];

describe('parseStoreFilters', () => {
  it('defaults everything when the URL is bare', () => {
    expect(parseStoreFilters({})).toEqual(DEFAULT_STORE_FILTERS);
  });

  it('reads each control off the query string', () => {
    expect(
      parseStoreFilters({
        q: 'rudraksha',
        category: 'rudraksha-malas',
        price: 'under-500',
        sort: 'price-asc',
        delivery: 'free',
        rating: '4plus',
      }),
    ).toEqual({
      q: 'rudraksha',
      category: 'rudraksha-malas',
      price: 'under-500',
      sort: 'price-asc',
      freeDelivery: true,
      topRated: true,
    });
  });

  it('rejects a bogus sort/price rather than passing it through', () => {
    const f = parseStoreFilters({ sort: 'DROP TABLE', price: '../../etc' });
    expect(f.sort).toBe('popular');
    expect(f.price).toBe('any');
  });
});

describe('filterAndSortProducts', () => {
  it('search narrows by title', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, q: 'rudraksha' });
    expect(out.map((p) => p.title)).toEqual(['Rudraksha Mala']);
  });

  it('search is case-insensitive and covers the description', () => {
    const cat = [...CATALOGUE, P({ title: 'Camphor', description: 'Pure KAPUR tablets' })];
    const out = filterAndSortProducts(cat, { ...DEFAULT_STORE_FILTERS, q: 'kapur' });
    expect(out.map((p) => p.title)).toEqual(['Camphor']);
  });

  it('category pill filters by collection', () => {
    const out = filterAndSortProducts(CATALOGUE, {
      ...DEFAULT_STORE_FILTERS,
      category: 'books-scriptures',
    });
    expect(out.map((p) => p.title)).toEqual(['Bhagavad Gita']);
  });

  it('price band "Under ₹500" drops out-of-range products', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, price: 'under-500' });
    expect(out.map((p) => p.title).sort()).toEqual(['Bhagavad Gita', 'Brass Diya']);
  });

  it('price band "Above ₹2,500" keeps only the expensive one', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, price: 'above-2500' });
    expect(out.map((p) => p.title)).toEqual(['Ganesh Idol']);
  });

  it('sorts price low to high', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, sort: 'price-asc' });
    expect(out.map((p) => p.price)).toEqual([249, 349, 899, 2999]);
  });

  it('sorts price high to low', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, sort: 'price-desc' });
    expect(out.map((p) => p.price)).toEqual([2999, 899, 349, 249]);
  });

  it('sorts rating high to low', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, sort: 'rating-desc' });
    expect(out[0].title).toBe('Bhagavad Gita');
    expect(out[out.length - 1].title).toBe('Ganesh Idol');
  });

  it('free-delivery toggle keeps only free-delivery products', () => {
    const out = filterAndSortProducts(CATALOGUE, {
      ...DEFAULT_STORE_FILTERS,
      freeDelivery: true,
    });
    expect(out.map((p) => p.title)).toEqual(['Ganesh Idol']);
  });

  it('4+ rating toggle drops lower-rated products', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, topRated: true });
    expect(out.map((p) => p.title)).not.toContain('Ganesh Idol');
  });

  it('combines filters (category + price + sort)', () => {
    const out = filterAndSortProducts(CATALOGUE, {
      ...DEFAULT_STORE_FILTERS,
      price: 'under-500',
      sort: 'price-desc',
    });
    expect(out.map((p) => p.title)).toEqual(['Bhagavad Gita', 'Brass Diya']);
  });

  it('does not mutate the caller’s array order', () => {
    const original = CATALOGUE.map((p) => p.title);
    filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, sort: 'price-desc' });
    expect(CATALOGUE.map((p) => p.title)).toEqual(original);
  });

  it('returns an empty list rather than the full catalogue when nothing matches', () => {
    const out = filterAndSortProducts(CATALOGUE, { ...DEFAULT_STORE_FILTERS, q: 'zzzz' });
    expect(out).toEqual([]);
  });
});

describe('buildStoreQuery', () => {
  it('omits defaults', () => {
    expect(buildStoreQuery(DEFAULT_STORE_FILTERS)).toBe('');
  });

  it('round-trips through parseStoreFilters', () => {
    const filters = {
      ...DEFAULT_STORE_FILTERS,
      q: 'mala',
      category: 'rudraksha-malas',
      price: '500-1000' as const,
      sort: 'rating-desc' as const,
      freeDelivery: true,
      topRated: true,
    };
    const qs = buildStoreQuery(filters);
    const parsed = parseStoreFilters(Object.fromEntries(new URLSearchParams(qs.slice(1))));
    expect(parsed).toEqual(filters);
  });
});

describe('/store page wiring (S-04, COM-13)', () => {
  const src = readFileSync(resolve(__dirname, '../app/store/page.tsx'), 'utf8');

  it('has a real client filter bar component', () => {
    expect(existsSync(resolve(__dirname, '../components/store/StoreFilterBar.tsx'))).toBe(true);
  });

  it('applies the filters to the grid', () => {
    expect(src).toMatch(/filterAndSortProducts/);
    expect(src).toMatch(/parseStoreFilters/);
  });

  it('no longer hardcodes the active category pill to the first index', () => {
    expect(src).not.toMatch(/i === 0/);
  });

  it('drops the hardcoded expired Akshaya Tritiya banner (COM-13)', () => {
    expect(src).not.toMatch(/Akshaya Tritiya/);
    expect(src).not.toMatch(/Offer valid till April 30/);
  });
});
