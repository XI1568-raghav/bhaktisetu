-- P0 #S-04 / wp-03 (2026-07-09): Commission rows can now back a store order
-- OR a wellness enrollment instead of a puja booking. booking_id was NOT NULL
-- + the only foreign key, so store orders + wellness enrollments never got a
-- Commission row (payouts were never written). All three keys are now nullable
-- (exactly one is set per row, enforced at the app layer). Existing rows keep
-- booking_id populated.

ALTER TABLE "commissions" ALTER COLUMN "booking_id" DROP NOT NULL;
ALTER TABLE "commissions" ADD COLUMN "store_order_id" TEXT;
ALTER TABLE "commissions" ADD COLUMN "wellness_enrollment_id" TEXT;

CREATE INDEX "commissions_store_order_id_idx" ON "commissions"("store_order_id");
CREATE INDEX "commissions_wellness_enrollment_id_idx" ON "commissions"("wellness_enrollment_id");
