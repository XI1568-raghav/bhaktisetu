# R-Q3-S-002 — Onboard 25 verified pandits in Kolkata (new city, east expansion)

> **Roadmap item**: R-Q3-S-002 (P0) · **Authored**: 2026-06-15 · **Status**: founder-action-required
> **Depends on**: R-Q1-S-001 (Bengaluru 25), R-Q1-S-003 (Mumbai 25), R-Q2-S-002 (Mumbai +25 cumulative 50)
> **Blocks (logical)**: any Q3+ Kolkata / east-India growth + NRI-Bengali gift-puja pipeline

## Goal

Recruit **25 verified Kolkata pandits** in Q3 — the platform's first dedicated east-India supply expansion (`Priest.verified=true AND aadhaar_verified=true AND User.city ILIKE '%kolkata%'`). Establishes the Bengali-language + Shakta tradition catchment that none of the prior 3 cohorts (Bengaluru, Mumbai, Hyderabad) cover.

## Why this matters now

- East India represents ~22% of Hindu population but 0% of current platform supply. Closing the geographic gap unblocks pan-India positioning + investor narrative ("4 metros covered").
- **Durga Puja (Sep-Oct) is the single biggest east-India devotional event.** A Q3 launch with verified Kolkata pandits captures the highest-intent window of the year for the segment.
- **Shakta tradition + Kali worship are under-served** on platform. Current Bengaluru / Mumbai / Hyderabad cohorts skew Vaishnava + Shaiva — Kolkata adds Devi/Shakti specialists for the first time.
- **NRI-Bengali diaspora** (NJ, Houston, Bay-area Bengali Association, London Probasi) is large, organized, and culturally insistent on Bengali-speaking pandit for gift-puja + remote shraadh. Anand-persona analog: "Anjan in NJ books Durga Puja anjali for parents in Salt Lake every year." No current pandit can serve him.
- Establishes the template for next east-expansion (Bhubaneswar, Guwahati) on the same playbook.

## Target sub-segments (where the 25 come from)

Kolkata pandit supply is concentrated in **temple-affiliated**, **sabha-affiliated**, and **specialist** pools. Target mix:

1. **Kalighat / Dakshineswar temple pandits** (5) — the two anchor Kali temples. Highest brand pull. Warm-intro via temple trust if possible.
2. **Belur Math / Ramakrishna Mission affiliated pandits** (4) — Vaishnava-Shakta blended tradition. English-comfortable, NRI-friendly, used to formal protocols.
3. **Bengali Brahmin sabha network** (6) — Bharat Sevashram Sangha, Bangiya Brahmin Sabha, ward-level Durga Puja samiti pandits. Marathi-cohort-style sabha pipeline.
4. **South-Kolkata / Salt Lake / New Town younger pandits** (5) — Bengali + English + Hindi trilingual, social-media-active, comfortable on video for NRI consultations. Anchor for diaspora gift-puja.
5. **Shraadh + Tarpan specialists** (3) — Pitru Paksha (Sep) is concurrent with Durga Puja launch window. Specialist pandits perform Tarpan at Babughat / Gangasagar ghats. High NRI demand.
6. **Antim Sanskar specialists** (2) — Nimtala / Keoratala ghat-affiliated last-rites pandits. Cross-link with `antim-sanskar-pandits-onboarding-spec.md` — Kolkata sub-batch.

## Language requirement (West Bengal market)

Each onboarded pandit must demonstrate **Bengali** proficiency (primary). Hindi or English additionally preferred. Track via `Priest.languages` array (existing field). **Bengali-mother-tongue is non-negotiable** — non-Bengali pandits cannot serve the cultural-fit expectation for Durga Puja / Kali Puja / Saraswati Puja in this market. (Different from Mumbai/Bengaluru where Hindi-only is acceptable.)

Sanskrit recitation must follow **Bengali pronunciation school** (e.g. "Shaktyam" vs "Shaktim", soft "v"/"b" interchange) — Sanskrit-North-Indian-pronunciation pandits will be rejected by the local devotee base.

## Onboarding pipeline (5 stages per pandit)

Same 5-stage pattern as Mumbai (R-Q2-S-002) / Hyderabad (`hyderabad-pandit-onboarding-spec.md`):

