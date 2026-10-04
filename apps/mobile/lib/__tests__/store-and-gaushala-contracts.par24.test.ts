import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  selectStoreAdminProducts,
  type StoreAdminCatalogueVM,
} from '../store-admin-catalogue';
import { selectGaushalaSelfProfile } from '../gaushala-portal-profile';

/**
 * PAR-24 — the store-owner and gaushala-manager portals.
 *
 * Five contract defects, all of the same family the earlier PAR passes closed
 * on other screens: the screen read a DIFFERENT endpoint from the one it wrote
 * to, or sent values the route's Zod schema does not accept, or rendered a
 * literal in place of a fact.
 *
 *  1. (store-admin)/products.tsx listed GET /api/v1/store/products — the PUBLIC
 *     storefront, served from the hardcoded PRODUCTS array in
 *     apps/api/src/services/store.service.ts:89 — while "Add New Product" wrote
 *     to POST /api/v1/store-admin/products. The merchant's own catalogue was
 *     never on the screen and their new product could never appear.
 *  2. The same screen took `stock` from `FALLBACK[i % FALLBACK.length]`
 *     UNCONDITIONALLY, for every row, so the "In stock / Low / Out" pill
 *     reported invented inventory against a real catalogue.
 *  3. (store-admin)/dashboard.tsx counted that same public seed list as the
 *     owner's catalogue.
 *  4. (store-admin)/orders.tsx sent lowercase statuses — and 'packed', which is
 *     not a member — to a `z.enum([...UPPERCASE])`, so every status change 400'd;
 *     and it rendered the `items` ARRAY where an item COUNT belonged.
 *  5. (gaushala)/profile.tsx read GET /api/v1/gaushala, the SAMPLE listing feed
 *     ("Nothing here has been verified"), and matched itself into it by name.
 *
 * These tests pin the fixes to the ROUTE FILES rather than restating them, so a
 * rename on the server fails here instead of in production.
 */

const MOBILE = path.resolve(__dirname, '../..');
const API_STORE_ORDERS = path.resolve(
  __dirname,
  '../../../../apps/api/src/routes/store-orders.ts',
);
const API_STORE_ADMIN = path.resolve(
  __dirname,
  '../../../../apps/api/src/routes/store-admin.ts',
);

const read = (rel: string) => readFileSync(path.join(MOBILE, rel), 'utf8');

/**
 * These screens carry long WHY comments that quote the defective code verbatim
 * — `FALLBACK[i % ...]`, `useProducts()`, `'packed'`. That is deliberate: the
 * comment is the record of what went wrong. So every "this must be gone"
 * assertion runs against the CODE with comments removed, or it would be
 * satisfied only by deleting the explanation.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const PRODUCTS_SCREEN = code(read('app/(store-admin)/products.tsx'));
const STORE_DASHBOARD = code(read('app/(store-admin)/dashboard.tsx'));
const ORDERS_SCREEN = code(read('app/(store-admin)/orders.tsx'));
const GAUSHALA_PROFILE = code(read('app/(gaushala)/profile.tsx'));

// ─── 1. the merchant catalogue selector ──────────────────────────────────────

/**
 * Verbatim shape of `serializeProduct` (apps/api/src/routes/store-admin.ts:59):
 * `name` not `title`, `price` a Decimal STRING, `stock` an Int, no `handle`.
 */
