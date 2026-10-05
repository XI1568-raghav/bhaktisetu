-- seed-default-temple-offerings.sql
--
-- Makes every registered temple bookable. Owner decision 2026-10-06: the
-- "Book Puja" CTA is never hidden, so a temple with ZERO temple_puja_offerings
-- rows (15 of 20 on production) must get a standard set. Bookings made at these
-- offerings have no assigned priest, so they go to the open pandit pool.
--
-- Scope and safety
--   * Only temples with NO offering row at all (active or not) are touched.
--   * Idempotent: guarded by WHERE NOT EXISTS plus the (temple_id, puja_type_id)
--     unique key. A second run inserts 0 rows.
--   * Insert-only. Existing offerings are never updated, repriced or re-activated.
--   * price_override / nri_price stay NULL, so price follows puja_types.base_price.
--   * Needs only existing tables. NO schema change, NO migration.
--   * Standard set (keep in sync with STANDARD_OFFERING_PUJA_SLUGS in
--     apps/api/src/services/temple-standard-offerings.service.ts):
--       hanuman-chalisa-path, ganesh-puja, lakshmi-puja, rudrabhishek,
--       satyanarayan-katha
--   * A temple that is not is_verified is still not bookable (booking.service
--     requires it); verify it in /admin/temples.
--
-- Usage: prints the would-add count, inserts, then prints what was added.
-- For a dry run, replace COMMIT with ROLLBACK.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ops/sql/seed-default-temple-offerings.sql
--
-- Must be run by hand against production by the owner. It is NOT run by CI or
-- on deploy.

\echo 'Rows that would be added (temples with zero offerings x standard pujas in the catalogue):'
SELECT count(*) AS would_add
FROM temples t
CROSS JOIN puja_types p
WHERE p.slug IN ('hanuman-chalisa-path','ganesh-puja','lakshmi-puja','rudrabhishek','satyanarayan-katha')
  AND p.is_active
  AND NOT EXISTS (SELECT 1 FROM temple_puja_offerings o WHERE o.temple_id = t.id);

BEGIN;

WITH inserted AS (
  INSERT INTO temple_puja_offerings
    (id, temple_id, puja_type_id, price_override, nri_price, assigned_priest_id,
     available_slots, max_bookings_per_slot, is_active)
  SELECT
    gen_random_uuid(), t.id, p.id, NULL, NULL, NULL,
    '["06:00","07:00","08:00","12:00","13:00","17:00","18:00"]'::jsonb, 5, true
  FROM temples t
  CROSS JOIN puja_types p
  WHERE p.slug IN ('hanuman-chalisa-path','ganesh-puja','lakshmi-puja','rudrabhishek','satyanarayan-katha')
    AND p.is_active
    AND NOT EXISTS (SELECT 1 FROM temple_puja_offerings o WHERE o.temple_id = t.id)
  ON CONFLICT (temple_id, puja_type_id) DO NOTHING
  RETURNING temple_id
)
SELECT count(*) AS rows_added, count(DISTINCT temple_id) AS temples_made_bookable FROM inserted;

COMMIT;
