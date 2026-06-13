-- Spec: R-Q4-S-007
-- Create table antim_sanskar_pandits for ghat-specialist pandit onboarding pipeline.
-- Apply via:
--   psql "$DATABASE_URL" -f supabase/migrations/20260613000000_antim_sanskar_pandits.sql
-- or
--   pnpm prisma db execute --file supabase/migrations/20260613000000_antim_sanskar_pandits.sql --schema apps/api/prisma/schema.prisma
--
-- founder-action-required:
--   1. Confirm preferred migration tool (supabase CLI vs prisma db execute vs psql).
--   2. Set DATABASE_URL to Supabase DIRECT URL (not pooled) before applying.
--   3. Run apps/api/scripts/check-prod-tables.mjs after apply to verify.

BEGIN;

CREATE TABLE IF NOT EXISTS antim_sanskar_pandits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  primary_ghat text NOT NULL CHECK (primary_ghat IN ('kashi', 'haridwar', 'prayagraj')),
  phone text UNIQUE,
  languages text[] DEFAULT ARRAY['hi']::text[],
  years_experience int,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected')),
  verified_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin write, public denied (read via service role only).
ALTER TABLE antim_sanskar_pandits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS antim_pandits_admin_all ON antim_sanskar_pandits;
CREATE POLICY antim_pandits_admin_all ON antim_sanskar_pandits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS antim_pandits_public_denied ON antim_sanskar_pandits;
CREATE POLICY antim_pandits_public_denied ON antim_sanskar_pandits
  FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS antim_pandits_status_idx
  ON antim_sanskar_pandits (verification_status);

CREATE INDEX IF NOT EXISTS antim_pandits_ghat_idx
  ON antim_sanskar_pandits (primary_ghat);

COMMIT;
