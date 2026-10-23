-- ops/sql/activate-pending-providers-2026-10.sql
--
-- NOT RUN. For owner review. Run through the prod-db-task workflow (single
-- transaction, ON_ERROR_STOP, dry-run ends in ROLLBACK). No BEGIN/COMMIT here,
-- and no DDL: every statement is a guarded UPDATE/INSERT.
--
-- Why: the owner removed admin approval for every non-devotee role
-- (REQUIRE_PROVIDER_APPROVAL unset = off). New providers go live on submit; this
-- file brings the providers who were ALREADY waiting in /admin/approvals to the
-- same state, doing what the old Approve click did to the provider tables and
-- nothing more.
--
-- Columns touched (all other columns untouched):
--   pandit_profiles.approved, approved_at        old Approve set both
--   store_profiles.approved
--   astrologer_profiles.approved
--   wellness_profiles.approved
--   gaushala_profiles.approved
--   temple_profiles.approved
--   priests.status  inactive -> active           old Approve did this so the portal opens
--   priests (INSERT)                             old Approve created the row for a pandit
--                                                that had none (status 'active')
--   updated_at on each touched row
--
-- Deliberately NOT touched (TC-08, no vetting claim for providers nobody reviewed):
--   priests.is_verified, priests.verification_status, priests.aadhaar_verified.
--   The old Approve click wrote is_verified = true; this file does not. The portal
--   and open-request screens accept pandit_profiles.approved instead, so
--   is_verified stays false and the public /priests directory (which lists on
--   is_verified) is unchanged: it holds exactly the rows a human vetted/seeded.
--   Also untouched: users.blocked rows are skipped (the blocked-user gate wins),
--   provider_kyc (payout KYC) and every commission/payout row. Earnings still
--   release only after the work is performed/proved and a payout still needs
--   bank details + KYC.
--
-- Which rows: only profiles in the old queue (approved = false) whose owner is
-- not blocked and whose profile is a real submission, not the empty stub that
-- /auth/signup seeds. "Real submission" is stated per table below. Cause roles
-- (gaushala, temple) must also pass the same minimum-quality bar the old Approve
-- enforced (lib/cause-quality.ts: name >= 3 chars with a letter, description >= 20
-- chars and >= 3 words, address >= 10 chars). A temple whose name equals an
-- existing temples.name stays pending: name match is how donations and
-- settlements find the payee, so that claim still needs a human (admin link).
--
-- Idempotent: every UPDATE is filtered on approved = false, every INSERT on
-- "no priests row", so a second run changes zero rows.

-- ── 1. PREVIEW (read-only): rows each statement below would activate ─────────
WITH
 pandit AS (SELECT p.user_id FROM pandit_profiles p JOIN users u ON u.id = p.user_id
             WHERE NOT p.approved AND NOT u.blocked
               AND (p.experience > 0 OR cardinality(p.specialties) > 0 OR p.bio IS NOT NULL OR p.city IS NOT NULL)),
 store AS (SELECT s.user_id FROM store_profiles s JOIN users u ON u.id = s.user_id
             WHERE NOT s.approved AND NOT u.blocked AND s.store_name NOT ILIKE 'Unnamed%'),
 astro AS (SELECT a.user_id FROM astrologer_profiles a JOIN users u ON u.id = a.user_id
             WHERE NOT a.approved AND NOT u.blocked
               AND (a.experience > 0 OR cardinality(a.specialties) > 0 OR a.bio IS NOT NULL)),
 well AS (SELECT w.user_id FROM wellness_profiles w JOIN users u ON u.id = w.user_id
             WHERE NOT w.approved AND NOT u.blocked
               AND (w.experience > 0 OR cardinality(w.specialties) > 0 OR w.bio IS NOT NULL)),
 gau AS (SELECT g.user_id FROM gaushala_profiles g JOIN users u ON u.id = g.user_id
             WHERE NOT g.approved AND NOT u.blocked
               AND char_length(btrim(g.gaushala_name)) >= 3 AND g.gaushala_name ~ '[[:alpha:]]'
               AND char_length(btrim(coalesce(g.description, ''))) >= 20
               AND cardinality(regexp_split_to_array(btrim(coalesce(g.description, '')), '\s+')) >= 3
               AND char_length(btrim(coalesce(g.address, ''))) >= 10),
 tmp AS (SELECT t.user_id FROM temple_profiles t JOIN users u ON u.id = t.user_id
             WHERE NOT t.approved AND NOT u.blocked
               AND char_length(btrim(t.temple_name)) >= 3 AND t.temple_name ~ '[[:alpha:]]'
               AND char_length(btrim(coalesce(t.description, ''))) >= 20
               AND cardinality(regexp_split_to_array(btrim(coalesce(t.description, '')), '\s+')) >= 3
               AND char_length(btrim(coalesce(t.address, ''))) >= 10
               AND NOT EXISTS (SELECT 1 FROM temples x WHERE lower(btrim(x.name)) = lower(btrim(t.temple_name))))
SELECT 'PANDIT' AS role, count(*) AS would_activate FROM pandit
UNION ALL SELECT 'STORE_OWNER', count(*) FROM store
UNION ALL SELECT 'ASTROLOGER', count(*) FROM astro
UNION ALL SELECT 'WELLNESS_INSTRUCTOR', count(*) FROM well
UNION ALL SELECT 'GAUSHALA_MANAGER', count(*) FROM gau
UNION ALL SELECT 'TEMPLE_MANAGER', count(*) FROM tmp
UNION ALL SELECT 'still pending after run (stubs, blocked, below quality bar, temple name taken)',
  (SELECT count(*) FROM pandit_profiles WHERE NOT approved)  - (SELECT count(*) FROM pandit)
