-- Donation: durable storage for gaushala donations + 80G receipts.
-- Replaces an in-memory Map that lost rows on every Render restart.
-- gaushala_id is a free-form string (not a UUID FK) because gaushala
-- profiles may be deleted while donation history must remain for tax-
-- receipt traceability.

CREATE TYPE "DonationStatus" AS ENUM ('created', 'paid', 'failed');

CREATE TABLE "donations" (
  "id"                 text PRIMARY KEY,
  "user_id"            uuid NOT NULL,
  "gaushala_id"        text NOT NULL,
  "amount_inr"         numeric(10, 2) NOT NULL,
  "razorpay_order_id"  text NOT NULL,
  "razorpay_payment_id" text,
  "receipt_number"     text,
  "status"             "DonationStatus" NOT NULL DEFAULT 'created',
  "created_at"         timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at"            timestamp(3),

  CONSTRAINT "donations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "donations_razorpay_order_id_key"
  ON "donations"("razorpay_order_id");

CREATE UNIQUE INDEX "donations_receipt_number_key"
  ON "donations"("receipt_number");

CREATE INDEX "donations_user_id_created_at_idx"
  ON "donations"("user_id", "created_at");

CREATE INDEX "donations_gaushala_id_created_at_idx"
  ON "donations"("gaushala_id", "created_at");
