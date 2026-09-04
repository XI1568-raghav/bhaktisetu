-- P0 #S-11 (2026-07-09): StoreOrder <-> StoreProfile attribution FK.
-- Previously a StoreOrder had no direct store link; attribution was inferred
-- from the first line item's product (breaks for mixed-store carts, makes
-- owner-scoped order queries impossible — see S-15). Nullable + ON DELETE SET
-- NULL so historical orders survive a store-profile removal.

ALTER TABLE "store_orders" ADD COLUMN "store_profile_id" UUID;

-- Backfill: resolve the store from each order's first line item's product.
-- Single-store carts only (mixed-store carts are unsupported). Idempotent —
-- only fills rows where store_profile_id is still NULL.
--
-- 2026-09-02: the SET read `sp.id`. `sp` is not in scope — the derived table
-- is `resolved`, and `sp2` only exists inside it — so PostgreSQL raised 42P01
-- at parse-analysis time regardless of data, and this statement had therefore
-- never executed anywhere. Production's ledger row for this migration is
-- applied_steps_count = 0 (hand-resolved), and its store_orders table was
-- empty when this was found, so nothing was left unattributed by it.
--
-- The comma binds so2 to `arr JOIN prod JOIN sp2` rather than to prod/sp2
-- directly, which reads oddly but is the intended query: a set-returning
-- function in FROM is implicitly LATERAL, so `arr` still correlates to so2.
-- Measured identical to an explicit CROSS JOIN LATERAL on single-store,
-- mixed-cart, and deleted-first-product fixtures.
--
-- Left fragile on purpose: `(item ->> 'productId')::uuid` raises 22P02 on a
-- non-uuid productId, and checkout used to accept catalogue handles like
-- `prod_015` (see routes/store-orders.ts). Nothing runs this against rows —
-- scripts/bootstrap-fresh-db.mjs only ever replays it onto an empty database.
-- A real backfill of a populated database needs that guard added first.
UPDATE "store_orders" AS so
SET "store_profile_id" = resolved.store_id
FROM (
  SELECT so2.id AS order_id, sp2.id AS store_id
  FROM "store_orders" so2,
       jsonb_array_elements(so2.items::jsonb) WITH ORDINALITY AS arr(item, idx)
  JOIN "store_products" prod ON prod.id = ((arr.item ->> 'productId')::uuid)
  JOIN "store_profiles" sp2 ON sp2.id = prod.store_profile_id
  WHERE so2."store_profile_id" IS NULL
  GROUP BY so2.id, sp2.id
  HAVING MIN(arr.idx) = 1
) AS resolved
WHERE so.id = resolved.order_id AND so."store_profile_id" IS NULL;

CREATE INDEX "store_orders_store_profile_id_idx" ON "store_orders"("store_profile_id");

ALTER TABLE "store_orders"
  ADD CONSTRAINT "store_orders_store_profile_id_fkey"
  FOREIGN KEY ("store_profile_id") REFERENCES "store_profiles"("id")
  ON DELETE SET NULL;
