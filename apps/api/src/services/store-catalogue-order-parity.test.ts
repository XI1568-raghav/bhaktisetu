import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  StoreService,
  presentFixture,
  presentLiveProduct,
  FIXTURE_UNAVAILABLE_REASON,
  STORE_PRODUCT_ID_RE,
  type CatalogueRow,
  type Product,
} from './store.service.js';

/**
 * COM-01 — the catalogue and the order path must agree on product identity.
 *
 * THE DEFECT
 * ----------
 * `GET /api/v1/store/products` served 24 hand-written rows with ids like
 * `prod_015`. `POST /api/v1/store/orders` resolves every line item against
 * `StoreProduct` BY UUID and answered `400 Unknown product: prod_015`. So every
 * single item a shopper could see was unorderable — identically on web and on
 * mobile — while the only orderable rows lived behind `GET /store/products/live`,
 * which prod has zero of. The store could not take one order on either platform.
 *
 * WHY THE FIXTURES ARE NOT SEEDED AS REAL ROWS
 * -------------------------------------------
 * Because they are not real inventory. Read-only against prod on 2026-09-08
 * (`scripts/check-store-catalogue.mjs`): `store_products` = 0,
 * `store_profiles` = 0, `store_orders` = 0. No seller exists, so no one holds
 * this stock and no one can ship it. Minting uuids for the 24 would let a
 * devotee pay for a brass thali that does not exist — a worse defect than the
 * one being fixed. They stay browse-only and say so.
 *
 * THE INVARIANT THESE TESTS PIN
 * -----------------------------
 *     buyable === true  ⇔  source === 'live'  ⇔  id matches STORE_PRODUCT_ID_RE
 *
 * i.e. anything the catalogue presents as buyable is an id shape the order
 * route accepts. If a future change puts a fixture back on the buyable side, or
 * lets an id through that `POST /store/orders` would reject, this file fails.
 */

const service = new StoreService();

/** A realistic seller row, in the exact shape the route's `select` returns. */
function liveRow(overrides: Partial<Parameters<typeof presentLiveProduct>[0]> = {}) {
  return presentLiveProduct({
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    name: 'Handmade Cotton Wicks (200)',
    description: 'Rolled by hand.',
    price: '120.00', // Prisma hands back a Decimal, not a number
    imageUrl: null,
    category: 'Puja Essentials',
    stock: 12,
    sku: 'SEL-001',
    storeProfile: { storeName: 'Shri Traders' },
    ...overrides,
  });
}

describe('COM-01 — every buyable id is an id POST /store/orders can resolve', () => {
  it('is the state prod is actually in: the catalogue is entirely browse-only', () => {
    // Zero seller rows exist, so `getProducts` with no live list is what a
    // devotee gets today. Not one of the 24 may be presented as buyable.
    const { products, total } = service.getProducts({ limit: 100 });
    expect(total).toBe(24);
    expect(products).toHaveLength(24);
    expect(products.every((p) => p.buyable === false)).toBe(true);
  });

  it('holds the biconditional on a merged catalogue', () => {
    const { products } = service.getProducts({ limit: 100 }, [liveRow()]);
    expect(products.length).toBe(25);
    for (const p of products) {
      expect(p.buyable, `${p.id}: buyable disagrees with source`).toBe(p.source === 'live');
      expect(
        STORE_PRODUCT_ID_RE.test(p.id),
        `${p.id}: buyable disagrees with the id shape the order route accepts`,
      ).toBe(p.buyable);
    }
  });

  it('never presents a product as buyable without an id the order route resolves', () => {
    // The single assertion that matters, stated on its own so a failure names
    // the actual defect rather than a shape mismatch.
    const { products } = service.getProducts({ limit: 100 }, [liveRow()]);
    const buyable = products.filter((p) => p.buyable);
    expect(buyable.length).toBeGreaterThan(0);
    for (const p of buyable) {
      expect(STORE_PRODUCT_ID_RE.test(p.id)).toBe(true);
    }
  });

  it('gives every unbuyable product a reason a shopper can read', () => {
    const { products } = service.getProducts({ limit: 100 });
    for (const p of products) {
      expect(p.unavailableReason, `${p.id} has no stated reason`).toBeTruthy();
      // Shopper-facing prose, not a machine code the UI has to translate.
      expect(p.unavailableReason).not.toMatch(/^[a-z_]+$/);
    }
    expect(products[0]!.unavailableReason).toBe(FIXTURE_UNAVAILABLE_REASON);
  });

  it('states `unavailableReason: null` exactly when buyable', () => {
    const live = liveRow();
    expect(live.buyable).toBe(true);
    expect(live.unavailableReason).toBeNull();

    const fixture = service.getProductByHandle('premium-brass-puja-thali-set')!;
    expect(fixture.buyable).toBe(false);
    expect(fixture.unavailableReason).not.toBeNull();
  });
});

