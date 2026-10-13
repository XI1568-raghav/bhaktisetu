-- QA ONE-RUPEE TEST PUJA (live payment test).
-- Creates puja "QA Test Puja (Rs 1)" priced Rs 1 and offers it at ONE temple.
-- The checkout total is Rs 1 + the fixed Rs 51 platform fee = Rs 52 (the fee is not changed by this file).
-- While active it is publicly visible and bookable. Run the REMOVE block at the bottom after testing.
-- Paste into the Supabase SQL editor (one transaction). Idempotent: safe to run twice.
-- Change the temple by editing the slug in the TARGET line (default: first temple by name).

-- 1) CREATE
INSERT INTO puja_types
  (id, name, slug, description, category, deity, duration_minutes, base_price, nri_price,
   samagri_included, images, video_proof_mandatory, is_active, sort_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'QA Test Puja (Rs 1)', 'qa-test-puja-rs-1',
   'Internal payment test. Please do not book unless you are the Darshya team.',
   'daily', 'General', 15, 1.00, 1.00, false, '[]'::jsonb, true, true, 9999, now(), now())
ON CONFLICT (slug) DO UPDATE SET base_price = 1.00, nri_price = 1.00, is_active = true, updated_at = now();

INSERT INTO temple_puja_offerings
  (id, temple_id, puja_type_id, price_override, nri_price, assigned_priest_id,
   available_slots, max_bookings_per_slot, is_active)
SELECT gen_random_uuid(), t.id, p.id, NULL, NULL, NULL,
       '["06:00","07:00","08:00","12:00","13:00","17:00","18:00"]'::jsonb, 5, true
FROM puja_types p,
     (SELECT id FROM temples ORDER BY name LIMIT 1) t  -- TARGET: replace with (SELECT id FROM temples WHERE slug = '<slug>') to choose
WHERE p.slug = 'qa-test-puja-rs-1'
ON CONFLICT (temple_id, puja_type_id) DO UPDATE SET is_active = true;

SELECT t.name AS temple, t.slug AS temple_slug, p.slug AS puja_slug, p.base_price
FROM temple_puja_offerings o
JOIN temples t ON t.id = o.temple_id
JOIN puja_types p ON p.id = o.puja_type_id
WHERE p.slug = 'qa-test-puja-rs-1';

-- 2) REMOVE after testing (run separately, bookings keep their history):
-- UPDATE temple_puja_offerings SET is_active = false
--   WHERE puja_type_id = (SELECT id FROM puja_types WHERE slug = 'qa-test-puja-rs-1');
-- UPDATE puja_types SET is_active = false WHERE slug = 'qa-test-puja-rs-1';