const REAL_CATALOGUE_BODY = {
  products: [
    {
      id: 'c0ffee00-0000-4000-8000-000000000001',
      storeProfileId: 'aaaa0000-0000-4000-8000-000000000001',
      name: 'Handwoven Tulsi Mala',
      description: null,
      price: '450.00',
      imageUrl: null,
      category: 'Malas',
      stock: 0,
      sku: 'TM-01',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'c0ffee00-0000-4000-8000-000000000002',
      storeProfileId: 'aaaa0000-0000-4000-8000-000000000001',
      name: 'Brass Diya',
      description: null,
      price: '120',
      imageUrl: null,
      category: null,
      stock: 3,
      sku: null,
      isActive: false,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 200,
};

describe('PAR-24 selectStoreAdminProducts reads the merchant route', () => {
  const vm = selectStoreAdminProducts(REAL_CATALOGUE_BODY) as StoreAdminCatalogueVM;

  it('reads `name` and the Decimal-string `price` the route actually sends', () => {
    expect(vm.rows.map((r) => r.name)).toEqual(['Handwoven Tulsi Mala', 'Brass Diya']);
    expect(vm.rows.map((r) => r.priceInr)).toEqual([450, 120]);
  });

  it('reports the SERVER stock, including a genuine 0, and never borrows another row', () => {
    expect(vm.rows.map((r) => r.stock)).toEqual([0, 3]);
  });

  it('carries the paired COUNT rather than the page length', () => {
    expect(
      selectStoreAdminProducts({ ...REAL_CATALOGUE_BODY, total: 57 })!.total,
    ).toBe(57);
  });

  it('keeps the owner’s own unlisted product visible', () => {
    expect(vm.rows[1]!.isActive).toBe(false);
  });

  it('carries the merchant’s free-text category verbatim, not humanised', () => {
    // `StoreProduct.category` is not an enum — it is whatever the owner typed.
    expect(vm.rows.map((r) => r.categoryName)).toEqual(['Malas', null]);
  });

  it('answers null for a 403 body so the screen cannot render "no products"', () => {
    expect(selectStoreAdminProducts({ error: 'STORE_OWNER role required' })).toBeNull();
    expect(selectStoreAdminProducts(null)).toBeNull();
    expect(selectStoreAdminProducts([])).toBeNull();
  });

  it('distinguishes "store not set up" from "no products"', () => {
    const missing = selectStoreAdminProducts({ products: [], storeProfileMissing: true })!;
    expect(missing.storeProfileMissing).toBe(true);
    expect(missing.rows).toEqual([]);
    const empty = selectStoreAdminProducts({ products: [], total: 0 })!;
    expect(empty.storeProfileMissing).toBe(false);
  });

  it('drops a row with no stock figure rather than printing 0 for it', () => {
    const vm2 = selectStoreAdminProducts({
      products: [{ id: 'x', name: 'No stock key', price: '10' }],
    })!;
    expect(vm2.rows).toEqual([]);
  });
});

// ─── 2. the products screen no longer invents anything ───────────────────────

describe('PAR-24 (store-admin)/products.tsx', () => {
  it('lists the merchant route, not the public storefront', () => {
    expect(PRODUCTS_SCREEN).toContain('useStoreAdminProducts');
    expect(PRODUCTS_SCREEN).not.toMatch(/\buseProducts\b/);
  });

  it('writes and reads the SAME collection', () => {
    expect(PRODUCTS_SCREEN).toContain("api.post('/api/v1/store-admin/products'");
    // The old code invalidated ['store','products'] — the public query — so the
    // list never refetched even when the write succeeded.
    expect(PRODUCTS_SCREEN).toContain('storeAdminQueryKeys.products');
    expect(PRODUCTS_SCREEN).not.toContain("queryKey: ['store', 'products']");
  });

  it('has no fabricated catalogue and no modulo-indexed fallback left', () => {
    expect(PRODUCTS_SCREEN).not.toContain('FALLBACK');
    expect(PRODUCTS_SCREEN).not.toMatch(/%\s*FALLBACK/);
    // The five invented products, by name. ("Rudraksha Mala" survives as the
    // Name field's placeholder text, which is a hint to the owner and not a
    // row rendered as their inventory, so it is not asserted against.)
    expect(PRODUCTS_SCREEN).not.toContain('Brass Ganesha');
    expect(PRODUCTS_SCREEN).not.toContain('Puja Thali Set');
    expect(PRODUCTS_SCREEN).not.toContain('sandalwood-dhoop');
    // No stock literal anywhere: every stock figure on this screen is the
    // server's.
    expect(PRODUCTS_SCREEN).not.toMatch(/stock:\s*\d/);
  });

  it('sends exactly the keys productCreateSchema accepts', () => {
    const routeSrc = readFileSync(API_STORE_ADMIN, 'utf8');
    const schema = routeSrc.slice(
      routeSrc.indexOf('const productCreateSchema'),
      routeSrc.indexOf('const productUpdateSchema'),
    );
    expect(schema).toContain('name:');
    for (const key of ['name', 'price', 'stock', 'category', 'sku', 'description', 'isActive']) {
      expect(schema).toContain(`${key}:`);
      expect(PRODUCTS_SCREEN).toContain(`${key}`);
    }
    // `price` is z.number(); the screen must not post the raw text input.
    expect(PRODUCTS_SCREEN).toContain('const priceNum = Number(form.price)');
    expect(PRODUCTS_SCREEN).toContain('price: priceNum');
  });
});

describe('PAR-24 (store-admin)/dashboard.tsx', () => {
  it('counts the owner’s catalogue, not the public seed list', () => {
    expect(STORE_DASHBOARD).toContain('useStoreAdminProducts');
    expect(STORE_DASHBOARD).not.toMatch(/\buseProducts\b/);
  });

  it('does not read `title` / `handle`, which the merchant route never sends', () => {
    expect(STORE_DASHBOARD).not.toContain('p.title');
    expect(STORE_DASHBOARD).not.toContain('p.handle');
  });
});

// ─── 3. the orders screen speaks the route's enum ────────────────────────────

function apiStoreOrderStatuses(src: string): string[] {
  const block = src.slice(
    src.indexOf('const updateStatusSchema'),
    src.indexOf('const orderIdParams'),
  );
  return Array.from(block.matchAll(/'([A-Z_]+)'/g)).map((m) => m[1]!);
}

function apiAllowedTransitions(src: string): Record<string, string[]> {
  const start = src.indexOf('const ALLOWED_TRANSITIONS');
  const block = src.slice(start, src.indexOf('};', start));
  const out: Record<string, string[]> = {};
  for (const m of block.matchAll(/^\s{8}([A-Z_]+):\s*\[([^\]]*)\],/gm)) {
    out[m[1]!] = Array.from(m[2]!.matchAll(/'([A-Z_]+)'/g)).map((x) => x[1]!);
  }
  return out;
}

function screenAllowedTransitions(src: string): Record<string, string[]> {
  const start = src.indexOf('const ALLOWED_TRANSITIONS');
  const block = src.slice(start, src.indexOf('});', start));
  const out: Record<string, string[]> = {};
  for (const m of block.matchAll(/^\s{4}([A-Z_]+):\s*\[([^\]]*)\],/gm)) {
    out[m[1]!] = Array.from(m[2]!.matchAll(/'([A-Z_]+)'/g)).map((x) => x[1]!);
  }
  return out;
}