1. **Lead** — Phone + name + locality + temple/sabha affiliation captured in CRM (Google Sheet for Q3 — Salesforce post product-market-fit).
2. **First-call** — 15-min phone script (**Bengali-first**, see "Outreach scripts" below for skeleton). Outcome: interested / not / referral.
3. **KYC video call** — Founder (or vetted Kolkata sales-ops contractor) 20-min Zoom: Aadhaar verification, gotra/sampradaya, Bengali recitation demo (e.g. Mahishasura Mardini stotram first 4 lines), sample mantra audio quality test. Mandatory recording for audit.
4. **Onboarding via `/priest-onboarding`** — Pandit completes web flow: profile + photo + bank account for payouts + 80G consent + service catalogue. Service catalogue should include: Durga Puja Anjali (remote-video), Kali Puja, Saraswati Puja, Lakshmi Puja, Satyanarayan, Tarpan, Antim Sanskar (where specialist).
5. **First test puja** — Founder books a Satyanarayan puja (or Saraswati if pre-Magh) at platform cost, validates video proof flow + payout flow. Pandit is `verified=true` only AFTER successful first test puja with Bengali recitation audio quality verified.

## Outreach scripts (Bengali-first, copy-adapt from Q1 Bengaluru deck)

- **Bengali script skeleton (verbatim, ~90 sec)**:
  > "নমস্কার পণ্ডিতজি, আমি দর্শ্য থেকে [Name] বলছি। আমরা একটি অনলাইন প্ল্যাটফর্ম যেখানে ভক্তরা ভেরিফাইড পণ্ডিতদের সাথে অনলাইনে পূজা বুক করতে পারে — ভিডিও প্রমাণ সহ। আমরা কলকাতায় ২৫ জন বাঙালি পণ্ডিতকে অনবোর্ড করছি দুর্গা পূজার আগে। NRI বাঙালি পরিবার তাদের কলকাতার বাড়ির পূজা রিমোটলি বুক করতে চান, এবং আমরা আপনার মতো অভিজ্ঞ পণ্ডিতের সাথে তাদের কানেক্ট করতে চাই। প্ল্যাটফর্ম কমিশন ২০-৩০%, পেমেন্ট ২৪ ঘন্টার মধ্যে আপনার ব্যাঙ্ক একাউন্টে। আপনার কি ১৫ মিনিট কথা বলার সময় হবে?"

- **Hindi fallback** (for non-Bengali-first second-call): adapt from R-Q1-S-003 Mumbai deck.
- **English fallback** (for younger/sabha-second-tier): standard pitch + emphasize NRI Bengali diaspora opportunity.

## KPI tracking

Live SELECT (per `kpi.query` in frontmatter — to be populated):

```sql
SELECT COUNT(*)
FROM "Priest" p
JOIN "User" u ON p.user_id = u.id
WHERE p.verified = true
  AND p.aadhaar_verified = true
  AND u.city ILIKE '%kolkata%';
```

Target: **25**. Run weekly. Snapshot to `docs/roadmap/_manual-kpis.yml` under key `verified_pandits_count_kolkata` until KPI scraper auto-pulls.

## Cross-link checkpoints

- **R-Q1-S-001 Bengaluru** + **R-Q1-S-003 Mumbai** + **R-Q2-S-002 Mumbai +25** — established 5-stage pipeline + KPI cadence. Reuse infra.
- **R-Q3 Durga Puja festival campaign** — if a separate roadmap item exists for Sep-Oct Durga Puja marketing push, ride that traffic. Onboarded Kolkata pandits must be `verified=true` by **mid-September 2026** to capture festival demand.
- **Antim Sanskar specialist segment** — 2 of 25 overlap with `antim-sanskar-pandits-onboarding-spec.md` Kolkata sub-batch.
- **NRI gift-puja pipeline** — Anand-persona expansion to Bengali diaspora. Coordinate with growth marketing on a `/gift?from=NRI&for=durga-puja-anjali` landing campaign in NJ/Houston/Bay-area Bengali association mailing lists in August.
- **Future east-expansion** (R-Q4+ Bhubaneswar, Guwahati) — Kolkata cohort doubles as referral pipeline for adjacent Bengali / Odia / Assamese regions.

## Success criteria (re-stated from frontmatter)

