-- Admin "hide rating" side table (lib/review-moderation.ts).
-- Additive and idempotent: the API still creates this table lazily on the first
-- hide when this migration has not been applied, and the DDL below is identical,
-- so applying it before or after that lazy create is safe. Owner action:
-- `prisma migrate deploy` by hand (migrations do not auto-apply on deploy).
CREATE TABLE IF NOT EXISTS "review_moderation" (
  "review_id" UUID NOT NULL,
  "hidden_by" UUID,
  "reason" TEXT,
  "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_moderation_pkey" PRIMARY KEY ("review_id")
);
