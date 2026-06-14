# R-Q3-S-003 Handoff — Onboard 25 verified pandits in Ahmedabad (new city, west expansion)

> Status: founder-action-required. Engineering scaffold only — sales/ops execution required from founder (or sales hire when made).

## Spec source

`docs/roadmap/items/Q3/supply/003-onboard-25-verified-pandits-in-ahmedabad-new-city-.md` — placeholder body, success_criteria + agent_brief.prompt_skeleton are TBD. Bulk-imported 2026-06-09. Category supply / priority P0 / month_target 8 / est_hours 36 / revenue_impact target ₹75k (projection).

## Why this matters

Ahmedabad is the first west-India metro for the supply network. Gujarat is high LTV for puja booking (BAPS Swaminarayan diaspora + Vaishno strong NRI sender corridor to US/UK/East Africa) and unlocks downstream Vadodara / Surat / Rajkot SKUs without a separate city pipeline. Cumulative target 25 verified pandits in Ahmedabad by end-of-Q3 (month_target 8 = August). Greenfield (no Q1/Q2 baseline — first cohort for the city).

KPI: `verified_pandits_count_ahmedabad` (Supabase). Query string TBD — wire to `Priest.aadhaarVerified=true AND Priest.serviceCity ILIKE '%Ahmedabad%' OR '%Amdavad%'` once schema query confirmed against `_kpi-supabase.mjs` allowed-table allow-list.

## Founder action items (sales execution)

1. **Source 50 candidates → 25 verified gate** (2× funnel per `5-gaushalas-onboarding-spec.md` precedent):
   - **Brahmin community channels**: Audich Brahmin Samaj (Ahmedabad chapter), Anavil Brahmin Samaj, Nagar Brahmin Samaj — WhatsApp + Telegram groups
   - **Mathas / mandals**: ISKCON Ahmedabad, BAPS Swaminarayan Akshardham (refer-out for non-Swaminarayan pujas), Jagannath Mandir Jamalpur, Hatkeshwar Mahadev
   - **Existing pandit referrals**: ask each Q1/Q2 verified pandit for 2 Ahmedabad referrals — already in `scripts/agents/onboarding-v2/pundit.mjs` daily drip
   - **LinkedIn**: filter `purohit OR pandit OR pujari` × location Ahmedabad
   - **Justdial / Sulekha**: pandit listings Ahmedabad — cold-call top 30 by rating
   - **Cross-source from Vadodara/Surat** if they cover Ahmedabad weekend slots (some pandits work multi-city)
2. **Verification pipeline** (existing system — gate is Aadhaar + 3-puja skill demo):
   - Aadhaar OTP via existing `/api/v1/auth/aadhaar/*` endpoints
   - 3-puja skill demo recorded on phone (Satyanarayan Katha / Rudrabhishek / Ganapathi Homa — most common Gujarat household pujas) → upload via priest-portal video proof flow
   - Reference call to one previous client (Hindi/Gujarati script in `docs/supply/hyderabad-pandit-onboarding-spec.md` adapt for Gujarati)
3. **Activation** (post-verify):
   - Priest portal walkthrough (15-min Zoom in Gujarati or Hindi)
   - First listing on `/priests?city=ahmedabad` + `/pujas/[slug]/pandits` matrix
   - Payout bank details (gated on aadhaarVerified per business rule #4 — shipped commit `85386ee`)
   - Welcome WhatsApp + first-booking incentive (₹500 bonus on first 3 completed pujas with video proof — per onboarding-fleet-v2 drip templates)

## Engineering scaffold (this commit)

- This handoff doc.
- `Closes: Q-C-...-R-Q3-S-003` trailer on commit + PR.
- **No code change** — supply onboarding pipeline (priest signup → KYC → admin verify → activate → payout) was shipped in prior sprints. Reuse:
  - `apps/api/src/routes/priest-signup.ts`
  - `apps/api/src/routes/admin-priests.ts` (verify gate)
  - `apps/web/app/priest/onboarding/` flow
  - `scripts/agents/onboarding-v2/pundit.mjs` (daily drip agent — already running per `onboarding-fleet-v2.yml` cron)

## Tracking

- Founder updates `docs/roadmap/_manual-kpis.yml` weekly with `verified_pandits_count_ahmedabad` actual.
- When cumulative hits 25: flip item status to `shipped` + set `shipped_at` + `verified_at` once first paid puja booking lands from one of the new 25.
- Tripwire: if <10 verified by end-of-July (month 7), escalate — re-source from Gujarat Brahmin Sabha apex contacts + ISKCON Ahmedabad temple coordinator referrals.

## City-specific notes (Ahmedabad)

- **Language mix**: Gujarati primary, Hindi secondary. Sanskrit mantra knowledge universal across pandits — language gap is in the WhatsApp comms, not in the puja delivery. Sales WA template must be Gujarati or Hindi (not English).
- **Diaspora corridor**: Gujarat → US (NJ/NY/CA) + UK (Leicester/London) + East Africa (Nairobi/Kampala). High NRI gift-puja volume potential — pandits doing local Ahmedabad pujas should expect ~25% NRI-sender bookings.
- **Cluster geography**: Ahmedabad pandits typically cover Gandhinagar (free) + Sanand + Adalaj — keep `serviceCity` field permissive, list secondary cities as comma-sep.
- **BAPS exclusion**: BAPS Swaminarayan pandits do not perform pujas for non-Swaminarayan deities. Filter at source — only sign non-BAPS Smartha/Vaishnava/Vaidika pandits.

## Deferred

- Real KPI Supabase query string population — depends on confirming Priest.serviceCity field shape (single string vs. array) in next Decision Agent cycle.
- agent_brief.prompt_skeleton population — sales-agent drip template will be filled by next Decision Agent cycle.
- Wire `verified_pandits_count_ahmedabad` into `apps/web/app/admin/roadmap/page.tsx` KPI panel once Supabase query confirmed.

## Label

`founder-action-required` (sales execution, not engineering work).
