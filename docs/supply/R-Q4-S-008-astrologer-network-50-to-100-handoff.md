# R-Q4-S-008 Handoff — Astrologer Network 50 → 100 (Q4)

> Status: founder-action-required. Engineering scaffold only — sales/ops execution required from founder (or sales hire when made).

## Spec source

- Roadmap item: `docs/roadmap/items/Q4/supply/008-astrologer-network-50-100-onboard-50-verified-astr.md` (bulk-imported placeholder body, success_criteria TBD)
- Detailed spec: `docs/supply/astrologer-network-50-to-100-spec.md` (authored 2026-06-13)
- Depends on: R-Q3-S-008 (20→50 Q3 base)
- Category: supply / Priority: P1 / Month target: 12 / Est hours: 40 / Revenue impact target: ₹2L (projection)

## Why this matters

Q4 doubles the verified astrologer pool from 50 → 100 — depth across 7 specializations (Vedic kundli + transit, Lal Kitab, Numerology, Tantra Devi specialist, Western+Vedic fusion for NRI, Tarot+crystal cross-tradition, Vaastu). Pricing tier expansion adds Specialist ₹8000 (kundli + Tantra + remedies bundle). Geographic spread: 30 India (10 BLR + 6 MUM + 5 DEL + 4 CHN + 5 distributed) + 12 NRI (Bay Area + NJ + London + Toronto + Sydney) + 8 remote-only.

Targets (projection): 100 astrologers cumulative · 200+ consultations/mo · ₹3L+ astrology MRR · 4.7+ avg rating.

KPI: `astrologers_verified_total` (Supabase). Query string TBD — wire to `Astrologer.verified=true` (or equivalent column once schema confirmed against `_kpi-supabase.mjs` allow-list).

## Founder action items (sales execution)

1. **Source 100 candidates → 50 verified gate** (2× funnel per supply onboarding precedent):
   - **Existing astrologer referrals**: ask each of the 50 Q3-verified astrologers for 2 referrals each — daily drip via `scripts/agents/onboarding-v2/astrologer.mjs`.
   - **Specialization-specific channels**:
     - Vedic kundli + transit: Bharatiya Vidya Bhavan / KP Stellar Astrology forums / IAA (Indian Astrology Association).
     - Lal Kitab: Lal Kitab samitis (Punjab/Haryana hubs).
     - Numerology: Cheiro/Sepharial study groups + Chaldean numerology trainers.
     - Tantra (Devi specialist): Kamakhya/Tarapith pilgrim networks — careful verify (high-impostor segment, demand recorded sadhana lineage).
     - Western+Vedic fusion (NRI): AFA (American Federation of Astrologers) cross-listed Indian-origin astrologers + CVA (Council of Vedic Astrology US).
     - Tarot + crystal: India Tarot Society + cross-tradition wellness circuits.
     - Vaastu: IIVS (Indian Institute of Vaastu Science) certified consultants.
   - **NRI corridor**: 12 NRI seats — Bay Area astrology meetups (Sunnyvale Hindu temple events), NJ Hindu Cultural Society, London Bharatiya Vidya Bhavan, Toronto Hindu Federation, Sydney Hindu Council. Filter by India-born + 5y+ practice.
   - **Cross-source from R-Q3-S-008 backlog**: any Q3 candidates who didn't make the verified-50 cut but were borderline — re-evaluate for Q4.

2. **Verification pipeline** (existing system — gate is credential + 2-consultation skill demo):
   - Astrologer signup via `/astrologer/onboarding/` flow (existing).
   - Credential upload: certification scan + lineage/guru reference letter (Tantra/Lal Kitab specialists).
   - 2-consultation skill demo (recorded with paid mock client, 30min each in primary specialization) → admin reviews against rubric.
   - Reference call to one previous paying client (script in `docs/supply/hyderabad-pandit-onboarding-spec.md` — adapt for astrology).
   - Aadhaar OTP via existing `/api/v1/auth/aadhaar/*` (India seats only). NRI seats: passport + W-9/W-8BEN equivalent for payout.

3. **Activation** (post-verify):
   - Astrologer portal walkthrough (15-min Zoom in preferred language).
   - First listing on `/astrologers?specialization=<...>` + per-specialization category page.
   - Pricing tier assignment per spec (Basic / Premium / Deep / Specialist).
   - Payout details — Razorpay India OR Stripe Connect international.
   - Welcome WhatsApp / email + first-booking incentive (₹500 bonus on first 3 completed consultations with 4.5+ rating — per onboarding-fleet-v2 drip templates).

## Engineering scaffold (this commit)

- This handoff doc.
- `Closes: Q-C-...-R-Q4-S-008` trailer on commit + PR.
- **No code change** — astrology onboarding pipeline (signup → KYC → admin verify → activate → payout) was shipped in prior sprints. Reuse:
  - `apps/api/src/routes/astrologer-signup.ts` (if present) OR `astrologer-portal.ts`
  - `apps/api/src/routes/admin-astrologers.ts` (verify gate)
  - `apps/web/app/astrologer-portal/`
  - `scripts/agents/onboarding-v2/astrologer.mjs` (daily drip — already running per `onboarding-fleet-v2.yml` cron)

## Tracking

- Founder updates `docs/roadmap/_manual-kpis.yml` weekly with `astrologers_verified_total` actual.
- When cumulative hits 100: flip item status to `shipped` + set `shipped_at` + `verified_at` once first paid Specialist-tier consultation lands.
- Tripwire: if <30 net-new verified by end-of-November (month 11), escalate — re-source from specialization apex bodies (CVA / IAA / IIVS) + dedicated WhatsApp blast to existing 50.

## Specialization-specific notes

- **Tantra Devi specialist**: highest impostor rate. Require recorded sadhana lineage (guru name + paramparā chain) + 1 reference from current senior Tantra acharya. Default-reject if unable to demonstrate Sri Yantra puja or basic Devi-Bhagavata recitation.
- **NRI seats (12)**: dual-currency consultation pricing handled by existing offering checkout flow. Specialist tier ₹8000 = ~$96 (auto-converted) — verify Stripe Connect KYC complete before activation.
- **Remote-only (8)**: no city tag — must surface on `/astrologers?mode=remote` index. Currently powered by existing astrologer listing — verify mode filter exists or scope follow-up engineering item.
- **Cross-tradition (Tarot/crystal)**: 4 seats only — keep as "wellness-adjacent" category, not core Vedic. Pricing capped at Premium ₹3000 (no Specialist tier eligibility).

## Deferred

- Real KPI Supabase query string population — depends on confirming Astrologer table schema in next Decision Agent cycle.
- agent_brief.prompt_skeleton population — sales-agent drip template will be filled by next Decision Agent cycle.
- Specialist ₹8000 tier wiring: verify offering record exists with `tier=specialist` + correct dual-currency Stripe + Razorpay product IDs. Scope: separate engineering item if missing.
- `/astrologers?mode=remote` filter: verify exists; if missing, scope separate web item.
- Founder updates roadmap item file once first 10 Q4 verifications land — flip status from `in_progress` → keep `in_progress` until 50 net-new threshold reached.
