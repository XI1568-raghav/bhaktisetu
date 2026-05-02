-- 80G donation CSV export audit + weekly devotee digest opt-out.
--
-- DonationExportAuditLog: one row per admin CSV download, retained
-- indefinitely for tax/audit traceability. We log who, when, the date
-- range queried, the row count returned, and the IP for forensics.
--
-- WeeklyDigestOptOut: side-table for opting OUT of the weekly digest.
-- We use opt-out (not opt-in) because (a) digest is a brand-engagement
-- email opted-into implicitly at signup per ToS, and (b) the Prisma
-- client occasionally lags schema on Windows due to DLL locks, so a
-- side-table avoids forcing a regenerate to add a User column.

CREATE TABLE IF NOT EXISTS "DonationExportAuditLog" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exported_by" uuid NOT NULL,
  "from_date"   date,
  "to_date"     date,
  "row_count"   integer NOT NULL DEFAULT 0,
  "ip_address"  text,
  "created_at"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DonationExportAuditLog_exported_by_idx"
  ON "DonationExportAuditLog"("exported_by", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "WeeklyDigestOptOut" (
  "user_id"    uuid PRIMARY KEY,
  "opted_out_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason"     text,

  CONSTRAINT "WeeklyDigestOptOut_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Track when the weekly digest job last ran. Single-row table.
CREATE TABLE IF NOT EXISTS "WeeklyDigestRun" (
  "id"             integer PRIMARY KEY DEFAULT 1,
  "last_run_at"    timestamp(3),
  "last_sent"      integer NOT NULL DEFAULT 0,
  "last_skipped"   integer NOT NULL DEFAULT 0,
  CONSTRAINT "weekly_digest_run_singleton" CHECK ("id" = 1)
);