describe('COM-01 — the id regex is the SAME regex on both sides', () => {
  // The order route filters its StoreProduct lookup with its own literal so it
  // never hands a `prod_015` to a uuid column (Prisma P2023 → a 500 rendered
  // mid-word at the highest-intent moment in the funnel). Two copies of a rule
  // is how the catalogue and the order path drifted apart in the first place,
  // so pin that they still say the same thing.
  const routeSrc = readFileSync(resolve(__dirname, '..', 'routes/store-orders.ts'), 'utf8');

  it('store-orders.ts still filters on the uuid shape', () => {
    const match = routeSrc.match(/const UUID_RE = (\/.+\/i);/);
    expect(match, 'store-orders.ts no longer defines UUID_RE').not.toBeNull();
    expect(match![1]).toBe(STORE_PRODUCT_ID_RE.toString());
  });

  it('agrees with the service on concrete ids', () => {
    const match = routeSrc.match(/const UUID_RE = (\/.+\/i);/)!;
    // eslint-disable-next-line no-eval
    const routeRe: RegExp = eval(match[1]!);
    for (const id of [
      'prod_001',
      'prod_024',
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      '3F2504E0-4F89-41D3-9A0C-0305E82C3301',
      'not-a-uuid',
      '',
    ]) {
      expect(routeRe.test(id), `disagreement on "${id}"`).toBe(STORE_PRODUCT_ID_RE.test(id));
    }
  });
});

describe('COM-01 — buyable inventory is never buried under browse-only fixtures', () => {
  // The default sort is by review count, and the fixtures carry invented
  // tallies (145-2,100 each) while a real seller row honestly carries 0. Without
  // the buyable-first pass, the one product a shopper can actually buy would
  // sort dead last behind 24 they cannot.
  const sorts = [undefined, 'price_asc', 'price_desc', 'rating', 'newest', 'popular'];

  for (const sort of sorts) {
    it(`puts the seller row first under sort=${sort ?? '(default)'}`, () => {
      const { products } = service.getProducts({ sort, limit: 100 }, [liveRow()]);
      expect(products[0]!.source).toBe('live');
      expect(products[0]!.buyable).toBe(true);
    });
  }

  it('keeps a seller row on page 1, not stranded on page 2', () => {
    const { products } = service.getProducts({ page: 1, limit: 20 }, [liveRow()]);
    expect(products.some((p) => p.buyable)).toBe(true);
  });
});

describe('COM-01 — a seller row carries no invented signal', () => {
  it('has no star average, no review tally and no reference price', () => {
    const p = liveRow();
    // LEG-17: a 4.5 derived from zero reviews, or a struck-through price the
    // seller never charged, is fabricated social proof / a fabricated discount.
    // `null`, not 0: apps/mobile renders the badge on `rating !== null`, so a 0
    // would print "★ 0" — a terrible rating invented out of no reviews at all.
    expect(p.rating).toBeNull();
    expect(p.reviewCount).toBe(0);
    expect(p.compareAtPrice).toBeNull();
    expect(p.discount).toBe(0);
    expect(p.tag).toBeNull();
  });

  it('reads the delivery promise off the same threshold the order route charges', () => {
    // ₹120 basket → below the ₹499 free-delivery threshold → no free-delivery claim.
    expect(liveRow().freeDelivery).toBe(false);
    // ₹600 clears it on its own.
    expect(liveRow({ price: '600.00' }).freeDelivery).toBe(true);
  });

  it('reports out of stock rather than inventing availability', () => {
    expect(liveRow({ stock: 0 }).inStock).toBe(false);
    expect(liveRow({ stock: 1 }).inStock).toBe(true);
  });

  it('handles a Prisma Decimal price without floating-point drift', () => {
    expect(liveRow({ price: '1299.00' }).price).toBe(1299);
    expect(liveRow({ price: '99.50' }).price).toBe(99.5);
  });

  it('does not claim membership of a fixture merchandising collection', () => {
    const p = liveRow();
    const fixtureCollections = new Set(service.getCollections().map((c) => c.handle));
    expect(fixtureCollections.has(p.collection)).toBe(false);
  });
});