describe('PAR-24 (store-admin)/orders.tsx status contract', () => {
  const routeSrc = readFileSync(API_STORE_ORDERS, 'utf8');
  const apiStatuses = apiStoreOrderStatuses(routeSrc);

  it('reads a real route file', () => {
    expect(apiStatuses.length).toBeGreaterThan(0);
    expect(apiStatuses).toContain('PROCESSING');
  });

  it('offers exactly the members of the route’s z.enum, uppercase', () => {
    const listed = Array.from(
      ORDERS_SCREEN.slice(
        ORDERS_SCREEN.indexOf('const STORE_ORDER_STATUSES'),
        ORDERS_SCREEN.indexOf('] as const'),
      ).matchAll(/'([A-Z_]+)'/g),
    ).map((m) => m[1]!);
    expect(listed).toEqual(apiStatuses);
  });

  it('no longer sends lowercase values Zod cannot coerce', () => {
    expect(ORDERS_SCREEN).not.toMatch(/'(pending|packed|shipped|delivered|cancelled)'/);
  });

  it("does not offer 'packed', which is not a status at all", () => {
    expect(ORDERS_SCREEN.toLowerCase()).not.toContain("'packed'");
    expect(apiStatuses).not.toContain('PACKED');
  });

  it('mirrors the route’s transition table exactly, so no tap can 409', () => {
    expect(screenAllowedTransitions(ORDERS_SCREEN)).toEqual(apiAllowedTransitions(routeSrc));
  });

  it('renders the item COUNT, never the items array itself', () => {
    // `<Text>{itemsArray}</Text>` throws "Objects are not valid as a React
    // child" and blanks the screen for any owner with an order.
    expect(ORDERS_SCREEN).toContain('Array.isArray(o.items) ? o.items.length : 0');
    expect(ORDERS_SCREEN).not.toContain('o.items ?? 0');
    expect(ORDERS_SCREEN).not.toContain('items?: number');
  });
});

// ─── 4. the gaushala profile reads the real source ───────────────────────────

describe('PAR-24 selectGaushalaSelfProfile', () => {
  it('reads this manager’s own GaushalaProfile row', () => {
    const vm = selectGaushalaSelfProfile({
      profile: {
        id: 'p1',
        userId: 'u1',
        gaushalaName: 'Shree Gau Seva Kendra',
        address: 'Sector 12',
        city: 'Gurugram',
        totalCows: 14,
        verified: false,
        description: 'A shelter run by the trust.',
        approved: true,
      },
      stats: { totalCows: 14, totalDonors: 2, totalDonationsInr: 5100, monthDonationsInr: 0 },
      recentDonations: [],
      recentCows: [],
    })!;
    expect(vm.name).toBe('Shree Gau Seva Kendra');
    expect(vm.city).toBe('Gurugram');
    expect(vm.totalCows).toBe(14);
    expect(vm.approved).toBe(true);
    expect(vm.profileMissing).toBe(false);
  });

  it('says "no profile yet" when the server sends profile: null', () => {
    const vm = selectGaushalaSelfProfile({ profile: null, stats: {} })!;
    expect(vm.profileMissing).toBe(true);
    expect(vm.name).toBeNull();
  });

  it('answers null for a 403 body rather than an empty profile', () => {
    expect(selectGaushalaSelfProfile({ error: 'GAUSHALA_MANAGER role required' })).toBeNull();
  });
});

