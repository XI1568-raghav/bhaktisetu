# R-Q2-S-002 — Onboard +25 verified pandits in Mumbai (cumulative 50)

> **Roadmap item**: R-Q2-S-002 (P0) · **Authored**: 2026-06-14 · **Status**: founder-action-required
> **Depends on**: R-Q1-S-003 (Q1 25 Mumbai pandits baseline)
> **Blocks (logical)**: R-Q2-G-002 Mumbai 80% scale milestone — 2K MAU activation requires deep supply side

## Goal

Recruit +25 NEW verified Mumbai pandits in Q2 on top of the R-Q1-S-003 baseline of 25, reaching a cumulative count of **50 verified Mumbai pandits** (`Priest.verified=true AND aadhaar_verified=true AND User.city ILIKE '%mumbai%'`).

## Why this matters now

- Mumbai is the second city after Bengaluru with sustainable pandit supply.
- 2K MAU goal (R-Q2-G-002) cannot land without ≥40 active pandits in catchment — bookings will starve.
- NRI gift-puja pipeline (Anand persona — SF/Bay area Gujarati diaspora) maps disproportionately to Mumbai pandits; expanding supply directly grows USD GMV.
- Doubling supply lets us A/B match-rate, response-time, repeat-booking funnel for first time at meaningful N.

## Target sub-segments (where the +25 come from)

Building on R-Q1-S-003 Q1 cohort (Siddhivinayak / ISKCON Juhu / Babulnath / Mahalakshmi / Gujarati Brahmin sabha), Q2 expansion taps:

1. **Suburban Marathi pandits** (8) — Thane, Dombivli, Kalyan, Vasai, Virar belt. Marathi-first, lower commission resistance (newer to platforms).
2. **Gujarati sabha second-tier** (6) — Mulund, Ghatkopar, Borivali Gujarati Samaj branches. Warm-intro from Q1 anchors.
3. **South Indian / Iyer / Iyengar pandits** (5) — Matunga, Chembur, Powai concentration. Serves Tamil/Telugu NRI gift-puja segment.
4. **Younger English-comfortable pandits** (3) — Andheri / Bandra corridor, Instagram-active, NRI-friendly for video consultations.
5. **Antim Sanskar specialists** (3) — last-rites pandits. Cross-link with `antim-sanskar-pandits-onboarding-spec.md` — Mumbai sub-batch.

## Language requirement (Maharashtra market)

Each onboarded pandit must demonstrate Marathi **or** Hindi proficiency. Track via `Priest.languages` array (existing field). Bilingual Marathi+Hindi preferred — covers both Marathi-mother-tongue devotees AND NRI Hindi-speakers.

## Onboarding pipeline (5 stages per pandit)

1. **Lead** — Phone + name + locality + temple affiliation captured (CRM / Google Sheet).
2. **First-call** — 15-min phone script (Marathi-first, see Q1 R-Q1-S-003 deck for skeleton). Outcome: interested / not / referral.
3. **KYC video call** — Founder (or vetted sales-ops contractor) 20-min Zoom: Aadhaar verification, gotra/sampradaya, language demo, sample mantra recitation. Mandatory recording for audit.
4. **Onboarding via `/priest-onboarding`** — Pandit completes web flow: profile + photo + bank account for payouts + 80G consent + service catalogue.
5. **First test puja** — Founder books a Satyanarayan puja (or small Ganpati) at platform's cost, validates video proof flow + payout flow. Pandit is `verified=true` only AFTER successful first test puja.

## KPI tracking

Live SELECT (per `kpi.query` in frontmatter):

```sql
SELECT COUNT(*)
FROM "Priest" p
JOIN "User" u ON p.user_id = u.id
WHERE p.verified = true
  AND p.aadhaar_verified = true
  AND u.city ILIKE '%mumbai%';
```

