-- P0 #S-11 (2026-07-09): StoreOrder <-> StoreProfile attribution FK.
-- Previously a StoreOrder had no direct store link; attribution was inferred
-- from the first line item's product (breaks for mixed-store carts, makes
-- owner-scoped order queries impossible — see S-15). Nullable + ON DELETE SET
-- NULL so historical orders survive a store-profile removal.

ALTER TABLE "store_orders" ADD COLUMN "store_profile_id" UUID;

-- Backfill: resolve the store from each order's first line item's product.
-- Single-store carts only (mixed-store carts are unsupported). Idempotent —
-- only fills rows where store_profile_id is still NULL.
UPDATE "store_orders" AS so
SET "store_profile_id" = sp.id
FROM (
  SELECT so2.id AS order_id, sp2.id AS store_id
  FROM "store_orders" so2,
       jsonb_array_elements(so2.items::jsonb) WITH ORDINALITY AS arr(item, idx)
  JOIN "store_products" prod ON prod.id = (arr.item ->> 'productId')
  JOIN "store_profiles" sp2 ON sp2.id = prod.store_profile_id
  WHERE so2."store_profile_id" IS NULL
  GROUP BY so2.id, sp2.id
  HAVING MIN(arr.idx) = 1
) AS resolved
WHERE so.id = resolved.order_id AND so."store_profile_id" IS NULL;

CREATE INDEX "store_***REMOVED***" ON "store_orders"("store_profile_id");

ALTER TABLE "store_orders"
  ADD CONSTRAINT "store_***REMOVED***"
  FOREIGN KEY ("store_profile_id") REFERENCES "store_profiles"("id")
  ON DELETE SET NULL;