describe('PAR-24 (gaushala)/profile.tsx', () => {
  it('no longer reads the SAMPLE listing feed', () => {
    expect(GAUSHALA_PROFILE).not.toContain('useGaushalas');
    expect(GAUSHALA_PROFILE).not.toMatch(/['"]\/api\/v1\/gaushala['"]/);
  });

  it('uses the role-gated portal dashboard', () => {
    expect(GAUSHALA_PROFILE).toContain('useGaushalaPortalDashboard');
  });

  it('does not identify the manager by matching their name against a listing', () => {
    expect(GAUSHALA_PROFILE).not.toContain('g.name === user?.fullName');
  });

  it('never renders GaushalaProfile.verified, which nothing in the API writes', () => {
    expect(GAUSHALA_PROFILE).not.toMatch(/\bme\.verified\b/);
    expect(GAUSHALA_PROFILE).not.toContain('80G Tax Exemption Certified');
    expect(GAUSHALA_PROFILE).not.toContain('Animal Welfare Board');
  });
});

// ─── 5. an Active offering is not a claim that it is bookable ───────────────

describe('PAR-24 (temple)/pujas.tsx does not present an unverified temple as bookable', () => {
  it('says who decides, given nothing in /temple-portal reports Temple.isVerified', () => {
    const src = read('app/(temple)/pujas.tsx');
    expect(src).toMatch(/verified your temple/i);
  });

  it('does not render TempleProfile.verified, which has no writer in the API', () => {
    expect(code(read('app/(temple)/pujas.tsx'))).not.toMatch(/\.verified/);
    expect(code(read('app/(temple)/dashboard.tsx'))).not.toMatch(/\.verified/);
  });

  it('the booking gate really is on the TEMPLE, not the offering', () => {
    const svc = readFileSync(
      path.resolve(__dirname, '../../../../apps/api/src/services/booking.service.ts'),
      'utf8',
    );
    expect(svc).toContain('offering.temple?.isVerified');
    expect(svc).toContain('This temple has not been verified yet.');
  });
});

// ─── 6. lane-wide: no screen in these portals reads a sample/public feed ─────

describe('PAR-24 provider portals read scoped routes only', () => {
  const SCOPED_ONLY: Array<[string, RegExp]> = [
    // The public cow feed is 19 animals across five seeded gaushalas.
    ['app/(gaushala)/cows.tsx', /['"]\/api\/v1\/gaushala\/cows['"]/],
    ['app/(gaushala)/dashboard.tsx', /['"]\/api\/v1\/gaushala\/cows['"]/],
    // The public storefront is a hardcoded seed array.
    ['app/(store-admin)/products.tsx', /['"]\/api\/v1\/store\/products['"]/],
    ['app/(store-admin)/dashboard.tsx', /['"]\/api\/v1\/store\/products['"]/],
  ];

  for (const [rel, forbidden] of SCOPED_ONLY) {
    it(`${rel} does not call the public feed`, () => {
      expect(code(read(rel))).not.toMatch(forbidden);
    });
  }

  it('no portal screen ships a hardcoded stand-in catalogue or herd', () => {
    for (const rel of [
      'app/(store-admin)/products.tsx',
      'app/(store-admin)/dashboard.tsx',
      'app/(store-admin)/orders.tsx',
      'app/(gaushala)/cows.tsx',
      'app/(gaushala)/dashboard.tsx',
      'app/(gaushala)/profile.tsx',
      'app/(temple)/pujas.tsx',
      'app/(temple)/streams.tsx',
      'app/(temple)/bookings.tsx',
    ]) {
      const src = code(read(rel));
      expect(src, `${rel} still declares a FALLBACK stand-in`).not.toMatch(
        /^const (FALLBACK|MOCK|SAMPLE|DEMO)[A-Z_]*\s*[:=]/m,
      );
    }
  });
});
