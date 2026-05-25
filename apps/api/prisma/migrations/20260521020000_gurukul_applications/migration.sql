-- 2026-05-21 Gurukul applications table
-- Idempotent: safe to apply via `prisma db execute --url $DIRECT_URL`

CREATE TABLE IF NOT EXISTS "gurukul_applications" (
  "id"                     UUID NOT NULL DEFAULT gen_random_uuid(),
  "program_id"             UUID NOT NULL,
  "applicant_user_id"      UUID NOT NULL,
  "applicant_type"         TEXT NOT NULL,
  "student_name"           TEXT NOT NULL,
  "student_age_years"      INT  NOT NULL,
  "student_email"          TEXT,
  "guardian_name"          TEXT,
  "guardian_relation"      TEXT,
  "guardian_phone"         TEXT,
  "guardian_aadhaar_last4" TEXT,
  "consent_signed"         BOOLEAN NOT NULL DEFAULT false,
  "consent_signed_at"      TIMESTAMP(3),
  "statement"              TEXT NOT NULL,
  "status"                 TEXT NOT NULL DEFAULT 'submitted',
  "forwarded_at"           TIMESTAMP(3),
  "decision_at"            TIMESTAMP(3),
  "decision_note"          TEXT,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gurukul_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gurukul_applications_program_id_status_idx"
  ON "gurukul_applications" ("program_id", "status");

CREATE INDEX IF NOT EXISTS "gurukul_applications_applicant_user_id_idx"
  ON "gurukul_applications" ("applicant_user_id");

DO $$ BEGIN
  ALTER TABLE "gurukul_applications"
    ADD CONSTRAINT "gurukul_applications_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "gurukul_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "gurukul_applications"
    ADD CONSTRAINT "gurukul_applications_applicant_user_id_fkey"
    FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
