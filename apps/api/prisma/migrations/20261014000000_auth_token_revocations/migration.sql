-- Access-token revocation (logout-all / password reset / block / deletion / per-session logout).
-- Additive and idempotent. The API also creates this table lazily on the first revocation
-- and treats it as "nothing revoked" while it is absent, so applying it is optional but
-- avoids a DDL statement on the first logout. Read by middlewares/auth.ts via lib/token-revocation.ts.
CREATE TABLE IF NOT EXISTS "auth_token_revocations" (
  "user_id"     UUID NOT NULL,
  "session_id"  TEXT NOT NULL DEFAULT '',
  "valid_after" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "session_id")
);
