# R-Q2-F-004 — Accelerator Applications (Antler INR + Surge USD)

> **Status**: in_progress — scaffold + founder-action checklist ready, founder submits applications.
> **KPI**: 3 accelerator applications submitted by end of Q2.
> **Owner**: cfo (founder).
> **Related**: `docs/finance/accelerator-applications-checklist.md` (preexisting general checklist).

## Why this matters

Pre-seed dilution-cheap capital + brand validation + structured 0-day mentorship pipeline. Antler India (₹) for domestic stack credibility; Surge by Sequoia (USD) for global investor signal pre-Series A.

Three submissions on the calendar = a 1-in-3 conversion target (industry hit rate 2-5%) on at least one cohort acceptance for ₹50L-₹2Cr cheque equivalent + 8-12 week residency.

## Accelerator targets (3 minimum)

| # | Program | Geo | Cheque | Equity | Cycle cadence | Why fit |
|---|---|---|---|---|---|---|
| 1 | **Antler India** | Bengaluru | ₹50L SAFE | 9.1% | Twice/year (Mar + Sep cohort) | Solo-founder friendly; INR-native; deep India consumer thesis. Devotional vertical pre-validated (Sri Mandir alum). |
| 2 | **Surge by Peak XV (Sequoia)** | Bengaluru / Singapore | $1M-$2M | 8-15% | Twice/year (rolling apps) | USD cheque + global investor network. NRI cross-border story resonates. Brand halo for Series A. |
| 3 | **Y Combinator** (stretch) OR **Techstars India** (safety) | SF / Bengaluru | $500K (YC) / $20K + $100K SAFE (TS) | 7% (YC) / 6% (TS) | Quarterly (YC) / Annual (TS) | YC = top brand globally; TS = mentor density. Pick one based on founder bandwidth — YC interview gauntlet is 6-8 weeks of prep. |

Optional 4th if bandwidth allows: **Sequoia Spark** (gender-focused, N/A if solo male) / **Lightspeed Extreme Entrepreneurs** / **AngelList India**.

## Financial requirements — by program

### Antler India

| Document | Format | Status | Notes |
|---|---|---|---|
| 1-pager teaser | PDF, 1 page | TBD | Hook + traction + ask. Use pitch-deck-v2 slide 1 as base. |
| Pitch deck v2 | PDF, 12-15 slides | TBD | Reuse `docs/finance/pitch-deck-v2-outline.md` (in_progress separately). |
| Financial model | XLSX, 3-yr | TBD | Pull from `docs/finance/pitch-deck-v2-financial-model.csv` (preexisting). Reformat into Antler's standard 3-tab (P&L / cap table / unit economics). |
| MRR proof | Screenshot | TBD | Razorpay dashboard + Stripe NRI dashboard (when U1+U2 KYC clears). Falls back to "₹0 MRR — pre-monetization, 18 paid pilots logged" honest framing. |
| Founder LinkedIn | URL | READY | Verify profile mentions Darshya + Poojly + role. |
| Cap table | PDF | TBD | Single founder 100%, no other holders. State explicitly. |
| GST + CIN | PDF | BLOCKED | Awaiting incorporation decision per `R-Q1-F-001` (Pvt Ltd vs sole prop). Antler will fund sole-prop founders and incorporate post-acceptance — state this in app. |

### Surge by Peak XV

| Document | Format | Status | Notes |
|---|---|---|---|
| Surge application | Web form | TBD | Form at peakxv.com/surge — ~45 minutes founder time. |
| Pitch deck | PDF, 10-12 slides | TBD | Same source as Antler — reformat to Sequoia template. |
| Financial model | XLSX | TBD | Same source. Add 5-yr projection tab — Surge wants longer horizon. |
| Founder video | 90 sec MP4 | TBD | Selfie video, founder + product clip. Loom-style. |
| Existing investor refs | Names + emails | N/A | Solo bootstrap, no current investors. State openly. |
| Customer references | 3 names + emails | TBD | Pull from 18 paid-pilot devotee list (request `temple-portal` admin export). |

### Y Combinator (if chosen as #3)

| Document | Format | Status | Notes |
|---|---|---|---|
| YC application | Web form | TBD | Form at ycombinator.com/apply — ~3-4 hours founder time. Brutally concise (50-word answers). |
| 1-min founder video | MP4 | TBD | YC's required intro video. Selfie + product demo. |
| Pitch deck (NOT required) | — | — | YC explicitly says don't send a deck. |
| Co-founder CV | — | N/A | Solo founder — flag in app. YC funds solo founders selectively. |
| Demo URL | URL | READY | https://darshya.online + https://api.darshya.online/health |
| Founder LinkedIn + GitHub | URLs | READY | Both should show consistent shipping cadence. |

