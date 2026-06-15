# R-Q4-S-003 Handoff — Total temple count to 100 (onboard 25 new across 25 cities)

> Status: founder-action-required. Engineering scaffold only — sales/ops execution required from founder + sales hire (when made).

## Spec source

`docs/roadmap/items/Q4/supply/003-total-temple-count-to-100-onboard-25-new-across-25.md` — placeholder body, success_criteria + agent_brief.prompt_skeleton are TBD. Bulk-imported 2026-06-09.

## Why this matters

100 verified temples is the platform credibility threshold for both NRI trust ("they have temples in my home town") and Sri Mandir parity. The 25-new-across-25-cities geographic spread (vs density-deepening in existing metros) directly attacks Sri Mandir's coverage moat — single-temple presence in a tier-2 city outranks zero presence in SEO city-level searches ("puja in {city}" long-tail).

Depends on: `R-Q3-S-009` (presumed prior temple-onboarding gate). Blocks: `R-Q4-SA-001` (sales/account follow-up gated on 100-temple inventory).

Target month: October (Q4 start). Year-1 revenue projection: ₹2,00,000 (medium confidence, year-1 import).

KPI: `verified_temples_total` (manual source until query confirmed). Final query target: `Temple.verificationStatus='verified' AND Temple.isActive=true` count from Supabase via Prisma. Query string to be populated in `kpi.query` field after first onboarding wave confirms field shape against prod schema.

## Founder action items (sales execution)

### 1. City target list (25 cities — geographic spread, not density)

Prioritize cities with **zero current temple presence** over deepening existing metros. Recommended target distribution drawn from `_bulk-input-q4-supply.csv` patterns + existing city handoffs (Delhi, Hyderabad, Pune already have dedicated specs):

**Tier-1 metros (5 cities, 1 temple each)** — fill gaps not already covered:
- Kolkata, Ahmedabad, Surat, Lucknow, Kanpur

**Tier-2 pilgrim hubs (10 cities, 1 each)** — high SEO value + diaspora-known names:
- Mathura, Vrindavan, Haridwar, Rishikesh, Ujjain, Nashik, Tirupati, Madurai, Rameswaram, Dwarka

**Tier-2 regional capitals (5 cities, 1 each)** — supply-coverage moat:
- Bhopal, Patna, Ranchi, Bhubaneswar, Guwahati

**Tier-3 / cultural-belt cities (5 cities, 1 each)** — long-tail SEO + community trust:
- Kanchipuram, Kumbakonam, Pushkar, Somnath, Konark

Spread is the explicit success criterion (25 cities, not 25 temples in 5 cities). Founder + sales hire must resist concentration temptation when 1 city yields 2-3 willing temples — push 2nd+3rd into the **next** quarter pipeline instead and keep this Q4 cohort at 1 temple per new city.

### 2. Sourcing channels (per city)

- **Temple trusts / management committees** — direct outreach via temple office:
  - Use city-specific Math / Trust pages (Ramakrishna Mission branches, ISKCON regional, BAPS regional, regional Shankara Math)
  - For pilgrim hubs: official tourism board temple registries (UP-Tourism for Mathura/Vrindavan/Ayodhya, Uttarakhand for Haridwar/Rishikesh, etc)
- **Existing-pandit referrals** — every verified pandit (R-Q1-S-002, R-Q2-S-001, R-Q3-S-001) asked for 1 temple referral in any new city (existing `onboarding-fleet-v2` drip prompt should be widened with the 25-city list)
- **Local devotional WhatsApp / Facebook groups** per city — ask for "trustee / kainkarya seva contact for {temple name}"
- **Justdial / Sulekha / Google Business** temple listings — cold-outreach top-rated temples per city
- **Press / blog mentions** of recently renovated / inaugurated temples in tier-2 cities (Patna, Ranchi, Guwahati especially) — fresh-renovation temples want digital presence
- **Diaspora bridge** — NRI users (per `Lead.source='nri-landing'`) often have hometown-temple priest contacts; survey-prompt existing NRI waitlist for "temple in your hometown we should onboard" — only contact public-domain temple offices, not the NRI directly per consent rules

[VERIFY-FOUNDER] — Specific trust officer / temple manager contact list per city to be sourced + maintained by founder + sales hire. **DO NOT** fabricate names, emails, or phone numbers in any agent output, sales collateral, or admin notes. Use `[VERIFY-FOUNDER]` placeholder or `{{token}}` template var until verified.

### 3. Verification pipeline (existing system)

Existing temple-onboarding flow gates on:

