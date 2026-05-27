import { prisma } from './prisma.js';

// Boot-time defensive schema check. Render's start command bypasses our
// `pnpm start` wrapper that runs `prisma migrate deploy`, which means
// pending migrations never apply in prod. Until the dashboard start
// command is fixed (see docs/activation-gates.md), we replay every
// migration table/column the user-facing dashboards touch via
// IF NOT EXISTS DDL on every boot. All statements here are safe to
// run repeatedly — they no-op once the schema matches.
//
// Scope: every table/column hit by provider portals (pandit, store,
// astrologer, wellness, gaushala, temple, admin) + Layer features
// (antim sanskar, content drafts, FCM, B2B orgs, digest opt-out,
// reading progress, user.blocked, gaushala cows/volunteers).

const STATEMENTS: string[] = [
  // users.blocked + companions — auth.ts hot path
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_reason" TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "users_blocked_idx" ON "users" ("blocked") WHERE "blocked" = true`,

  // reading_progress — /api/v1/me/reading-progress
  `CREATE TABLE IF NOT EXISTS "reading_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "book_slug" TEXT NOT NULL,
    "chapter_slug" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "scroll_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_verse" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "reading_progress_user_id_book_slug_key" ON "reading_progress" ("user_id", "book_slug")`,
  `CREATE INDEX IF NOT EXISTS "reading_progress_user_id_idx" ON "reading_progress" ("user_id")`,

  // cows + cow_health_records + volunteers — gaushala portal CRUD
  // (migration 20260519000000_gaushala_cows_volunteers, Render bypasses migrate deploy)
  `CREATE TABLE IF NOT EXISTS "cows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gaushala_id" UUID NOT NULL,
    "tag_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "age_years" INTEGER,
    "gender" TEXT NOT NULL DEFAULT 'female',
    "health_status" TEXT NOT NULL DEFAULT 'healthy',
    "arrival_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cows_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "cows_gaushala_id_tag_number_key" ON "cows" ("gaushala_id", "tag_number")`,
  `CREATE INDEX IF NOT EXISTS "cows_gaushala_id_created_at_idx" ON "cows" ("gaushala_id", "created_at")`,

  `CREATE TABLE IF NOT EXISTS "cow_health_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cow_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_type" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "vet_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cow_health_records_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "cow_health_records_cow_id_recorded_at_idx" ON "cow_health_records" ("cow_id", "recorded_at")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cow_health_records_cow_id_fkey') THEN
      ALTER TABLE "cow_health_records" ADD CONSTRAINT "cow_health_records_cow_id_fkey"
        FOREIGN KEY ("cow_id") REFERENCES "cows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  `CREATE TABLE IF NOT EXISTS "volunteers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gaushala_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'general',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "volunteers_gaushala_id_active_idx" ON "volunteers" ("gaushala_id", "active")`,

  // ─── PROVIDER PROFILES — created via initial db push, never had a migration.
  // If a fresh prod DB skips db push, these wouldn't exist. Defensive replay.

  `CREATE TABLE IF NOT EXISTS "pandit_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "temple_name" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_pujas" INTEGER NOT NULL DEFAULT 0,
    "price_per_puja" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "availability" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pandit_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "pandit_profiles_user_id_key" ON "pandit_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "pandit_profiles_city_idx" ON "pandit_profiles" ("city")`,
  `CREATE INDEX IF NOT EXISTS "pandit_profiles_approved_idx" ON "pandit_profiles" ("approved")`,
  `ALTER TABLE "pandit_profiles" ADD COLUMN IF NOT EXISTS "available_for_antyeshti" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS "pandit_profiles_available_for_antyeshti_idx" ON "pandit_profiles" ("available_for_antyeshti")`,

  `CREATE TABLE IF NOT EXISTS "store_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "store_name" TEXT NOT NULL,
    "gst_number" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "commission" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "store_profiles_user_id_key" ON "store_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "store_profiles_city_idx" ON "store_profiles" ("city")`,
  `CREATE INDEX IF NOT EXISTS "store_profiles_approved_idx" ON "store_profiles" ("approved")`,

  `CREATE TABLE IF NOT EXISTS "astrologer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "experience" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_minute" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "total_consultations" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "astrologer_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "astrologer_profiles_user_id_key" ON "astrologer_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "astrologer_profiles_approved_idx" ON "astrologer_profiles" ("approved")`,

  `CREATE TABLE IF NOT EXISTS "wellness_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "experience" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_session" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "bio" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wellness_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "wellness_profiles_user_id_key" ON "wellness_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "wellness_profiles_approved_idx" ON "wellness_profiles" ("approved")`,

  `CREATE TABLE IF NOT EXISTS "gaushala_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "gaushala_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "total_cows" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gaushala_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "gaushala_profiles_user_id_key" ON "gaushala_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "gaushala_profiles_approved_idx" ON "gaushala_profiles" ("approved")`,

  `CREATE TABLE IF NOT EXISTS "temple_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "temple_name" TEXT NOT NULL,
    "deity" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "total_streams" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "temple_profiles_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "temple_profiles_user_id_key" ON "temple_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "temple_profiles_city_idx" ON "temple_profiles" ("city")`,
  `CREATE INDEX IF NOT EXISTS "temple_profiles_approved_idx" ON "temple_profiles" ("approved")`,

  // ─── PROVIDER_KYC (2026-04-28) — KYC widget on /provider-kyc
  `CREATE TABLE IF NOT EXISTS "provider_kyc" (
    "user_id" UUID PRIMARY KEY,
    "aadhaar_last4" TEXT,
    "aadhaar_hash" TEXT,
    "pan_number" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc" TEXT,
    "bank_holder_name" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "provider_kyc_verified_idx" ON "provider_kyc" ("verified")`,

  // ─── MAY MIGRATIONS — also bypassed by Render. Replay all CREATE TABLEs.

  // 2026-05-02 antim_sanskar
  `CREATE TABLE IF NOT EXISTS "antim_sanskar_bookings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "booking_number" TEXT NOT NULL UNIQUE,
    "deceased_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_relation" TEXT,
    "city" TEXT NOT NULL,
    "preferred_ghat" TEXT,
    "preferred_date" DATE NOT NULL,
    "package_tier" TEXT NOT NULL,
    "package_price_inr" INTEGER NOT NULL,
    "asthi_visarjan_river" TEXT,
    "notes" TEXT,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending_coordinator',
    "assigned_pandit_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_city_idx" ON "antim_sanskar_bookings" ("city")`,
  `CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_preferred_date_idx" ON "antim_sanskar_bookings" ("preferred_date")`,
  `CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_status_idx" ON "antim_sanskar_bookings" ("status")`,

  // 2026-05-02 content_drafts
  `CREATE TABLE IF NOT EXISTS "content_drafts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "approved_at" TIMESTAMPTZ(3),
    "posted_at" TIMESTAMPTZ(3),
    "posted_url" TEXT,
    "rejected_reason" TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS "content_drafts_status_generated_at_idx" ON "content_drafts" ("status", "generated_at")`,
  `CREATE INDEX IF NOT EXISTS "content_drafts_type_idx" ON "content_drafts" ("type")`,

  // 2026-05-02 donation_export_audit + digest_optout
  `CREATE TABLE IF NOT EXISTS "DonationExportAuditLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "exported_by" UUID NOT NULL,
    "from_date" DATE,
    "to_date" DATE,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "DonationExportAuditLog_exported_by_idx" ON "DonationExportAuditLog" ("exported_by", "created_at" DESC)`,
  `CREATE TABLE IF NOT EXISTS "WeeklyDigestOptOut" (
    "user_id" UUID PRIMARY KEY,
    "opted_out_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "WeeklyDigestRun" (
    "id" INTEGER PRIMARY KEY DEFAULT 1,
    "last_run_at" TIMESTAMP(3),
    "last_sent" INTEGER NOT NULL DEFAULT 0,
    "last_skipped" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "weekly_digest_run_singleton" CHECK ("id" = 1)
  )`,

  // 2026-05-02 fcm_notifications
  `CREATE TABLE IF NOT EXISTS "fcm_device_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_token" TEXT NOT NULL UNIQUE,
    "platform" TEXT NOT NULL,
    "language" TEXT,
    "aarti_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "fcm_device_tokens_user_id_idx" ON "fcm_device_tokens" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "temple_follows" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "temple_follows_user_id_temple_id_key" UNIQUE ("user_id", "temple_id")
  )`,
  `CREATE INDEX IF NOT EXISTS "temple_follows_temple_id_idx" ON "temple_follows" ("temple_id")`,

  // 2026-05-02 org_b2b
  `CREATE TABLE IF NOT EXISTS "orgs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "owner_user_id" UUID NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "razorpay_subscription_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "orgs_owner_user_id_idx" ON "orgs" ("owner_user_id")`,
  `CREATE TABLE IF NOT EXISTS "org_members" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "invited_by" UUID,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("org_id", "user_id")
  )`,
  `CREATE INDEX IF NOT EXISTS "org_members_user_id_idx" ON "org_members" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "org_invites" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "invited_by" UUID,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "org_invites_email_idx" ON "org_invites" ("email")`,
  `CREATE INDEX IF NOT EXISTS "org_invites_org_id_idx" ON "org_invites" ("org_id")`,
  `ALTER TABLE "temples" ADD COLUMN IF NOT EXISTS "org_id" UUID`,
  `CREATE INDEX IF NOT EXISTS "temples_org_id_idx" ON "temples" ("org_id")`,

  // Referrals (migration 20260527000000_referrals) — defensive replay so
  // Render boots without a manual `prisma db execute` step.
  `DO $$ BEGIN
    CREATE TYPE "ReferralClaimStatus" AS ENUM ('pending', 'signed_up', 'qualifying', 'rewarded', 'void');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "referral_codes" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,
    "code"       TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_user_id_key') THEN
      ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_key" UNIQUE ("user_id");
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_code_key') THEN
      ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_user_id_fkey') THEN
      ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "referral_claims" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code_id"         UUID NOT NULL,
    "referrer_id"     UUID NOT NULL,
    "referee_id"      UUID,
    "booking_id"      UUID,
    "status"          "ReferralClaimStatus" NOT NULL DEFAULT 'pending',
    "reward_amount"   DECIMAL(10,2),
    "reward_currency" TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "rewarded_at"     TIMESTAMPTZ
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_claims_code_id_fkey') THEN
      ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_code_id_fkey"
        FOREIGN KEY ("code_id") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_claims_referrer_id_fkey') THEN
      ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_referrer_id_fkey"
        FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_claims_referee_id_fkey') THEN
      ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_referee_id_fkey"
        FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "referral_claims_referrer_id_status_idx" ON "referral_claims" ("referrer_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "referral_claims_referee_id_idx" ON "referral_claims" ("referee_id")`,
];

export async function ensureSchemaInvariants(
  log: { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void },
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log.info('ensureSchemaInvariants: DATABASE_URL unset, skipping');
    return;
  }
  let applied = 0;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied += 1;
    } catch (err) {
      // Don't fail boot on schema fix-up — log and continue. The underlying
      // route will surface the real problem if the column genuinely needed
      // creating and this DDL failed.
      log.error(
        { err: err instanceof Error ? err.message : String(err), sql: sql.slice(0, 80) },
        'ensureSchemaInvariants: statement failed',
      );
    }
  }
  log.info(`ensureSchemaInvariants: ${applied}/${STATEMENTS.length} statements ran cleanly`);
}