Target: **50** (cumulative across Q1 + Q2).
Run weekly. Snapshot to `docs/roadmap/_manual-kpis.yml` under key `verified_pandits_count_mumbai` until KPI scraper auto-pulls.

## Cross-link checkpoints

- **R-Q2-G-002 Mumbai 80% scale** — at +25 pandits we expect ≥10 active in `/priest/bookings` dashboard within 14 days of onboarding. If <10 → diagnose retention before adding more supply.
- **R-Q2-S-001 ISKCON partnership** — if ISKCON Juhu / Chowpatty partnership closes, batch 5-8 pandits ride that pipeline.
- **Wedding vendor network** — Mumbai wedding pandits (Hindu Brahmin Marathi/Gujarati) overlap with `wedding-vendor-network-spec.md`. Recruit dual-purpose pandits where possible.
- **Antim Sanskar** — Mumbai segment of `antim-sanskar-pandits-onboarding-spec.md` (3 of 25 target above).

## Success criteria (re-stated from frontmatter)

- [ ] **50 pandits cumulative Mumbai** (Q1 25 + Q2 +25), verified via SQL above.
- [ ] Each `verified=true AND aadhaar_verified=true` — business rule #4 payout gate met.
- [ ] Each onboarded via `/priest-onboarding` web flow with KYC + bank account.
- [ ] Each has Marathi or Hindi (or both) in `Priest.languages`.
- [ ] ≥10 pandits show active sessions in `/priest/bookings` dashboard within 14 days.
- [ ] First test puja completed + video proof verified for every onboarded pandit before flipping `verified=true`.

## Founder action checklist

- [ ] Pull Q1 onboarding cohort report — identify referral candidates from Q1 pandits (each Q1 pandit asked for 1 referral = +25 free leads).
- [ ] Schedule 2x 3-day Mumbai recce sessions (mid-Q2 + end-Q2). Block calendar.
- [ ] Engage 1 vetted Mumbai sales-ops contractor (₹15-25k/mo) to handle Stage 1-2 (lead + first-call) so founder only owns Stage 3 (KYC video) onwards.
- [ ] Validate / build target list of 35-40 leads (factor ~30% drop-off from lead → verified).
- [ ] Refresh outreach scripts in Marathi + Gujarati + English (carry from R-Q1-S-003 deck).
- [ ] Coordinate with R-Q2-G-002 Mumbai launch lead — sync onboarding cadence with marketing launch.
- [ ] Update KPI weekly in `_manual-kpis.yml`.
- [ ] Mark item `status: shipped` + add `shipped_at` once SQL returns 50.

## Why this PR has no code

This is a sales / outreach scaling task, not a build task. The platform already supports:
- `/priest-onboarding` flow (R-Q1-S-003 unblocked)
- Aadhaar verification + payout gate (live, business rule #4)
- `/priest/bookings` dashboard (Sprint 1 P0 wired)
- KPI SQL query (frontmatter)

What is missing is **execution** — 25 new humans recruited, KYC'd, and onboarded. Agent cannot do that. Best agent contribution is this structured handoff + KPI tracking + cross-link map.

If during onboarding a code gap is discovered (e.g. priest portal missing a field, KYC flow blocks Marathi-script names, Bandra-area pincode rejected) — file a new roadmap item under category `eng` with `depends_on: ["R-Q2-S-002"]` and link here.

## Related

- **R-Q1-S-003** — Q1 25 Mumbai pandits baseline (the prerequisite).
- **R-Q2-G-002** — Mumbai 2K MAU growth milestone (depends on this supply).
- **R-Q2-S-001** — ISKCON partnership (potential pipeline accelerator).
- `docs/supply/hyderabad-pandit-onboarding-spec.md` — reusable script template.
- `docs/supply/antim-sanskar-pandits-onboarding-spec.md` — overlapping specialist segment.
- `docs/supply/baps-swaminarayan-pipeline-spec.md` — adjacent Gujarati network.
- `docs/company/05-sales.md` — sales playbook reference.