describe('COM-01 — the PDP resolves both keyspaces', () => {
  it('finds a seller product by its uuid', () => {
    const live = liveRow();
    const found = service.getProductByHandle(live.id, [live]);
    expect(found?.id).toBe(live.id);
    expect(found?.buyable).toBe(true);
  });

  it('still finds a fixture by its slug, and still marks it browse-only', () => {
    const found = service.getProductByHandle('premium-brass-puja-thali-set');
    expect(found?.id).toBe('prod_001');
    expect(found?.buyable).toBe(false);
  });

  it('returns null for a handle in neither keyspace', () => {
    expect(service.getProductByHandle('nonexistent-product')).toBeNull();
  });
});

describe('COM-01 — the basket states whether checkout will accept it', () => {
  it('marks a fixture-only basket unorderable, with the reason', () => {
    const cart = service.createCartItem('parity-user-1', 'prod_001', 1);
    expect(cart.orderable).toBe(false);
    expect(cart.unorderableReason).toBe(FIXTURE_UNAVAILABLE_REASON);
    expect(cart.items[0]!.product.buyable).toBe(false);
  });

  it('does not call an empty basket unorderable — empty is a different answer', () => {
    const cart = service.getCart('parity-user-empty');
    expect(cart.items).toHaveLength(0);
    expect(cart.orderable).toBe(true);
    expect(cart.unorderableReason).toBeNull();
  });

  /**
   * The basket used to resolve ids against the fixture array ONLY, so a seller
   * product answered "Product not found." That was harmless while the shopper
   * could not see one; it became a live defect the moment GET /store/products
   * started merging them in. Showing someone an orderable product and then
   * refusing to put it in their basket is the same class of defect as the
   * original, pointed the other way.
   */
  it('accepts a real seller product the route resolved for it', () => {
    const live = liveRow();
    const cart = service.createCartItem('parity-user-2', live.id, 2, live);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.productId).toBe(live.id);
    expect(cart.items[0]!.product.buyable).toBe(true);
    expect(cart.orderable).toBe(true);
    expect(cart.unorderableReason).toBeNull();
    expect(cart.subtotal).toBe(240); // 120 x 2, no floating-point drift
  });

  it('still refuses a uuid the route could not resolve', () => {
    expect(() =>
      service.createCartItem('parity-user-3', '11111111-2222-3333-4444-555555555555', 1),
    ).toThrow('Product not found.');
  });

  it('marks a mixed basket unorderable — one blocked line blocks checkout', () => {
    const live = liveRow();
    service.createCartItem('parity-user-4', live.id, 1, live);
    const cart = service.createCartItem('parity-user-4', 'prod_001', 1);
    expect(cart.items).toHaveLength(2);
    expect(cart.orderable).toBe(false);
    expect(cart.unorderableReason).toBe(FIXTURE_UNAVAILABLE_REASON);
  });
});

describe('COM-01 — presentFixture never widens what a row claims', () => {
  it('changes nothing except the three identity fields', () => {
    const before = service.getProductByHandle('premium-brass-puja-thali-set')!;
    const { source, buyable, unavailableReason, ...rest } = before;
    // A fixture always carries a real star average — only a seller row with no
    // reviews answers null — so narrowing back to CatalogueRow is sound here.
    expect(rest.rating).not.toBeNull();
    const row: CatalogueRow = { ...rest, rating: rest.rating! };
    const again: Product = presentFixture(row);
    expect(again).toEqual(before);
    expect(source).toBe('fixture');
    expect(buyable).toBe(false);
    expect(unavailableReason).toBe(FIXTURE_UNAVAILABLE_REASON);
  });
});
