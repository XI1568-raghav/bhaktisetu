import { createHash } from 'node:crypto';
import { prisma } from './prisma.js';

// ─────────────────────────────────────────────────────────────────────────
// OPS-07 — READ THIS BEFORE RE-ENABLING THE BOOT-TIME REPLAY.
//
// `prisma migrate deploy` IS THE SCHEMA AUTHORITY. This file is a backstop and
// is INERT IN PRODUCTION. Full reasoning: docs/runbooks/schema-authority.md.
//
// The header that stood here until 2026-08-21 read:
//
//     "Render's start command bypasses our `pnpm start` wrapper that runs
//      `prisma migrate deploy`, which means pending migrations never apply in
//      prod."
//
// That premise is false, and `render.yaml` disproves it on its face:
//
//     startCommand: pnpm --filter @poojly/api start
//     apps/api/package.json  "start": "prisma migrate deploy && node dist/server.js"
//
// `prisma migrate deploy` runs first, to completion, BEFORE the Node process
// exists. Whatever it applies is the schema. This file then ran ~95 more DDL
// statements against the same database with no declared winner between them.
//
// That is not harmless. Prisma writes plain, non-idempotent DDL — e.g.
// `20260511_user_blocked/migration.sql` does `ALTER TABLE "users" ADD COLUMN
// "blocked"` and `CREATE INDEX "users_blocked_idx"`, both of which this file
// also creates with IF NOT EXISTS. On any database where the replay reached
// those objects before Prisma had recorded that migration, `migrate deploy`
// aborts (42701 / 42P07), `&&` short-circuits, `node dist/server.js` never
// starts, and the container crash-loops — with the migration now recorded
// FAILED, which blocks every later migration until someone runs
// `prisma migrate resolve` by hand.
//
// So: in production this replay does nothing unless an operator sets
// SCHEMA_INVARIANTS_FORCE=true for a deliberate recovery. Outside production
// (local dev, CI, a shell with no migrate-deploy wrapper) it still runs, which
// is where it was always genuinely useful.
//
// The statements stay. They are the documented recovery path for a database
// that has drifted, and they are the only in-repo description of the tables
// that were created by the original `prisma db push` and never got a migration
// (there is NO baseline migration in apps/api/prisma/migrations — see the
// runbook). Adding to them is not a substitute for writing a migration.
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
  `CREATE UNIQUE INDEX IF NOT EXISTS "store_***REMOVED***" ON "store_profiles" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "store_profiles_city_idx" ON "store_profiles" ("city")`,
  `CREATE INDEX IF NOT EXISTS "store_***REMOVED***" ON "store_profiles" ("approved")`,

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

  // ─────────────────────────────────────────────────────────────────
  // EmailSession w/ expiresAt + revokedAt (Phase C P1 #5, 2026-06-08).
  // Powers /auth/logout server-side revocation + middleware enforcement.
  // ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "email_sessions" (
    "id"         TEXT PRIMARY KEY,
    "user_id"    UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_sessions_user_id_fkey') THEN
      ALTER TABLE "email_sessions" ADD CONSTRAINT "email_sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "email_sessions_user_id_expires_at_idx"
    ON "email_sessions" ("user_id", "expires_at")`,
  `CREATE INDEX IF NOT EXISTS "email_sessions_expires_at_idx"
    ON "email_sessions" ("expires_at") WHERE "revoked_at" IS NULL`,

  // ─────────────────────────────────────────────────────────────────
  // RefreshTokenJTI single-use ledger (Phase C P1 #4, 2026-06-08).
  // Detects refresh-token replay; revokes family on reuse.
  // ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "refresh_token_jtis" (
    "jti"        TEXT PRIMARY KEY,
    "user_id"    UUID NOT NULL,
    "issued_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "used_at"    TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_token_jtis_user_id_fkey') THEN
      ALTER TABLE "refresh_token_jtis" ADD CONSTRAINT "refresh_token_jtis_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "refresh_token_jtis_user_id_expires_at_idx"
    ON "refresh_token_jtis" ("user_id", "expires_at")`,
  `CREATE INDEX IF NOT EXISTS "refresh_token_jtis_used_at_idx"
    ON "refresh_token_jtis" ("used_at") WHERE "used_at" IS NOT NULL`,

  // ─────────────────────────────────────────────────────────────────
  // astrologer_consultations composite indexes (Phase D P1 #6, 2026-06-08).
  // Speeds up /consultation/admin/all ORDER BY scheduled_at and per-user history.
  // Wrapped in to_regclass guard — table only exists in stacks where consultation
  // routes have been deployed; skip cleanly on cold-start before table created.
  // ─────────────────────────────────────────────────────────────────
  `DO $$ BEGIN
    IF to_regclass('public.astrologer_consultations') IS NOT NULL THEN
      CREATE INDEX IF NOT EXISTS "astrologer_consultations_sched_idx"
        ON "astrologer_consultations"
        USING btree ((COALESCE("scheduled_at", "created_at")) DESC NULLS LAST);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF to_regclass('public.astrologer_consultations') IS NOT NULL THEN
      CREATE INDEX IF NOT EXISTS "astrologer_consultations_user_status_idx"
        ON "astrologer_consultations" ("user_id", "status", "created_at" DESC);
    END IF;
  END $$`,

  // ─────────────────────────────────────────────────────────────────
  // astrologer_slug_map — public slug → Supabase user UUID resolver
  // (Phase #10, 2026-06-08). Populated lazily on admin KYC approval.
  // Resolver lib: apps/api/src/lib/astrologer-resolver.ts
  // ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "astrologer_slug_map" (
    "slug"        TEXT PRIMARY KEY,
    "user_id"     UUID NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'astrologer_slug_map_user_id_fkey') THEN
      ALTER TABLE "astrologer_slug_map" ADD CONSTRAINT "astrologer_slug_map_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "astrologer_slug_map_user_id_idx"
    ON "astrologer_slug_map" ("user_id")`,

  // ─────────────────────────────────────────────────────────────────
  // DPDP compliance — consent_log + dsar_requests
  // Roadmap R-Q3-L-001 (2026-06-14). Routes: apps/api/src/routes/dpdp.ts
  // ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "consent_log" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID NOT NULL,
    "purpose"     TEXT NOT NULL,
    "action"      TEXT NOT NULL,
    "source"      TEXT,
    "ip_address"  TEXT,
    "user_agent"  TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "consent_log_user_purpose_idx"
    ON "consent_log" ("user_id", "purpose", "created_at" DESC)`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consent_log_user_id_fkey') THEN
      ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  `CREATE TABLE IF NOT EXISTS "dsar_requests" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"          UUID NOT NULL,
    "kind"             TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "note"             TEXT,
    "sla_deadline"     TIMESTAMPTZ NOT NULL,
    "resolved_at"      TIMESTAMPTZ,
    "resolution_note"  TEXT,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "dsar_requests_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "dsar_requests_user_idx"
    ON "dsar_requests" ("user_id", "created_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "dsar_requests_sla_idx"
    ON "dsar_requests" ("sla_deadline") WHERE "resolved_at" IS NULL`,
  `DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dsar_requests_user_id_fkey') THEN
      ALTER TABLE "dsar_requests" ADD CONSTRAINT "dsar_requests_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $`,

  // ─────────────────────────────────────────────────────────────────
  // LC-DEL — in-app account deletion (2026-09-03).
  // Apple Guideline 5.1.1(v) + Google Play both require it. Mirror of
  // migrations/20260903000000_account_deletion, replayed here for the same
  // reason every other table above is: Render's start command has historically
  // bypassed migrate deploy, and a missing table turns the deletion surface
  // into a 500 on a legally mandated flow.
  //
  // columns are the tombstone state. See the service for why.
  // ─────────────────────────────────────────────────────────────────
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMPTZ`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_purge_after" TIMESTAMPTZ`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS "users_deletion_purge_after_idx"
    ON "users" ("deletion_purge_after")
    WHERE "deleted_at" IS NULL AND "deletion_purge_after" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "users_deleted_at_idx"
    ON "users" ("deleted_at") WHERE "deleted_at" IS NOT NULL`,

  // 80G(5)/Form 10BE require the donor's NAME beside the PAN. The receipt
  // generator reads user.fullName live, so the name has to be frozen onto the
  // donation before the user row becomes a tombstone.
  `ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "donor_name_snapshot" TEXT`,

  `CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         UUID NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'pending_confirmation',
    "code_hash"       TEXT,
    "code_expires_at" TIMESTAMPTZ,
    "code_attempts"   INTEGER NOT NULL DEFAULT 0,
    "channel"         TEXT,
    "reason"          TEXT,
    "requested_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "confirmed_at"    TIMESTAMPTZ,
    "purge_after"     TIMESTAMPTZ,
    "purged_at"       TIMESTAMPTZ,
    "cancelled_at"    TIMESTAMPTZ,
    "warnings"        JSONB,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "account_deletion_requests_user_idx"
    ON "account_deletion_requests" ("user_id", "created_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "account_deletion_requests_due_idx"
    ON "account_deletion_requests" ("purge_after") WHERE "status" = 'scheduled'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_requests_one_live_per_user"
    ON "account_deletion_requests" ("user_id")
    WHERE "status" IN ('pending_confirmation', 'scheduled')`,
  `DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_deletion_requests_user_id_fkey') THEN
      ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END $`,
];

/**
 * SCAL-07 (2026-08-13): replay only when the statement set has actually changed.
 *
 * Every one of these statements is a no-op once the schema matches, but each
 * one still costs a full round trip — ~95 ms Oregon↔Tokyo, so ~7.6 s of pure
 * network wait on EVERY boot, before `bootstrap()` registers a route, on top of
 * Render free's 30–60 s spin-up and under Cloudflare's 100 s origin timeout.
 * `ALTER TABLE … ADD COLUMN IF NOT EXISTS` also takes an ACCESS EXCLUSIVE lock
 * even when it no-ops, so all 80 briefly locked most tables on every restart —
 * including during a deploy, on top of live traffic.
 *
 * They cannot simply be deleted: this file exists because `prisma migrate
 * deploy` was once bypassed, and it is still the recovery path. So instead of
 * dropping the safety net we stop paying for it when it is already satisfied —
 * a fingerprint of the statement array is stored in `_schema_invariants` and
 * checked with ONE query. Change any statement and the fingerprint changes, so
 * the new one is applied on the next boot with no manual step. Set
 * SCHEMA_INVARIANTS_FORCE=true to replay everything by hand.
 *
 * The marker is written ONLY when all statements ran cleanly. A boot where one
 * failed must not record "schema is good" — the next boot has to retry it.
 */
export const SCHEMA_INVARIANTS_FINGERPRINT = createHash('sha256')
  .update(STATEMENTS.join('\n;\n'))
  .digest('hex');

/**
 * The replay set, exported so a guard can reason about WHICH objects this file
 * touches without scraping its source text. Scraping would count a
 * commented-out statement as live; the array cannot.
 */
export const SCHEMA_INVARIANT_STATEMENTS: readonly string[] = STATEMENTS;

/** Who owns the schema. Not a preference — see the header and the runbook. */
export const SCHEMA_AUTHORITY = 'prisma migrate deploy' as const;

export interface SchemaReplayDecision {
  replay: boolean;
  authority: typeof SCHEMA_AUTHORITY;
  reason: 'no-database-url' | 'authority-owns-production' | 'forced' | 'non-production';
}

/**
 * OPS-07 — should the boot-time replay run at all?
 *
 * Pure, and exported, so the decision can be asserted directly instead of being
 * inferred from how many queries a mock happened to receive.
 */
export function schemaReplayDecision(
  env: Partial<Record<string, string | undefined>> = process.env,
): SchemaReplayDecision {
  if (!env.DATABASE_URL) {
    return { replay: false, authority: SCHEMA_AUTHORITY, reason: 'no-database-url' };
  }
  if (env.SCHEMA_INVARIANTS_FORCE === 'true') {
    return { replay: true, authority: SCHEMA_AUTHORITY, reason: 'forced' };
  }
  if (env.NODE_ENV === 'production') {
    return { replay: false, authority: SCHEMA_AUTHORITY, reason: 'authority-owns-production' };
  }
  return { replay: true, authority: SCHEMA_AUTHORITY, reason: 'non-production' };
}

const MARKER_TABLE = '_schema_invariants';

/**
 * Postgres codes that mean "the thing this statement wanted already exists":
 * 42P07 duplicate_table (covers indexes), 42701 duplicate_column,
 * 42710 duplicate_object (constraints, types). Nothing else counts.
 */
const DUPLICATE_OBJECT_CODES = ['42P07', '42701', '42710'];

export function isDuplicateObjectError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { meta?: { code?: unknown } })?.meta?.code;
  if (typeof code === 'string' && DUPLICATE_OBJECT_CODES.includes(code)) return true;
  // Prisma flattens the driver error into the message for $executeRawUnsafe.
  return DUPLICATE_OBJECT_CODES.some((c) => message.includes(`Code: \`${c}\``));
}

