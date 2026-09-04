-- AUTH-05 — the single-use ledger behind every magic link.
--
-- WHY THIS TABLE EXISTS
--
-- routes/magic-link.ts said it plainly in its own header: "the token itself is
-- stateless ... Single-use enforcement is by timestamp (15 min TTL) ... for an
-- MVP a 15-min window is acceptable." That stopped being true when PJ-08 added
-- ONBOARDING_TOKEN_TTL_MIN = 72 hours and made the magic link the ONLY
-- credential a partnerships-provisioned provider has (there is no password
-- column on "users"). A three-day link in a forwarded email, a shared inbox, a
-- mail-scanner log or a browser-history entry authenticates as that temple
-- manager or pandit over and over, and no operator action can revoke it —
-- verifyToken only ever re-checks an HMAC and a timestamp, and both keep
-- passing.
--
-- One row per minted token, consumed by one conditional UPDATE at /verify. The
-- row count of that UPDATE is the entire decision.
--
-- WHAT IS STORED, AND WHAT DELIBERATELY IS NOT
--
--   id          sha256 of the token string, hex. NOT the token. A ledger of
--               live credentials in plaintext would be a worse asset than the
--               problem it solves — anyone with read access to this table could
--               sign in as every pending recipient. The hash is enough: /verify
--               re-hashes what it was handed and looks that up.
--   user_email  the address the token was signed over, for support and for
--               revoking a specific person's outstanding links by hand. No FK
--               to "users": /verify CREATES the account on first sign-in, so at
--               mint time there is frequently no row to reference yet, and a FK
--               would make the ledger write fail for exactly the new-provider
--               case this feature is for.
--   expires_at  copied from the signed payload so expired rows can be swept
--               without parsing tokens. It is NOT the authority — verifyToken's
--               own timestamp check still runs first and rejects earlier.
--   consumed_at NULL until used. The single-use flag.
--
-- WHY IT IS SAFE TO APPLY UNATTENDED
--
-- Migrations auto-apply on API boot (render.yaml startCommand ->
-- apps/api/package.json "start": "prisma migrate deploy && node
-- dist/server.js"), so a migration that fails takes the API down and, once
-- recorded FAILED, blocks every later migration until someone runs
-- `prisma migrate resolve` by hand.
--
--   * PURELY ADDITIVE. One new table and two new indexes. No existing table is
--     altered, no column dropped or retyped, no row read, rewritten or deleted.
--     There is no pre-existing data for this DDL to be wrong about.
--   * PLAIN `CREATE INDEX`, NEVER CONCURRENTLY. `prisma migrate deploy` wraps
--     each migration in a transaction; CREATE INDEX CONCURRENTLY inside one
--     fails with 25001 and then blocks every subsequent migration. This repo
--     lost two months to precisely that. On a table this migration just created
--     — zero rows — a plain CREATE INDEX returns in microseconds and the lock
--     it takes is on an object nothing else can yet reference.
--   * EVERY STATEMENT IS `IF NOT EXISTS`, so a partially applied run re-runs
--     cleanly and a database that already grew this table by hand converges
--     rather than aborting.
--   * NO `DO $$` BLOCK, no conditional creation. The duplicate-tolerance dance
--     in 20260824000000_di0607_money_key_indexes exists because those UNIQUE
--     indexes go over tables that already hold unknown production data. Here
--     the table is new in the same statement, so there is nothing to prove
--     clean and a guard would only add ways to be wrong.
--
-- The index names are Prisma's own generated names for the matching
-- `@@index([...])` entries on `model MagicLinkToken` in schema.prisma, so the
-- schema and the database describe the same objects and `prisma migrate dev`
-- reports no drift later.

CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
  "id"          TEXT PRIMARY KEY,
  "user_email"  TEXT NOT NULL,
  "expires_at"  TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sweeping expired rows, and the only column a cleanup job filters on.
CREATE INDEX IF NOT EXISTS "magic_link_tokens_expires_at_idx"
  ON "magic_link_tokens" ("expires_at");

-- "revoke every outstanding link for this address" — the operator action the
-- stateless design could not offer at all.
CREATE INDEX IF NOT EXISTS "magic_link_tokens_user_email_idx"
  ON "magic_link_tokens" ("user_email");
