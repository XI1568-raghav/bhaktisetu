-- Layer AM — Multi-tenant Org accounts (B2B SaaS for Temple Trusts)
-- Why raw SQL: keeps migration on a stable footing without forcing a
-- prisma generate cycle (Windows DLL-lock workaround used elsewhere
-- in the repo).

CREATE TABLE IF NOT EXISTS "orgs" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          text NOT NULL,
  "slug"          text NOT NULL UNIQUE,
  "owner_user_id" uuid NOT NULL,
  "plan"          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  "razorpay_subscription_id" text,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "orgs_owner_user_id_idx" ON "orgs" ("owner_user_id");

CREATE TABLE IF NOT EXISTS "org_members" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL REFERENCES "orgs"(id) ON DELETE CASCADE,
  "user_id"     uuid NOT NULL,
  "role"        text NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
  "invited_by"  uuid,
  "joined_at"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("org_id","user_id")
);

CREATE INDEX IF NOT EXISTS "org_members_user_id_idx" ON "org_members" ("user_id");

CREATE TABLE IF NOT EXISTS "org_invites" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL REFERENCES "orgs"(id) ON DELETE CASCADE,
  "email"       text NOT NULL,
  "role"        text NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
  "token"       text NOT NULL UNIQUE,
  "invited_by"  uuid,
  "expires_at"  timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "org_invites_email_idx" ON "org_invites" ("email");
CREATE INDEX IF NOT EXISTS "org_invites_org_id_idx" ON "org_invites" ("org_id");

-- Optional Temple linkage. Soft FK — the temples table already exists.
ALTER TABLE "temples" ADD COLUMN IF NOT EXISTS "org_id" uuid;
CREATE INDEX IF NOT EXISTS "temples_org_id_idx" ON "temples" ("org_id");
