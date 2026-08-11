# apps\api\scripts\leads\_wellness-seed.ts

- WellnessSeedRow · interface · L9-L14 — Defines the minimal shape (name, city, state, modality) for each hand-curated wellness seed entry before it is expanded into a full RawLead.
- slug · function · L16-L20 — Normalizes arbitrary names/cities into URL-safe lowercase slugs used to build placeholder contact identifiers.
- placeholderEmail · function · L22-L23 — Generates a clearly-marked placeholder email address from a lead's name and city so seeded records have a syntactically valid but obviously synthetic contact.
- placeholderPhone · function · L25-L31 — Generates a deterministic, fake-looking Indian mobile number by hashing the lead's name and city, ensuring stable placeholder phones across runs.
