-- Additive and idempotent. The API tolerates every object below being absent and
-- creates the same objects lazily where it has to (ADD COLUMN IF NOT EXISTS /
-- CREATE TABLE IF NOT EXISTS), so applying this before or after is safe.
-- Owner action: `prisma migrate deploy` by hand (migrations do not auto-apply).

-- Donee 80G/PAN for donation receipts (temples had nowhere to store them).
ALTER TABLE "temples" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "temples" ADD COLUMN IF NOT EXISTS "regn_80g" TEXT;
ALTER TABLE "gaushala_profiles" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "gaushala_profiles" ADD COLUMN IF NOT EXISTS "regn_80g" TEXT;

-- Donor details as typed on the donation form.
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "donor_name" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "donor_email" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "donor_phone" TEXT;

-- Retry queue for failed receipt / booking emails (lib/email-outbox.ts).
CREATE TABLE IF NOT EXISTS "email_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dedupe_key" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ref_id" TEXT NOT NULL,
  "to_email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_error" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "sent_at" TIMESTAMPTZ,
  CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_dedupe_key_key" ON "email_outbox" ("dedupe_key");
CREATE INDEX IF NOT EXISTS "email_outbox_status_next_attempt_at_idx" ON "email_outbox" ("status", "next_attempt_at");
