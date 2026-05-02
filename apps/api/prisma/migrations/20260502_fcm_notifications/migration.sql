-- Layer AE: FCM aarti push notifications.
-- Stores per-device FCM tokens + temple follows for 15-min-before-aarti pushes.

CREATE TABLE IF NOT EXISTS "fcm_device_tokens" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID NOT NULL,
  "device_token"  TEXT NOT NULL UNIQUE,
  "platform"      TEXT NOT NULL,
  "language"      TEXT,
  "aarti_opt_in"  BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "fcm_device_tokens_user_id_idx"
  ON "fcm_device_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "temple_follows" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL,
  "temple_id"   UUID NOT NULL,
  "created_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "temple_follows_user_id_temple_id_key" UNIQUE ("user_id", "temple_id")
);

CREATE INDEX IF NOT EXISTS "temple_follows_temple_id_idx"
  ON "temple_follows" ("temple_id");
