-- P0 #S-08 (2026-07-09): idempotency key on store orders so a double-POST
-- (network retry, double-click past the disabled-button guard) returns the
-- existing order instead of creating a duplicate. Unique per user — a key is
-- only meaningful within one user's checkout attempt.

ALTER TABLE "store_orders" ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "store_***REMOVED***"
  ON "store_orders"("user_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
