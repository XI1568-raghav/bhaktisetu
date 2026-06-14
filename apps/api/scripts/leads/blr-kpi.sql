-- R-Q1-S-013 KPI query: leads_new_verified_emails (BLR temple campaign).
--
-- Counts BLR temple leads with EITHER a verified email (real @-domain, not
-- our *.temple.placeholder.in stub) OR a verified phone (came from Google
-- Places international_phone_number / formatted_phone_number).
--
-- Run:
--   psql $SUPABASE_DIRECT_URL -f apps/api/scripts/leads/blr-kpi.sql
--
-- Or wire into _kpi-supabase.mjs as KPI metric `leads_new_verified_emails`.

SELECT
  COUNT(*) FILTER (
    WHERE
      role = 'TEMPLE'
      AND city = 'Bengaluru'
      AND (metadata->>'campaign') = 'R-Q1-S-013'
      AND (
        -- verified email branch: real @-domain (not the placeholder stub)
        (
          email IS NOT NULL
          AND email NOT LIKE '%.temple.placeholder.in'
          AND (metadata->>'verified_email')::boolean = true
        )
        -- OR verified phone branch: Google Places returned international phone
        OR (metadata->>'verified_phone')::boolean = true
      )
  ) AS leads_new_verified_emails,

  COUNT(*) FILTER (
    WHERE role = 'TEMPLE' AND city = 'Bengaluru' AND (metadata->>'campaign') = 'R-Q1-S-013'
  ) AS total_blr_temple_leads,

  COUNT(*) FILTER (
    WHERE
      role = 'TEMPLE'
      AND city = 'Bengaluru'
      AND (metadata->>'campaign') = 'R-Q1-S-013'
      AND source = 'static_seed_blr'
  ) AS seed_only_count,

  COUNT(*) FILTER (
    WHERE
      role = 'TEMPLE'
      AND city = 'Bengaluru'
      AND (metadata->>'campaign') = 'R-Q1-S-013'
      AND source = 'google_places_blr'
  ) AS google_places_count
FROM leads;
