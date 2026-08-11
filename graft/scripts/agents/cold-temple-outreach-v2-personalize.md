# scripts\agents\cold-temple-outreach-v2-personalize.mjs

Deterministic, LLM-free cold-outreach email generator that personalizes subject and body per temple by hashing its identity tuple into deity/region/tier/festival template banks, so QA gets stable re-testable output at $0 cost.

- classifyDeity · function · L86-L96 — Buckets a temple's raw deity text into one of six deity families (or generic) so the email can use tradition-specific hooks, subjects, and festival references.
- classifyRegion · function · L98-L108 — Maps a temple's state/city into one of five Indian regions so the body can cite the matching diaspora-demand pattern.
- classifyCityTier · function · L121-L127 — Classifies the temple's city as pilgrim, tier-1, or tier-2 to select the value-prop sentence about NRI traffic patterns, checking pilgrim status before metro status.
- stableHash · function · L130-L138 — FNV-1a string hash providing the deterministic pseudo-randomness that makes template selection stable across runs for the same temple.
- pickTemplate · function · L140-L145 — Selects one entry from a template bank by hashing a per-temple seed modulo the bank length, guaranteeing the same temple always gets the same wording.
- escapeHtml · function · L147-L151 — Escapes HTML metacharacters so interpolated lead data cannot break markup or inject content into the email body.
- buildSubject · function · L155-L168 — Builds a deity- and city-specific subject line from a prioritized variant list (tradition-specific first, generic fallback last) chosen deterministically per lead.
- buildBodyHtml · function · L170-L208 — Assembles the full personalized HTML body by combining the hashed hook, regional context, city-tier value prop, and festival hint with Darshya's commission/video-proof pitch and a tracked onboarding link.
- buildPersonalizedEmail · function · L210-L218 — Composes subject, body, and the classification metadata into one email payload for the outreach pipeline.
