# R-Q2-S-004 — Onboard 25 verified pandits in Pune (new city)

> **Roadmap item**: R-Q2-S-004 (P0) · **Authored**: 2026-06-14 · **Status**: founder-action-required
> **Depends on**: nothing (Pune is a new-city expansion, no Q1 baseline)
> **Blocks (logical)**: R-Q2-G-004 Pune geo soft launch — Pune city activation requires deep supply side; cross-link R-Q2-S-007 (+5 Pune temples)

## Goal

Recruit **25 NEW verified Pune pandits** in Q2 — Pune is a Maharashtra greenfield city for the platform (zero Q1 baseline). Reach `Priest.verified=true AND aadhaar_verified=true AND User.city ILIKE '%pune%'` count of **25**.

## Why this matters now

- Pune is the second Maharashtra metro after Mumbai. Marathi-first market with strong devotional density (Dagdusheth, Khandoba, Saraswati, Chaturshringi, Jejuri belt).
- R-Q2-G-004 Pune soft launch is blocked on supply — no pandits = no live bookings = wasted marketing spend on the city activation.
- Pune diaspora (Pune-origin NRIs in Bay Area, NJ, Toronto) maps cleanly to NRI gift-puja growth — Marathi-speaking Pune pandits unlock a distinct sub-segment from Mumbai pandits.
- Establishing supply at the same time as the Pune geo launch (R-Q2-G-004) lets us measure end-to-end city-cohort funnel from launch day 1 — better signal than retro-fitting onto an existing market.

## Target sub-segments (where the 25 come from)

Pune-specific recruitment angles, ranked by founder-effort efficiency:

1. **Pune Brahmin Mahasangh / Bramha Sabha network** (8) — citywide Brahmin sabha with 5000+ registered pandits. Single warm intro = bulk lead generation. Marathi-first, traditional, lower commission resistance.
2. **Dagdusheth + Chaturshringi + Khandoba area pandits** (5) — pandits already attached to top-5 Pune temples (cross-link R-Q2-S-007). High brand-trust transfer.
3. **Saraswati Mandir / Shaniwar Wada heritage corridor** (3) — old-city pandits with multi-generational legitimacy + scholarship/learning niche.
4. **Sinhagad Road / Kothrud / Karve Nagar suburban Marathi pandits** (5) — middle-class Marathi neighborhoods with steady household-puja demand (Satyanarayan, Ganpati, vastu).
5. **ISKCON Pune / NCL area pandits** (2) — Vaishnav segment, English-comfortable, NRI-friendly. Cross-link R-Q2-S-001 ISKCON partnership.
6. **Antim Sanskar specialists** (2) — last-rites pandits for Pune. Cross-link `antim-sanskar-pandits-onboarding-spec.md` Pune sub-batch.

## Language requirement (Maharashtra market — critical)

Each onboarded Pune pandit **must** demonstrate Marathi proficiency (mandatory) — Pune is a deeply Marathi market and Hindi-only pandits will not earn devotee trust. Track via `Priest.languages` array. Bilingual Marathi+Hindi preferred (covers NRI Hindi speakers + Pune Marathi mother-tongue devotees). Marathi+Sanskrit triad ideal for Vedic puja accuracy signals.

## Onboarding pipeline (5 stages per pandit)

Mirror the proven R-Q1-S-003 Mumbai / R-Q2-S-002 Mumbai cumulative pipeline:

1. **Lead** — Phone + name + locality + temple/sabha affiliation captured (CRM / Google Sheet tab `pune_pandit_leads_q2`).
2. **First-call** — 15-min phone script (**Marathi-first**, fall back to Hindi only if explicitly requested). Outcome: interested / not / referral. Script adapted from R-Q1-S-003 with Pune-specific anchors (Dagdusheth/Khandoba/Saraswati references for trust-building).
3. **KYC video call** — Founder (or vetted Pune sales-ops contractor) 20-min Zoom: Aadhaar verification, gotra/sampradaya, Marathi language demo, sample mantra recitation. Mandatory recording for audit + dispute resolution.
4. **Onboarding via `/priest-onboarding`** — Pandit completes web flow: profile + photo + bank account for payouts + 80G consent + service catalogue. Marathi UI strings now live (per R-Q1-CS-003 + R-Q2-CS-003 multilingual macros).
5. **First test puja** — Founder books a Satyanarayan or small Ganpati puja at platform's cost, validates video proof flow + payout flow. Pandit is `verified=true` ONLY after successful first test puja with video proof.

## KPI tracking

Live SELECT (per `kpi.query` in frontmatter):

```sql
SELECT COUNT(*)
FROM "Priest" p
JOIN "User" u ON p.user_id = u.id
WHERE p.verified = true
  AND p.aadhaar_verified = true
  AND u.city ILIKE '%pune%';
```

