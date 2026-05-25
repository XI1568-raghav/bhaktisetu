-- 2026-05-25 — Seed 3 verified sample gurukuls + 8 programs.
-- Idempotent: re-running updates the same slugs in-place.
-- ownerId left NULL (owner relation is `onDelete: SetNull`, nullable).

INSERT INTO "gurukuls" (
  "id", "slug", "name", "description", "city", "state", "country",
  "website_url", "contact_email", "contact_phone", "tradition",
  "is_residential", "is_online", "accepts_minors", "is_verified", "is_active",
  "owner_id", "created_at", "updated_at"
) VALUES
  (gen_random_uuid(), 'sampurnanand-sanskrit-vidyalaya', 'Sampurnanand Sanskrit Vidyalaya',
   'Founded in 1791 in the heart of Kashi, this gurukul preserves the Shastric tradition of Veda-adhyayana, Vyakarana, Nyaya, and Vedanta. Students follow the traditional residential model with morning sandhya, scripture recitation, and evening shastrartha. Faculty includes 40+ traditional acharyas; alumni serve as temple priests, Sanskrit scholars, and university lecturers across India and abroad.',
   'Varanasi', 'Uttar Pradesh', 'IN',
   'https://example.org/sampurnanand', 'admissions@example.org', '+91-9450000001',
   'Advaita', true, false, true, true, true, NULL, NOW(), NOW()),

  (gen_random_uuid(), 'poornaprajna-vidyapeetha', 'Poornaprajna Vidyapeetha',
   'A flagship Dvaita Vedanta gurukul established by Sri Vishvesha Tirtha Swami of Pejavar Math. The 12-year residential curriculum covers Tarka, Vyakarana, Mimamsa, and Madhva Sampradaya commentaries. Students live in the ashram, follow strict varnashrama dharma, and graduate as Vidwans recognized by major mathas across South India.',
   'Bengaluru', 'Karnataka', 'IN',
   'https://example.org/poornaprajna', 'office@example.org', '+91-9844000002',
   'Dvaita', true, true, true, true, true, NULL, NOW(), NOW()),

  (gen_random_uuid(), 'parmarth-niketan-rishikul', 'Parmarth Niketan Rishikul',
   'A Himalayan gurukul on the banks of the Ganga at Rishikesh. Combines traditional Vedic chanting (ghana-patha) with applied yoga-shastra and Ayurveda. Hybrid program: 6-month residential intensive plus online continuing track for international seekers. All-vegetarian, satvik routine; daily Ganga aarti participation mandatory.',
   'Rishikesh', 'Uttarakhand', 'IN',
   'https://example.org/parmarth', 'gurukul@example.org', '+91-9412000003',
   'Smarta', true, true, false, true, true, NULL, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "city" = EXCLUDED."city",
  "state" = EXCLUDED."state",
  "tradition" = EXCLUDED."tradition",
  "is_residential" = EXCLUDED."is_residential",
  "is_online" = EXCLUDED."is_online",
  "accepts_minors" = EXCLUDED."accepts_minors",
  "is_verified" = EXCLUDED."is_verified",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = NOW();

-- Programs: tied via slug lookup so re-runs are idempotent.
-- Delete + reinsert programs for the 3 sample slugs (safe — no applications expected on samples).
DELETE FROM "gurukul_programs"
WHERE "gurukul_id" IN (
  SELECT "id" FROM "gurukuls" WHERE "slug" IN (
    'sampurnanand-sanskrit-vidyalaya',
    'poornaprajna-vidyapeetha',
    'parmarth-niketan-rishikul'
  )
);

INSERT INTO "gurukul_programs" (
  "id", "gurukul_id", "name", "duration_months", "mode_of_study",
  "age_min", "age_max", "description", "fee_annual_inr", "is_active",
  "created_at", "updated_at"
)
SELECT gen_random_uuid(), g."id", p."name", p."duration_months", p."mode_of_study",
       p."age_min", p."age_max", p."description", p."fee_annual_inr", true, NOW(), NOW()
FROM (
  VALUES
    ('sampurnanand-sanskrit-vidyalaya',
     'Veda Adhyayana (Rigveda Kanda)', 96, 'residential', 8, 16,
     'Eight-year guru-shishya track in Rigveda Samhita with Pada-patha, Krama-patha, and Ghana-patha. Daily three-session schedule.', 24000),
    ('sampurnanand-sanskrit-vidyalaya',
     'Vyakarana Shastra (Panini)', 60, 'residential', 14, 25,
     'Five-year course in Ashtadhyayi, Mahabhashya, and Siddhanta Kaumudi under traditional pandits.', 36000),
    ('sampurnanand-sanskrit-vidyalaya',
     'Nyaya-Vedanta (Diploma)', 36, 'residential', 18, 35,
     'Three-year diploma combining Navya-Nyaya logic with Advaita Vedanta texts including Vivaranaprameya-Sangraha.', 48000),

    ('poornaprajna-vidyapeetha',
     'Madhva Vedanta Acharya Course', 144, 'residential', 8, 18,
     'Twelve-year residential program covering the entire Sarvamoola of Sri Madhvacharya plus modern Sanskrit & English.', 0),
    ('poornaprajna-vidyapeetha',
     'Online Tarka-Shastra Foundation', 12, 'online', 16, 60,
     'Twelve-month live online course in Annambhatta Tarkasangraha with weekly live shastrartha sessions. Open to all.', 18000),

    ('parmarth-niketan-rishikul',
     'Vedic Chanting Intensive', 6, 'residential', 18, 60,
     'Six-month residential immersion in Krishna-Yajurveda Taittiriya recitation, Vedic Sanskrit grammar, and ritual fundamentals.', 60000),
    ('parmarth-niketan-rishikul',
     'Yoga-Shastra Sadhaka', 9, 'hybrid', 21, 65,
     'Nine-month hybrid track: 3 months residential at Rishikesh + 6 months online mentorship in Patanjali Yoga Sutra and Hatha Pradipika.', 90000),
    ('parmarth-niketan-rishikul',
     'Online Sanskrit for Seekers', 4, 'online', 16, 70,
     'Four-month live online primer in Devanagari, basic Sanskrit grammar, and reading sloka-paatha. Designed for the diaspora.', 12000)
) AS p("g_slug","name","duration_months","mode_of_study","age_min","age_max","description","fee_annual_inr")
JOIN "gurukuls" g ON g."slug" = p."g_slug";