- [ ] **25 verified Kolkata pandits**, verified via SQL above.
- [ ] Each `verified=true AND aadhaar_verified=true` — business rule #4 payout gate met.
- [ ] Each onboarded via `/priest-onboarding` web flow with KYC + bank account.
- [ ] **Each has Bengali** in `Priest.languages` (non-negotiable). Hindi or English additionally.
- [ ] ≥10 pandits show active sessions in `/priest/bookings` dashboard within 14 days of verification.
- [ ] First test puja completed + video proof verified + Bengali recitation audio quality confirmed before flipping `verified=true`.
- [ ] At least 5 pandits available for live remote Durga Puja Anjali on **Maha Saptami / Ashtami / Navami 2026** (founder confirms calendar holds).

## Founder action checklist

- [ ] Engage 1 vetted Kolkata-resident sales-ops contractor (₹15-25k/mo, Bengali-mother-tongue mandatory) to handle Stage 1-2 (lead + first-call). Founder only owns Stage 3 (KYC video) onwards.
- [ ] Build initial target list of 35-40 leads (factor ~30% drop-off from lead → verified). Seed via:
  - Direct outreach to Kalighat + Dakshineswar temple trusts.
  - Belur Math / Ramakrishna Mission affiliations (warm intro via Mumbai ISKCON network if possible).
  - Bharat Sevashram Sangha + Bangiya Brahmin Sabha listings.
  - Bengali pandit listings on JustDial / Sulekha Kolkata category — cross-reference with sabha membership.
  - Q1/Q2 cohort referrals — ask current Mumbai/Bengaluru pandits if they know Kolkata counterparts (low yield expected; cohorts don't overlap regionally).
- [ ] Schedule 2x 4-day Kolkata recce sessions (early-Aug + mid-Sep). Block calendar. Sep trip must conclude before Mahalaya (start of Devi Paksha).
- [ ] Localize outreach scripts to Bengali (skeleton above; refine with native-speaker contractor).
- [ ] Validate `/priest-onboarding` accepts Bengali-script names + Salt Lake / New Town pincodes without rejection. File `eng` roadmap item with `depends_on: ["R-Q3-S-002"]` if any field-validation gap surfaces.
- [ ] Coordinate with growth on NRI Bengali diaspora marketing campaign (NJ/Houston/Bay-area Bengali association) — must launch ≥3 weeks before Mahalaya for Durga Puja capture.
- [ ] Update KPI weekly in `_manual-kpis.yml`.
- [ ] Mark item `status: shipped` + add `shipped_at` once SQL returns 25.

## Why this PR has no production code

This is a sales / outreach scaling task, not a build task. The platform already supports:

- `/priest-onboarding` flow (R-Q1-S-003 unblocked)
- Aadhaar verification + payout gate (live, business rule #4)
- `/priest/bookings` dashboard (Sprint 1 P0 wired)
- KPI SQL query (frontmatter)
- `Priest.languages` array field (Bengali tracking)
- Video proof MANDATORY for puja booking (business rule #1)
- NRI dual-currency checkout (Stripe Elements — Bengali gift-puja USD path)

What is missing is **execution** — 25 new humans recruited, KYC'd, and onboarded by Mahalaya 2026. Agent cannot do that. Best agent contribution is this structured handoff + KPI tracking + cross-link map + Bengali outreach script skeleton.

If during onboarding a code gap surfaces (e.g. Bengali-script name validation breaks, ghat-area pincode rejected, Tarpan-only service catalogue option missing, Durga Puja Anjali SKU not in `/pujas` catalogue) → file a new roadmap item under category `eng` with `depends_on: ["R-Q3-S-002"]` and link back here.

## Related

- **R-Q1-S-001** — Bengaluru 25 (founding cohort).
- **R-Q1-S-003** — Mumbai 25 baseline.
- **R-Q2-S-002** — Mumbai +25 cumulative 50 (most-recent equivalent).
- `docs/supply/hyderabad-pandit-onboarding-spec.md` — reusable script template.
- `docs/supply/antim-sanskar-pandits-onboarding-spec.md` — overlapping specialist segment (2 of 25 Kolkata sub-batch).
- `docs/supply/baps-swaminarayan-pipeline-spec.md` — adjacent Gujarati network (NOT applicable to Kolkata, included for cross-reference).
- `docs/company/05-sales.md` — sales playbook reference.
