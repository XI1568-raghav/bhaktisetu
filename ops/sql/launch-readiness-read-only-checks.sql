-- launch-readiness-read-only-checks.sql
--
-- READ-ONLY. Selects only; nothing in this file changes data. Run it through the
-- prod-db-task workflow in dry-run mode (the log shows every result; the transaction
-- is rolled back).
--
-- 1. Seeded provider personas that are live on the public site (priests, astrologers).
--    A seeded persona is a user whose email ends in darshya.online, demo.com or example.com.
-- 2. User-supplied URLs already stored with a scheme other than http or https.

\echo '== 1a. astrologer profiles: approved and visible to customers'
SELECT ap.display_name, ap.approved, ap.total_consultations, u.email
  FROM astrologer_profiles ap
  JOIN users u ON u.id = ap.user_id
 ORDER BY ap.approved DESC, ap.display_name;

\echo '== 1b. priests: status, verification and email'
SELECT p.display_name, p.status, p.is_verified, p.verification_status, u.email
  FROM priests p
  JOIN users u ON u.id = p.user_id
 ORDER BY p.status, p.display_name;

\echo '== 1c. how many seeded-looking accounts exist (email ends darshya.online, demo.com or example.com)'
SELECT count(*) AS seeded_looking_users
  FROM users
 WHERE email ILIKE '%@darshya.online' OR email ILIKE '%@demo.com' OR email ILIKE '%@example.com';

\echo '== 2. stored URLs that are not http or https (expect 0 rows each)'
SELECT 'store_products.image_url' AS field, id::text AS row_id, left(image_url, 80) AS value
  FROM store_products
 WHERE image_url IS NOT NULL AND image_url !~* '^https?://'
UNION ALL
SELECT 'temples.website_url', id::text, left(website_url, 80)
  FROM temples
 WHERE website_url IS NOT NULL AND website_url <> '' AND website_url !~* '^https?://'
UNION ALL
SELECT 'live_darshan_streams.playback_url', id::text, left(playback_url, 80)
  FROM live_darshan_streams
 WHERE playback_url !~* '^https?://'
UNION ALL
SELECT 'gurukuls.website_url', id::text, left(website_url, 80)
  FROM gurukuls
 WHERE website_url IS NOT NULL AND website_url <> '' AND website_url !~* '^https?://';
