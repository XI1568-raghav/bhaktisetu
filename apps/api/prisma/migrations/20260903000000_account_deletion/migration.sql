-- LC-DEL (2026-09-03): in-app account deletion.
--
-- Apple Guideline 5.1.1(v) and Google Play's "Data deletion" policy both make
-- in-app account deletion mandatory for any app that offers account creation.
-- Darshya had none. This migration adds the storage that surface needs.
--
-- ─── WHY THE `users` ROW IS NEVER DELETED ────────────────────────────────────
--
-- `DELETE FROM users` is both impossible and destructive here:
--
--   * IMPOSSIBLE — puja_bookings.user_id, payments.user_id and
--     subscriptions.user_id are required relations with Prisma's default
--     referential action (RESTRICT). The delete raises a foreign-key error the
--     moment the account has one booking.
--   * DESTRUCTIVE — donations.user_id, store_orders.user_id and
--     wellness_enrollments.user_id are ON DELETE CASCADE. A successful delete
--     would silently destroy donation receipts, order records and paid
--     enrollments, which Indian income-tax and accounting rules require be
--     retained for years.
--
-- So the account is ANONYMISED IN PLACE: the `users` row survives as a
-- tombstone with every personal column nulled, `blocked = true` (which the
-- existing auth gate in middlewares/auth.ts already enforces), and every role
-- assignment revoked. Financial rows keep pointing at it, so the ledger stays
-- referentially whole while the identity behind it is gone.
--
-- ⚠ NO `CREATE INDEX CONCURRENTLY` IN THIS FILE, EVER. `prisma migrate deploy`
-- wraps each migration in a transaction; CONCURRENTLY inside a transaction
-- fails with SQLSTATE 25001 and then blocks every migration queued after it.
-- These tables are small and the indexes below are plain CREATE INDEX.

-- ─── 1. TOMBSTONE COLUMNS ON users ───────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_purge_after"  TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at"            TIMESTAMPTZ;

-- The purge sweep's only predicate: "scheduled, not yet purged, due now".
-- Partial so it indexes the handful of pending rows, not the whole user base.
CREATE INDEX IF NOT EXISTS "users_deletion_purge_after_idx"
  ON "users" ("deletion_purge_after")
  WHERE "deleted_at" IS NULL AND "deletion_purge_after" IS NOT NULL;

-- Every list/search surface will want to exclude tombstones.
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx"
  ON "users" ("deleted_at")
  WHERE "deleted_at" IS NOT NULL;

-- ─── 2. 80G DONOR-NAME SNAPSHOT ──────────────────────────────────────────────
--
-- routes/donations.ts builds the 80G receipt with `donorName: user.fullName`,
-- read live at generation time. Once the user row is a tombstone that reads
-- "Deleted User", every receipt reissued for a PAST donation would carry the
-- wrong donor name — a defective tax document, not merely a redacted one.
-- Section 80G(5)(viii)/Form 10BE require the donor's name and PAN on the
-- certificate, so the name has to be frozen onto the donation row BEFORE the
-- user row is scrubbed. Written only for donations that were actually paid and
-- actually got a receipt number; NULL everywhere else.
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "donor_name_snapshot" TEXT;

-- ─── 3. account_deletion_requests ────────────────────────────────────────────
--
-- One row per deletion request. Holds the confirmation challenge (hashed, never
-- plaintext — same doctrine as magic_link_tokens), the grace-period deadline,
-- and the terminal outcome, so GET /account/deletion-status has an authority and
-- an operator can prove after the fact that an erasure was honoured.
CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           UUID NOT NULL,
  -- pending_confirmation | scheduled | purged | cancelled | expired
  "status"            TEXT NOT NULL DEFAULT 'pending_confirmation',
  -- sha256 hex of the 6-digit confirmation code. NEVER the code itself: a
  -- plaintext column here would be a live credential for irreversible deletion
  -- readable by anyone with SELECT on the table.
  "code_hash"         TEXT,
  "code_expires_at"   TIMESTAMPTZ,
  "code_attempts"     INTEGER NOT NULL DEFAULT 0,
  -- 'whatsapp' | 'email' | 'dev' — which rail the code went out on.
  "channel"           TEXT,
  "reason"            TEXT,
  "requested_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "confirmed_at"      TIMESTAMPTZ,
  "purge_after"       TIMESTAMPTZ,
  "purged_at"         TIMESTAMPTZ,
  "cancelled_at"      TIMESTAMPTZ,
  -- Non-fatal problems hit during the purge (a legacy table that does not exist
  -- on this database, a Supabase admin call that failed). Kept so a retry has
  -- something to act on rather than a log line nobody reads.
  "warnings"          JSONB,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "account_deletion_requests_user_idx"
  ON "account_deletion_requests" ("user_id", "created_at" DESC);

-- The sweep reads "scheduled and due"; partial keeps it tiny.
CREATE INDEX IF NOT EXISTS "account_deletion_requests_due_idx"
  ON "account_deletion_requests" ("purge_after")
  WHERE "status" = 'scheduled';

-- At most one live request per user. Two concurrent POSTs would otherwise mint
-- two challenges and leave the status endpoint with no single answer.
CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_requests_one_live_per_user"
  ON "account_deletion_requests" ("user_id")
  WHERE "status" IN ('pending_confirmation', 'scheduled');

-- Added the same guarded way migration 20260828100000 adds its foreign key:
-- skipped if already present, and the whole block is exception-swallowed so a
-- surprise here cannot abort API boot (migrations run in the start command,
-- `prisma migrate deploy && node dist/server.js`).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_deletion_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "account_deletion_requests"
      ADD CONSTRAINT "account_deletion_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
