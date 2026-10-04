/**
 * COM-01 — which store products can actually be bought, and why the rest cannot.
 *
 * THE DEFECT THIS CLOSES
 * ----------------------
 * `/store` rendered a live "Add to Cart" on all 24 rows of `lib/products.ts`,
 * the cart accepted them, and `POST /api/v1/store/orders` then answered
 * `400 Unknown product: prod_015` — because that route resolves every line item
 * against the `StoreProduct` table BY UUID, and `prod_015` is not a uuid and
 * never was. A devotee could fill a basket, enter an address, choose a payment
 * method and press Place Order, and the only thing they got back was
 * "Order failed (400)". Every item they could see behaved this way. The API had
 * the identical defect, so mobile was no better.
 *
 * WHY THE 24 ARE NOT MADE REAL INSTEAD
 * ------------------------------------
 * Because there is nothing behind them. Read-only against prod on 2026-09-08
 * (`apps/api/scripts/check-store-catalogue.mjs`): `store_products` = 0,
 * `store_profiles` = 0, `store_orders` = 0. No seller has onboarded, so no one
 * holds this stock, no one can pack it and no one can ship it. Giving the rows
 * uuids so checkout stopped erroring would mean taking money for goods that do
 * not exist — a worse defect than the one being fixed, not a smaller one. The
 * same reasoning is already recorded in `app/store/products/live/page.tsx` and
 * `lib/store-live.ts`, and unifying the catalogues was left owner-gated there.
 *
 * THE RULE
 * --------
 * A product is buyable exactly when its id is a `StoreProduct` uuid — i.e. when
 * it came from `getLiveProducts()`. That is not a heuristic about this app; it
 * is the literal filter `POST /store/orders` applies before its lookup
 * (`apps/api/src/routes/store-orders.ts`, `UUID_RE`). It rules out the seed
 * fixtures AND anything a Medusa backend would hand back (`prod_01H…`), both
 * correctly: neither has a row in `store_products`.
 *
 * Everything else is browse-only and says so, in words, at the control the
 * shopper would otherwise have pressed. Pinned by
 * `__tests__/com01-store-catalogue-order-parity.test.tsx`.
 */

/**
 * The uuid shape the order route accepts. Kept character-identical to
 * `UUID_RE` in `apps/api/src/routes/store-orders.ts` and to
 * `STORE_PRODUCT_ID_RE` in `apps/api/src/services/store.service.ts`.
 */
export const STORE_PRODUCT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The sentence a shopper gets in place of a checkout that cannot complete.
 * One string, so the grid, the product page and the basket cannot each invent
 * their own version of the truth.
 */
export const BROWSE_ONLY_REASON =
  'No seller stocks this yet, so it cannot be ordered.';

/** The longer form, for a product page that has room to explain. */
export const BROWSE_ONLY_REASON_LONG =
  'This is a preview of the kind of item Darshya sellers will list. No seller stocks it yet, so it cannot be ordered — real seller inventory is on the live products page and is orderable today.';

/** True only for an id `POST /api/v1/store/orders` can resolve. */
export function isOrderableProductId(id: string | null | undefined): boolean {
  return typeof id === 'string' && STORE_PRODUCT_ID_RE.test(id);
}

/** `null` when the product can be bought; otherwise the reason it cannot. */
export function browseOnlyReason(id: string | null | undefined): string | null {
  return isOrderableProductId(id) ? null : BROWSE_ONLY_REASON;
}

/**
 * The ids in a basket that checkout would refuse. Empty means the basket can
 * be ordered — which is what a shopper is entitled to know BEFORE they enter
 * an address and pick a payment method, not after.
 */
export function unorderableItemIds(
  items: { product: { id: string } }[],
): string[] {
  return items.filter((i) => !isOrderableProductId(i.product.id)).map((i) => i.product.id);
}
