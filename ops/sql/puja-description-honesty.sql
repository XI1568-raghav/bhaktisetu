-- puja-description-honesty.sql
--
-- Removes three claims the product cannot back from two puja descriptions:
-- "complete samagri" included in the booking, a "live" abhishek, and a
-- "tamper-proof" video. The booking promises a video recording delivered to the
-- booking page, and nothing more. Mirrors the edit already made in
-- apps/api/prisma/seed.ts.
--
-- Scope and safety
--   * Touches only puja_types.description for slugs 'rudrabhishek' and
--     'durga-puja', and only when the old sentence is still present, so a second
--     run changes 0 rows.
--   * Text replacement, not overwrite: any other edit made to the description on
--     production is kept.
--   * No schema change, no migration. Reversible by running the old sentence back.
-- Verify: SELECT slug, description ~* 'tamper-proof|complete samagri' FROM puja_types
--         WHERE slug IN ('rudrabhishek','durga-puja');   -- both false after apply

UPDATE puja_types
SET description = replace(description,
  'Our priests perform it traditionally from the Kashi Vishwanath sanctum tradition. The booking includes complete samagri, sankalp (intention-setting in your name and gotra), live abhishek with Sanskrit chanting, aarti, and a tamper-proof video of the entire ritual.',
  'The booking includes sankalp (intention-setting in your name and gotra), the abhishek with Sanskrit chanting, aarti, and a video recording of the ritual delivered to your booking page.')
WHERE slug = 'rudrabhishek'
  AND position('Our priests perform it traditionally from the Kashi Vishwana' in description) > 0;

UPDATE puja_types
SET description = replace(description,
  'aarti, and a tamper-proof video of the entire recitation.',
  'aarti, and a video recording of the recitation delivered to your booking page.')
WHERE slug = 'durga-puja'
  AND position('aarti, and a tamper-proof video of the entire recitation.' in description) > 0;
