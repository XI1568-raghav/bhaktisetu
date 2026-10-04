import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isOrderableProductId,
  browseOnlyReason,
  unorderableItemIds,
  STORE_PRODUCT_ID_RE,
  BROWSE_ONLY_REASON,
} from '../lib/store-buyability';
import { PRODUCTS } from '../lib/products';

/**
 * COM-01 — the catalogue and the order path must agree on product identity.
 *
 * /store rendered a live "Add to Cart" on all 24 rows of lib/products.ts, the
 * cart took them, /store/checkout collected an address and a payment method,
 * and POST /api/v1/store/orders then answered `400 Unknown product: prod_015`
 * — because that route resolves line items against `StoreProduct` BY UUID and
 * `prod_015` is not one. Every product a shopper could see behaved this way, so
 * the store could not take a single order. The devotee's whole experience of
 * the failure was the string "Order failed (400)".
 *
 * The 24 are NOT seeded as real rows to make the ids line up. Read-only against
 * prod on 2026-09-08 (apps/api/scripts/check-store-catalogue.mjs):
 * store_products = 0, store_profiles = 0, store_orders = 0. Nobody stocks them,
 * nobody can ship them; minting uuids would mean charging for goods that do not
 * exist. They are browse-only, and every surface says so at the control the
 * shopper would otherwise have pressed.
 *
 * These tests pin the rule, not the current row count: buyable ⇔ the id is a
 * StoreProduct uuid, and nothing unbuyable is offered as buyable anywhere.
 */

const web = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const A_REAL_STORE_PRODUCT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('COM-01 — the buyability rule is the order route’s own rule', () => {
  it('accepts a StoreProduct uuid and nothing else', () => {
    expect(isOrderableProductId(A_REAL_STORE_PRODUCT_ID)).toBe(true);
    expect(isOrderableProductId(A_REAL_STORE_PRODUCT_ID.toUpperCase())).toBe(true);

    for (const notAUuid of [
      'prod_001',
      'prod_024',
      'prod_01HZX7Y8', // a Medusa id: also has no store_products row
      'premium-brass-puja-thali-set',
      '',
      null,
      undefined,
    ]) {
      expect(isOrderableProductId(notAUuid), `wrongly orderable: ${notAUuid}`).toBe(false);
    }
  });

  it('uses the same regex the API does, character for character', () => {
    // Two copies of one rule is how the catalogue and the order path drifted
    // apart to begin with. If the API tightens its filter, this fails.
    const apiRoute = readFileSync(
      resolve(__dirname, '..', '..', 'api/src/routes/store-orders.ts'),
      'utf8',
    );
    const match = apiRoute.match(/const UUID_RE = (\/.+\/i);/);
    expect(match, 'store-orders.ts no longer defines UUID_RE').not.toBeNull();
    expect(match![1]).toBe(STORE_PRODUCT_ID_RE.toString());
  });
});

describe('COM-01 — not one seed product may be presented as buyable', () => {
  it('is the state we are actually in: all 24 are browse-only', () => {
    // If this ever fails it is good news — a seed row got a real StoreProduct
    // id — and the guards below become live-path assertions.
    expect(PRODUCTS.length).toBeGreaterThan(0);
    for (const p of PRODUCTS) {
      expect(isOrderableProductId(p.id), `${p.id} claims to be orderable`).toBe(false);
      expect(browseOnlyReason(p.id)).toBe(BROWSE_ONLY_REASON);
    }
  });

  it('names every unorderable line in a basket', () => {
    const ids = unorderableItemIds([
      { product: { id: 'prod_001' } },
      { product: { id: A_REAL_STORE_PRODUCT_ID } },
      { product: { id: 'prod_007' } },
    ]);
    expect(ids).toEqual(['prod_001', 'prod_007']);
  });

  it('calls a seller-only basket orderable', () => {
    expect(unorderableItemIds([{ product: { id: A_REAL_STORE_PRODUCT_ID } }])).toEqual([]);
  });
});

describe('COM-01 — every add-to-cart surface consults the rule', () => {
  it('the shared button refuses a non-orderable id before it checks stock', () => {
    const src = stripComments(web('components/store/AddToCartButton.tsx'));
    expect(src).toMatch(/isOrderableProductId\(product\.id\)/);
    // Order matters: "Out of stock" is the wrong reason for an item no seller
    // has ever listed — it implies the item exists and will come back.
    expect(src.indexOf('isOrderableProductId')).toBeLessThan(src.indexOf('product.inStock'));
    expect(src).toMatch(/BROWSE_ONLY_REASON/);
  });

  it('the product page gates BOTH its CTAs, not just Add to Cart', () => {
    const src = stripComments(web('components/store/ProductDetail.tsx'));
    expect(src).toMatch(/const orderable = isOrderableProductId\(product\.id\)/);
    // "Buy Now" routed straight to /store/checkout, so an ungated one walked a
    // devotee past the basket entirely.
    const gate = src.indexOf('!orderable');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(src.indexOf('handleBuyNow}'));
  });

  it('the seller shelf is NOT gated off — its rows are the orderable ones', () => {
    // The guard must not become a blanket "nothing is buyable". Seller cards
    // carry StoreProduct uuids and go through the same button, which lets them
    // through. This asserts the shelf still renders the real control.
    const src = stripComments(web('components/store/SellerShelf.tsx'));
    expect(src).toMatch(/<AddToCartButton product=\{toCartProduct\(p\)\}/);
    expect(src).not.toMatch(/disabled/);
  });
});

describe('COM-01 — checkout refuses before the money step, in words', () => {
  const src = stripComments(web('app/store/checkout/page.tsx'));

  it('computes the blocked lines from the rule', () => {
    expect(src).toMatch(/blockedItems\s*=\s*items\.filter\(\(it\) => !isOrderableProductId/);
  });

  it('disables Place Order while the basket contains one', () => {
    expect(src).toMatch(/disabled=\{placing \|\| !selectedAddress \|\| blockedItems\.length > 0\}/);
  });

  it('renders the API’s own sentence on a 400 instead of the status code', () => {
    // The old code threw `Order failed (${res.status})` for every 400 — which
    // was the ONLY thing a devotee ever saw, because every product 400'd.
    expect(src).toMatch(/product_not_orderable/);
    expect(src).toMatch(/throw new UserFacingError\(parsed\.message\)/);
  });
});

describe('COM-01 — the store page explains itself once, at the top', () => {
  const src = stripComments(web('app/store/page.tsx'));

  it('shows the preview-catalogue notice only while nothing is buyable', () => {
    // Self-retiring: the day a seller row reaches this grid the banner stops
    // rendering on its own, with no follow-up commit needed.
    expect(src).toMatch(/!products\.some\(\(p\) => isOrderableProductId\(p\.id\)\)/);
  });

  it('points at the shelf that is actually orderable', () => {
    expect(src).toMatch(/\/store\/products\/live/);
  });
});

describe('COM-01 — the cart names the line that blocks checkout', () => {
  it('marks a browse-only line where the Remove button is', () => {
    const src = stripComments(web('app/store/cart/page.tsx'));
    expect(src).toMatch(/!isOrderableProductId\(item\.product\.id\)/);
    expect(src).toMatch(/BROWSE_ONLY_REASON/);
  });
});
