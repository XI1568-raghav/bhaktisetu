-- 2026-05-21 Gurukul marketplace — gurukuls + gurukul_programs tables
-- Idempotent: safe to apply via `prisma db execute --url $DIRECT_URL`

CREATE TABLE IF NOT EXISTS "gurukuls" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug"             TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "city"             TEXT NOT NULL,
  "state"            TEXT NOT NULL,
  "country"          TEXT NOT NULL DEFAULT 'IN',
  "website_url"      TEXT,
  "contact_email"    TEXT NOT NULL,
  "contact_verified" BOOLEAN NOT NULL DEFAULT false,
  "contact_phone"    TEXT,
  "tradition"        TEXT NOT NULL,
  "is_residential"   BOOLEAN NOT NULL DEFAULT false,
  "is_online"        BOOLEAN NOT NULL DEFAULT false,
  "accepts_minors"   BOOLEAN NOT NULL DEFAULT false,
  "is_verified"      BOOLEAN NOT NULL DEFAULT false,
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "owner_id"         UUID,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gurukuls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gurukuls_slug_key"          ON "gurukuls" ("slug");
CREATE INDEX        IF NOT EXISTS "gurukuls_state_city_idx"     ON "gurukuls" ("state", "city");
CREATE INDEX        IF NOT EXISTS "gurukuls_tradition_idx"      ON "gurukuls" ("tradition");

DO $$ BEGIN
  ALTER TABLE "gurukuls"
    ADD CONSTRAINT "gurukuls_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "gurukul_programs" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "gurukul_id"      UUID NOT NULL,
  "name"            TEXT NOT NULL,
  "duration_months" INT  NOT NULL,
  "mode_of_study"   TEXT NOT NULL,
  "age_min"         INT  NOT NULL DEFAULT 0,
  "age_max"         INT  NOT NULL DEFAULT 0,
  "description"     TEXT NOT NULL,
  "fee_annual_inr"  INT,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gurukul_programs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gurukul_programs_gurukul_id_idx" ON "gurukul_programs" ("gurukul_id");

DO $$ BEGIN
  ALTER TABLE "gurukul_programs"
    ADD CONSTRAINT "gurukul_programs_gurukul_id_fkey"
    FOREIGN KEY ("gurukul_id") REFERENCES "gurukuls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