+ (SELECT count(*) FROM store_profiles WHERE NOT approved)   - (SELECT count(*) FROM store)
+ (SELECT count(*) FROM astrologer_profiles WHERE NOT approved) - (SELECT count(*) FROM astro)
+ (SELECT count(*) FROM wellness_profiles WHERE NOT approved) - (SELECT count(*) FROM well)
+ (SELECT count(*) FROM gaushala_profiles WHERE NOT approved) - (SELECT count(*) FROM gau)
+ (SELECT count(*) FROM temple_profiles WHERE NOT approved)  - (SELECT count(*) FROM tmp);

-- ── 2. Activate ──────────────────────────────────────────────────────────────

-- Pandit: profile, then the portal row.
UPDATE pandit_profiles p
   SET approved = true, approved_at = now(), updated_at = now()
  FROM users u
 WHERE u.id = p.user_id AND NOT u.blocked AND NOT p.approved
   AND (p.experience > 0 OR cardinality(p.specialties) > 0 OR p.bio IS NOT NULL OR p.city IS NOT NULL);

-- Reopen a backfilled inactive row; a suspended one stays suspended.
UPDATE priests pr
   SET status = 'active', updated_at = now()
  FROM pandit_profiles p, users u
 WHERE p.user_id = pr.user_id AND u.id = pr.user_id AND NOT u.blocked
   AND p.approved AND pr.status = 'inactive';

-- A pandit with an active profile and no priests row (the old Approve created one).
-- is_verified / verification_status / aadhaar_verified keep their column defaults.
INSERT INTO priests (id, user_id, display_name, specializations, languages, experience_years, bio, status, created_at, updated_at)
SELECT gen_random_uuid(), p.user_id, coalesce(nullif(btrim(u.full_name), ''), 'Pandit'),
       p.specialties, p.languages, p.experience, p.bio, 'active', now(), now()
  FROM pandit_profiles p JOIN users u ON u.id = p.user_id
 WHERE p.approved AND NOT u.blocked
   AND NOT EXISTS (SELECT 1 FROM priests pr WHERE pr.user_id = p.user_id);

UPDATE store_profiles s SET approved = true, updated_at = now()
  FROM users u
 WHERE u.id = s.user_id AND NOT u.blocked AND NOT s.approved AND s.store_name NOT ILIKE 'Unnamed%';

UPDATE astrologer_profiles a SET approved = true, updated_at = now()
  FROM users u
 WHERE u.id = a.user_id AND NOT u.blocked AND NOT a.approved
   AND (a.experience > 0 OR cardinality(a.specialties) > 0 OR a.bio IS NOT NULL);

UPDATE wellness_profiles w SET approved = true, updated_at = now()
  FROM users u
 WHERE u.id = w.user_id AND NOT u.blocked AND NOT w.approved
   AND (w.experience > 0 OR cardinality(w.specialties) > 0 OR w.bio IS NOT NULL);

UPDATE gaushala_profiles g SET approved = true, updated_at = now()
  FROM users u
 WHERE u.id = g.user_id AND NOT u.blocked AND NOT g.approved
   AND char_length(btrim(g.gaushala_name)) >= 3 AND g.gaushala_name ~ '[[:alpha:]]'
   AND char_length(btrim(coalesce(g.description, ''))) >= 20
   AND cardinality(regexp_split_to_array(btrim(coalesce(g.description, '')), '\s+')) >= 3
   AND char_length(btrim(coalesce(g.address, ''))) >= 10;

UPDATE temple_profiles t SET approved = true, updated_at = now()
  FROM users u
 WHERE u.id = t.user_id AND NOT u.blocked AND NOT t.approved
   AND char_length(btrim(t.temple_name)) >= 3 AND t.temple_name ~ '[[:alpha:]]'
   AND char_length(btrim(coalesce(t.description, ''))) >= 20
   AND cardinality(regexp_split_to_array(btrim(coalesce(t.description, '')), '\s+')) >= 3
   AND char_length(btrim(coalesce(t.address, ''))) >= 10
   AND NOT EXISTS (SELECT 1 FROM temples x WHERE lower(btrim(x.name)) = lower(btrim(t.temple_name)));

-- ── 3. Keep existing temple managers linked ───────
-- With approval off the API no longer trusts "approved profile + same name" to
-- find a catalogue temple: only an explicit temple_manager_links row counts.
-- Managers an admin approved under the old flow relied on that name match, so
-- give each of them the explicit link it implied. Skipped if the lazily created
-- table does not exist yet (nothing relied on a link then either), and ON CONFLICT
-- keeps any link an admin already made. Preview first:
--   SELECT t.user_id, t.temple_name, x.id AS temple_id FROM temple_profiles t
--     JOIN temples x ON lower(btrim(x.name)) = lower(btrim(t.temple_name)) WHERE t.approved;
DO $$
BEGIN
  IF to_regclass('public.temple_manager_links') IS NOT NULL THEN
    INSERT INTO temple_manager_links (manager_user_id, temple_id)
    SELECT DISTINCT ON (t.user_id) t.user_id, x.id
      FROM temple_profiles t
      JOIN temples x ON lower(btrim(x.name)) = lower(btrim(t.temple_name))
     WHERE t.approved
     ORDER BY t.user_id, x.created_at
    ON CONFLICT (manager_user_id) DO NOTHING;
  END IF;
END $$;