- Temple-trust registration proof (Society Registration Act / Public Trust Act certificate scan)
- PAN of trust / temple
- 80G registration (where applicable — projection: 60% of tier-2 temples have 80G; 100% of pilgrim-hub temples; 30% of tier-3)
- Designated temple manager contact (verified via reference call to trust secretary OR phone-verified via temple-published official number, not WhatsApp-only)
- Bank details for payouts (Aadhaar-verified trustee, NEFT/IMPS only — no UPI for trust payouts per RBI norms)
- Recorded video walkthrough of temple interior (mandatory for live-darshan SKU eligibility; optional for puja-only SKU)
- Signed MoU specifying:
  - Commission slab (20-40% per business rule #3 — exact split per temple)
  - Video-proof SLA (per business rule #1 — every puja booking gets video proof or full refund)
  - Cancellation policy (24h window per business rule #5)
  - Data-handling: temple consent for sharing aarti schedule + festival calendar with Bhaktisetu for SEO content (DPDP §6 consent)

### 4. Activation (post-verify)

- Temple-portal walkthrough with designated temple manager (15-30 min Zoom; regional-language support needed for tier-3 cities — founder coordinates with city-local interpreter from existing pandit network)
- First 3 SKUs listed:
  - At minimum: 1 puja booking SKU + 1 live-darshan slot
  - Pricing set by temple manager (Bhaktisetu provides reference range from comparable verified temples, no platform-imposed price)
- Test booking by founder using staff account (booking flows end-to-end, video proof uploaded, 80G receipt issued, payout reconciliation visible in temple-portal)
- Press-release moment: add temple to `/temples/[slug]` programmatic-SEO page (existing route; populates from DB), surface in city-level `/city/[slug]` page (existing programmatic-SEO route, P11 batch), trigger `gsc-submitter` IndexNow ping for new URLs

## Engineering scaffold (this commit)

- This handoff doc.
- `Closes: Q-C-...-R-Q4-S-003` trailer on commit + PR.
- No code change — temple-onboarding pipeline (temple signup → KYC → admin verify → activate → SKU listing) was shipped in prior sprints. See:
  - `apps/api/src/routes/temple-portal.ts` (manager dashboard)
  - `apps/api/src/routes/admin-temples.ts` (verify gate — admin-only)
  - `apps/web/app/temple-portal/` (manager UI)
  - `apps/web/app/admin/temples/` (admin moderation UI)
  - `scripts/agents/onboarding-v2/temple.mjs` (daily drip agent — already running per `onboarding-fleet-v2.yml` cron)

### Gaps to close before / during onboarding wave

- [ ] Regional-language temple-portal i18n — currently English + Hindi; tier-3 cities (Madurai, Tirupati, Bhubaneswar, Guwahati) need Tamil / Telugu / Odia / Assamese pass. Tracked separately as engineering item; **DO NOT** auto-publish auto-translated regional strings — must ship as DRAFT-tier per project pitfall rule on multilingual content.
- [ ] City-level temple grouping on `/city/[slug]` page — verify count badge ("12 verified temples") updates on temple verify-flip (existing programmatic-SEO route; may already work, spot-curl `/city/varanasi` after first Q4 temple lands to confirm)
- [ ] Tripwire alert: if a city reaches 3 candidate temples in pipeline but 0 verified after 6 weeks of outreach, escalate via `_alerts/` agent to founder for direct trustee call.

## Tracking

- Founder + sales hire update `docs/roadmap/_manual-kpis.yml` weekly with `verified_temples_total` count + per-city tally CSV.
- Status stays `in_progress` until cumulative count reaches 100 verified across all geographies AND 25 of those are in new (not previously onboarded) cities. When both thresholds hit: flip item `status: shipped`, set `shipped_at` + `verified_at`.
- Per pitfall warning (R2 lost 4 PRs to premature shipped-flip on founder-gated items): do NOT auto-flip status from agent runs. Founder confirms via PR comment + manual edit.
- Tripwire: if <10 new cities have verified temples by end of October, pause tier-3 outreach and concentrate sales hire on tier-1 + tier-2 pilgrim hubs only (revenue per booking is 2-3× tier-3 anyway; geographic-spread target re-baselines to 15 cities).

## Deferred

- Real KPI Supabase query string population in `kpi.query` field (depends on confirming `Temple.verificationStatus` enum values + `isActive` flag shape with prod data — to be done in next agent cycle once first Q4 temple lands).
- `agent_brief.prompt_skeleton` population (sales-agent drip template per city — will be filled by next Decision Agent cycle, mirror `delhi-temple-onboarding-spec.md` / `hyderabad-temple-onboarding-spec.md` / `pune-temple-onboarding-spec.md` patterns with the 25-city target list above).
- Post-100-temple announcement: press kit at `/press` already shipped (P2 batch). Update one-liner + facts row when KPI flips to 100.

## Compliance notes

- DPDP §6 consent — temple MoU includes data-sharing clause for SEO content (aarti schedule + festival calendar). Do NOT publish images of temple interior without explicit temple-trust written consent.
- DPDP §8(10) grievance officer — per platform-wide grievance officer designation (NOT §5(8)); temple-portal SLA for booking issues = 72 hours per Rule 7 of DPDP Rules 2025.
- No fabricated stats in temple-portal sales collateral. Use "target" / "projection" / "TBD" framing for any forward-looking number until temple goes live + reports first month of bookings.
- No "Featured in X" placeholders — Apple App Store Guideline 2.3.7 rejection grounds applies equally to web sales decks. Real press coverage only.

## Label

`founder-action-required` (sales execution, not engineering work).