Target: **25** (new city, no Q1 baseline).
Run weekly. Snapshot to `docs/roadmap/_manual-kpis.yml` under key `verified_pandits_count_pune` until KPI scraper auto-pulls.

## Cross-link checkpoints

- **R-Q2-G-004 Pune geo soft launch** — supply must precede marketing spend by 2-3 weeks. Founder coordinates onboarding cadence with launch lead. Target ≥10 active Pune pandits in `/priest/bookings` by launch day.
- **R-Q2-S-007 +5 Pune temples** — 5 of 25 pandits should ride the temple onboarding pipeline (Dagdusheth + Chaturshringi + ISKCON Pune + Khandoba + Saraswati pandits).
- **R-Q2-S-001 ISKCON partnership** — if ISKCON Pune partnership closes via central LOI, batch 2 ISKCON Pune pandits ride that pipeline.
- **R-Q1-CS-003 + R-Q2-CS-003 multilingual macros** — Marathi support macros + UI strings already live, do not block onboarding.
- **Antim Sanskar Pune sub-batch** — 2 of 25 overlap with `antim-sanskar-pandits-onboarding-spec.md`.

## Success criteria (re-stated from frontmatter)

- [ ] **25 verified Pune pandits**, validated via SQL above.
- [ ] Each `verified=true AND aadhaar_verified=true` — business rule #4 payout gate met.
- [ ] Each onboarded via `/priest-onboarding` web flow with KYC + bank account.
- [ ] Each has Marathi in `Priest.languages` (mandatory) — bilingual Marathi+Hindi preferred.
- [ ] ≥5 pandits show active sessions in `/priest/bookings` dashboard within 14 days (cross-linked to R-Q2-G-004 launch cadence).
- [ ] First test puja completed + video proof verified for every onboarded pandit before flipping `verified=true`.

## Founder action checklist

- [ ] **Single warm intro to Pune Brahmin Mahasangh** — highest leverage. Schedule founder meeting in Pune week 1 of Q2.
- [ ] Schedule 3x 3-day Pune recce sessions (start-Q2 + mid-Q2 + end-Q2). Block calendar.
- [ ] Engage 1 vetted Pune sales-ops contractor (₹15-25k/mo, **Marathi-native mandatory**) to handle Stage 1-2 (lead + first-call) so founder only owns Stage 3 (KYC video) onwards.
- [ ] Validate / build target list of 35-40 leads (factor ~30% drop-off from lead → verified).
- [ ] Translate / refresh outreach scripts in Marathi (primary) + Hindi (fallback). Carry from R-Q1-S-003 Mumbai deck and reword for Pune cultural anchors.
- [ ] Coordinate with R-Q2-G-004 Pune launch lead — sync onboarding cadence with marketing launch (supply MUST precede demand-side spend).
- [ ] Coordinate with R-Q2-S-007 Pune temple onboarding lead — batch 5 pandits with the temple pipeline for trust transfer.
- [ ] Update KPI weekly in `_manual-kpis.yml` key `verified_pandits_count_pune`.
- [ ] Mark item `status: shipped` + add `shipped_at` once SQL returns 25.

## Why this PR has no code

This is a sales / outreach scaling task, not a build task. The platform already supports:

- `/priest-onboarding` flow (R-Q1-S-003 unblocked)
- Aadhaar verification + payout gate (live, business rule #4)
- `/priest/bookings` dashboard (Sprint 1 P0 wired)
- Marathi UI strings + support macros (R-Q1-CS-003 + R-Q2-CS-003 live)
- KPI SQL query (frontmatter)

What is missing is **execution** — 25 new humans recruited, KYC'd, and onboarded. Agent cannot do that. Best agent contribution is this structured handoff + KPI tracking + cross-link map.

If during onboarding a code gap is discovered (e.g. Pune-area pincode rejected, Marathi-script display name fails Zod validation, IFSC code for a Pune cooperative bank not whitelisted, KYC flow blocks specific Pune-area gotra) — file a new roadmap item under category `eng` with `depends_on: ["R-Q2-S-004"]` and link here.

## Related

- **R-Q2-G-004** — Pune geo soft launch (blocks on this supply).
- **R-Q2-S-007** — Pune temple onboarding (+5 verified temples) — pandit overlap.
- **R-Q1-S-003** — Q1 Mumbai 25 pandits baseline (proven pipeline template).
- **R-Q2-S-002** — Q2 Mumbai cumulative 50 pandits (sibling Maharashtra item).
- **R-Q2-S-001** — ISKCON central LOI partnership (potential ISKCON Pune accelerator).
- `docs/supply/pune-temple-onboarding-spec.md` — sibling temple spec, shared geography.
- `docs/supply/hyderabad-pandit-onboarding-spec.md` — reusable script template (south India market).
- `docs/supply/antim-sanskar-pandits-onboarding-spec.md` — overlapping specialist segment.
- `docs/company/05-sales.md` — sales playbook reference.