## Submission checklist (per program)

- [ ] **D-14**: Confirm cycle date + deadline. Set calendar reminder D-7 + D-2.
- [ ] **D-10**: Refresh financial model with latest MRR + funnel numbers.
- [ ] **D-7**: Deck v2 final draft locked. Send to 2 peer founders for 24h critique.
- [ ] **D-5**: Incorporate critique. Final deck PDF exported.
- [ ] **D-3**: All supporting docs in single `docs/finance/applications/<program>-<YYYY-MM-DD>/` folder.
- [ ] **D-1**: Founder video recorded + uploaded to Loom/YouTube unlisted.
- [ ] **D-0**: Submit. Screenshot confirmation page. Forward confirmation email to `founder@darshya.online`.
- [ ] **D+1**: Log submission in `docs/finance/applications/_log.md` with timestamp + program + cycle + outcome ETA.
- [ ] **D+1**: Update `docs/roadmap/items/Q2/finance/004-*.md` KPI `current` field (+1 per submission).
- [ ] **D+1**: Tweet build-in-public note (optional but compounds visibility).

## Submission target dates (Q2 2026)

| Program | Target submit | Cycle decision ETA | Notes |
|---|---|---|---|
| Antler India | 2026-06-25 | 2026-08-10 (Sep cohort screen) | Earliest of 3 — apply first. |
| Surge by Peak XV | 2026-07-05 | 2026-09-15 (Surge 13 cohort screen) | Rolling apps — anytime. |
| YC W27 batch | 2026-08-10 (W27 deadline) OR Techstars India 2026-09-15 | YC W27 decision 2026-10-15 / TS 2026-10-30 | Founder picks based on bandwidth + appetite for SF onsite. |

## Reusable assets (build once, reuse 3x)

- `docs/finance/pitch-deck-v2-outline.md` — narrative spine
- `docs/finance/pitch-deck-v2-financial-model.csv` — 3-yr model
- `docs/finance/accelerator-applications-checklist.md` — preexisting general checklist (this doc extends with program-specific)
- `docs/finance/R-Q1-F-001-handoff.md` — incorporation decision (referenced)
- `docs/finance/series-a-prep-model.md` — longer-horizon model excerpts for Surge 5-yr tab
- `apps/web/public/og/default.png` — brand OG card for video thumbnails

## What's blocking founder

1. **Pitch deck v2** — separate roadmap item, currently in_progress.
2. **Razorpay live KYC** (U1) — closes MRR proof gap. Without it, app states "pre-monetization, 18 paid pilots." Honest framing acceptable but weaker than ₹X MRR receipts.
3. **Stripe NRI KYC** (U2) — closes USD MRR proof for Surge specifically (USD revenue strengthens USD-cheque pitch).
4. **Incorporation decision** (R-Q1-F-001) — Antler can fund sole-prop, but CIN strengthens app. Decision pending separately.

None of these block scaffold/checklist work. All block the actual submission date.

## Definition of done

- [ ] 3 applications submitted within Q2 (by 2026-06-30 or earliest possible Q3 cycle if Q2 deadlines passed).
- [ ] Each submission logged in `docs/finance/applications/_log.md`.
- [ ] KPI `current` field in `docs/roadmap/items/Q2/finance/004-*.md` updated to 3.
- [ ] Outcomes (accepted / rejected / interview) appended to log per program.
- [ ] If any acceptance: spawn new roadmap item for onboarding + cap-table prep.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Founder bandwidth — 3 apps in Q2 = ~40h total | Reuse deck + model across all 3. Build templates once. |
| Solo founder bias against acceptance | Lead with shipping velocity (200+ commits/mo) + autonomous agent fleet (24 daily agents) — proves execution. |
| Missing MRR proof | Frame as "pre-monetization by choice, 18 paid pilots validate WTP, KYC blocks resolve Q2." |
| No co-founder | YC + Surge both fund solo founders if traction is strong. Antler explicitly seeks solo founders. |
| Cycle deadlines miss | Each program has 2 cycles/year — worst case slip to Q3. |

## Status

- Scaffold + checklist: READY (this doc)
- Per-program requirement table: READY
- Submission target dates: READY
- Application submissions: **PENDING founder action**

Item stays `in_progress` until 3 applications confirmed submitted. Founder updates KPI on each submission.