async function recordedFingerprint(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ fingerprint: string }>>(
      `SELECT fingerprint FROM "${MARKER_TABLE}" WHERE id = 1 LIMIT 1`,
    );
    return rows?.[0]?.fingerprint ?? null;
  } catch {
    // No marker table yet (first boot after this change, or a fresh DB).
    return null;
  }
}

async function recordFingerprint(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${MARKER_TABLE}" (
      id INTEGER PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${MARKER_TABLE}" (id, fingerprint, applied_at)
     VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET fingerprint = EXCLUDED.fingerprint, applied_at = now()`,
    SCHEMA_INVARIANTS_FINGERPRINT,
  );
}

export async function ensureSchemaInvariants(
  log: { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void },
): Promise<void> {
  const decision = schemaReplayDecision(process.env);

  if (decision.reason === 'no-database-url') {
    log.info('ensureSchemaInvariants: DATABASE_URL unset, skipping');
    return;
  }

  // OPS-07 — in production `prisma migrate deploy` has already run to
  // completion in the start command, and it is the authority. Replaying DDL
  // behind it is how a plain `ADD COLUMN` in a future migration turns into a
  // 42701 crash-loop. Say so out loud; a silent skip is how the previous
  // premise survived unexamined for months.
  if (!decision.replay) {
    log.info(
      `ensureSchemaInvariants: skipped — ${decision.authority} is the schema authority in ` +
        `production and has already run (apps/api/package.json "start"). Set ` +
        `SCHEMA_INVARIANTS_FORCE=true for a deliberate recovery replay of ` +
        `${STATEMENTS.length} statements. See docs/runbooks/schema-authority.md.`,
    );
    return;
  }

  const force = process.env.SCHEMA_INVARIANTS_FORCE === 'true';
  if (!force) {
    const seen = await recordedFingerprint();
    if (seen === SCHEMA_INVARIANTS_FINGERPRINT) {
      log.info(
        `ensureSchemaInvariants: schema fingerprint ${seen.slice(0, 12)} already applied, ` +
          `skipping ${STATEMENTS.length} statements (1 round trip instead of ${STATEMENTS.length})`,
      );
      return;
    }
  }

  let applied = 0;
  let alreadySatisfied = 0;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied += 1;
    } catch (err) {
      // A duplicate-object error means the object this statement wanted is
      // already there — the invariant HOLDS, the statement just could not
      // express it as IF NOT EXISTS (a `DO $$` block adding a constraint whose
      // name is already taken by an index, for instance). Observed live on the
      // local database: 2 of 95 statements fail this way every boot. Counting
      // them as unsatisfied would mean the fingerprint is never recorded and
      // the full 95-statement replay runs forever — the exact cost SCAL-07 is
      // about. A REAL failure (permissions, syntax, a missing dependency) still
      // blocks the marker so the next boot retries.
      if (isDuplicateObjectError(err)) {
        alreadySatisfied += 1;
        continue;
      }
      // Don't fail boot on schema fix-up — log and continue. The underlying
      // route will surface the real problem if the column genuinely needed
      // creating and this DDL failed.
      log.error(
        { err: err instanceof Error ? err.message : String(err), sql: sql.slice(0, 80) },
        'ensureSchemaInvariants: statement failed',
      );
    }
  }
  log.info(
    `ensureSchemaInvariants: ${applied}/${STATEMENTS.length} statements ran cleanly` +
      (alreadySatisfied > 0 ? ` (+${alreadySatisfied} already satisfied)` : ''),
  );

  // OPS-07 — per-statement errors are logged above, but a boot log with 95
  // info lines and two scattered errors reads as fine. One summary line at
  // error level, naming the count, is the difference between "someone will
  // notice" and "nobody did". This does NOT abort the boot: the schema
  // authority is `prisma migrate deploy`, which already crash-loops the
  // container when IT fails, and this replay is a backstop that must not be
  // able to take the service down on its own.
  const failed = STATEMENTS.length - applied - alreadySatisfied;
  if (failed > 0) {
    log.error(
      { failed, total: STATEMENTS.length },
      `ensureSchemaInvariants: ${failed} statement(s) FAILED — the schema may be incomplete ` +
        'and the marker was NOT recorded, so this replays on the next boot. The authority is ' +
        '`prisma migrate deploy`; see docs/runbooks/schema-authority.md.',
    );
  }

  if (applied + alreadySatisfied === STATEMENTS.length) {
    try {
      await recordFingerprint();
    } catch (err) {
      // Marker is an optimisation. Failing to write it costs the next boot the
      // full replay — never correctness.
      log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'ensureSchemaInvariants: could not record fingerprint (will replay next boot)',
      );
    }
  }
}
