-- P0 #wp-02 (2026-07-10): persist the Razorpay order id on a wellness
-- enrollment at enroll time so the verify handler can reject an order-id
-- mismatch (a stale/cancelled order id submitted by the client marking a
-- NEW enrollment PAID). Mirrors donations.razorpay_order_id /
-- astrologer_consultations.razorpay_order_id.
--
-- Nullable: existing PENDING_PAYMENT rows (none in prod at 2026-07-10) have
-- no order id; verify rejects a null stored order with 400 (cannot verify an
-- order we never recorded). New enrollments always populate it.
--
-- Idempotent re-run safe (ADD COLUMN IF NOT EXISTS).

ALTER TABLE "wellness_enrollments" ADD COLUMN IF NOT EXISTS "razorpay_order_id" TEXT;

CREATE INDEX IF NOT EXISTS "wellness_enrollments_razorpay_order_id_idx"
  ON "wellness_enrollments" ("razorpay_order_id")
  WHERE "razorpay_order_id" IS NOT NULL;
