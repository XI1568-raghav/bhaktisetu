# R-Q3-S-001 Handoff — Onboard 25 verified pandits in Chennai (new city, south expansion)

> Status: founder-action-required. Engineering scaffold only — sales/ops execution required from founder + sales hire (when made).

## Spec source

`docs/roadmap/items/Q3/supply/001-onboard-25-verified-pandits-in-chennai-new-city-so.md` — placeholder body, success_criteria + agent_brief.prompt_skeleton are TBD. Bulk-imported 2026-06-09.

## Why this matters

Chennai is the third south-Indian metro after Bengaluru (R-Q2-S-001) and Hyderabad. Establishes the Tamil-Brahmin (Iyer/Iyengar/Madhva-Tamil) supply lane for Smarta + Sri Vaishnava puja SKUs that don't fully translate from Bengaluru-Kannada or Hyderabad-Telugu pandit pools. Chennai NRI corridor (US tech diaspora, Singapore/Malaysia) is the second-densest Tamil NRI cluster — supply gap here directly blocks Tamil-language NRI bookings.

Target month: July (Q3 start). 25 verified pandits = ~₹75k revenue impact (medium confidence, year-1 import).

KPI: `verified_pandits_count_chennai` (Supabase). Query TBD — wire to `Priest.aadhaarVerified=true AND (Priest.serviceCity LIKE '%Chennai%' OR Priest.serviceCity LIKE '%Madras%')` once schema query confirmed.

## Founder action items (sales execution)

### 1. Source 50 candidates (gate: 25 verified)

Chennai-specific channels:

- **Mathas / temple trusts**:
  - Kanchi Kamakoti Peetham (Smarta lineage) — official outreach via Sankara Math, Mylapore
  - Ahobila Math (Sri Vaishnava lineage) — Triplicane branch
  - Sri Parthasarathy Swami Temple, Triplicane — purohit roster
  - Kapaleeshwarar Temple, Mylapore — agama-trained purohit roster
  - Marundeeswarar Temple, Thiruvanmiyur
- **Community WhatsApp + Facebook groups**:
  - Tamil Brahmin Sabha (TBS) chapters
  - Iyer/Iyengar community Chennai groups
  - "Vadhyars of Chennai" Facebook
  - Kalakshetra alumni network (some are purohits)
- **Job platforms**:
  - LinkedIn: filter "purohit" / "vadhyar" / "priest" + Chennai
  - Justdial / Sulekha "pandit Chennai" listings — cold-call top 100
  - Apnaa / WorkIndia gig platforms — Chennai puja-services category
- **Referrals**:
  - Each Bengaluru-verified pandit (R-Q1-S-002, R-Q2-S-001) asked for 2 Chennai-side referrals (existing onboarding-fleet-v2 drip already does this; widen the prompt for Chennai)
  - Cross-state referrals from existing Telugu/Kannada pandits (many have Tamil counterparts via lineage marriages)

### 2. Verification pipeline (existing system, gate is Aadhaar + skill demo)

- Aadhaar OTP via existing `/api/v1/auth/aadhaar/*` endpoints
- 3-puja skill demo recorded on phone — Tamil-specific recommended set:
  - **Ganapathi Homa** (common across south)
  - **Satyanarayan Puja** (pan-India, baseline)
  - **Either**: Rudra Ekadashi / Sri Sukta Homa / Lakshmi Kubera Homa (Tamil-domain preferred over north-Indian Rudrabhishek for first listing)
- Reference call to one previous client (Tamil-language reference acceptable; admin notes to be in English)

### 3. Activation (post-verify)

- Priest portal walkthrough (15-min Zoom — Tamil-language option needed; founder or hired Tamil-speaking ops)
- First listing on `/priests` + `/pujas/[slug]/pandits` matrix
- Payout bank details (gated on `aadhaarVerified` per business rule #4)
- Tamil-language profile fields populated (display name in Tamil script + transliteration, signature pujas in Tamil)

## Engineering scaffold (this commit)

- This handoff doc.
- `Closes: Q-C-...-R-Q3-S-001` trailer on commit + PR.
- No code change — supply onboarding pipeline (priest signup → KYC → admin verify → activate) was shipped in prior sprints. See:
  - `apps/api/src/routes/priest-signup.ts`
  - `apps/api/src/routes/admin-priests.ts` (verify gate)
  - `apps/web/app/priest/onboarding/` flow
  - `scripts/agents/onboarding-v2/pundit.mjs` (daily drip agent — already running per onboarding-fleet-v2.yml cron)

### Tamil-language gap to close before activation

- [ ] Priest-portal Tamil i18n strings — currently English-only; pandit-facing UI needs `ta` translation pass (separate engineering item — propose new R-Q3-ENG-* if not already in queue)
- [ ] Public `/priests/[slug]` Tamil display-name + bio rendering — verify `lang="ta"` + Tamil-font fallback chain works at the existing route (likely already works since site-wide font supports Tamil, but spot-curl one Bengaluru pandit profile with synthetic Tamil display name to confirm before first Chennai pandit lists)

## Tracking

- Founder updates `docs/roadmap/_manual-kpis.yml` weekly with `verified_pandits_count_chennai` actual.
- Status stays `in_progress` until cumulative 25 verified land. When 25 hit + first paid puja booking from a Chennai pandit completes: flip item status to `shipped`, set `shipped_at` + `verified_at`.
- Tripwire: if <10 verified by end-of-July, escalate — reach out to Kanchi Math / Ahobila Math official channels directly (founder-to-founder).

## Deferred

- Real KPI Supabase query string population in `kpi.query` field (depends on confirming `Priest.serviceCity` field shape with prod data — to be done in next agent cycle once Chennai pandits start landing).
- `agent_brief.prompt_skeleton` population (sales-agent drip template — will be filled by next Decision Agent cycle, mirror R-Q2-S-001 with Chennai-specific channels above).

## Label

`founder-action-required` (sales execution, not engineering work).
