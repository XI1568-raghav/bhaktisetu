-- 2026-05-21 Sanskrit lessons + streaks + badges
-- Idempotent: safe to apply via `prisma db execute --url $DIRECT_URL`

CREATE TABLE IF NOT EXISTS "user_lesson_progress" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL,
  "lesson_id"    TEXT NOT NULL,
  "score"        INT  NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_lesson_progress_user_id_lesson_id_key"
  ON "user_lesson_progress" ("user_id", "lesson_id");

CREATE INDEX IF NOT EXISTS "user_lesson_progress_user_id_idx"
  ON "user_lesson_progress" ("user_id");

DO $$ BEGIN
  ALTER TABLE "user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "user_streaks" (
  "user_id"         UUID NOT NULL,
  "current_days"    INT  NOT NULL DEFAULT 0,
  "longest_days"    INT  NOT NULL DEFAULT 0,
  "last_active_day" DATE NOT NULL,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id")
);

DO $$ BEGIN
  ALTER TABLE "user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "user_badges" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"   UUID NOT NULL,
  "badge_key" TEXT NOT NULL,
  "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_user_id_badge_key_key"
  ON "user_badges" ("user_id", "badge_key");

CREATE INDEX IF NOT EXISTS "user_badges_user_id_idx"
  ON "user_badges" ("user_id");

DO $$ BEGIN
  ALTER TABLE "user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
