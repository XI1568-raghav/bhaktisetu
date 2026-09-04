# R-Q3-F-002 — Unit Economics M9 Audit + Investor Board Memo (handoff)

> Status: PARTIAL — framework + data-pull plan + memo template shipped. Founder action required to populate live numbers from Supabase + PostHog + Razorpay dashboards. depends_on R-Q3-F-001 (Q3 forecast model) must be shipped before live numbers are credible.

> **Correction 2026-09-02 (`OPS-10`).** **Stripe was removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`, `apps/api/src/services/payment.service.ts:2438-2450`). Razorpay is the only live rail and it settles INR only; no replacement international processor has been chosen. This handoff routed four data pulls through a Stripe dashboard ("Stripe dashboard → Customers → first-payment timestamp", "Stripe: export Customers for same window. Filter NRI-only", a Razorpay/Stripe raw-data export link, and "Stripe dashboard access confirmed" as Block 2). None of those exist. Every Razorpay/Supabase/PostHog pull in this document is unaffected; the NRI cohort simply has no source data until an international rail exists, so its CAC/LTV cells stay `[verify]` rather than being filled from a substitute.

## Why this item exists

Month 9 is the first investor-credibility checkpoint where unit economics (CAC, LTV, payback period) and cohort retention curves can be cited from real data instead of plan numbers. The output is a board memo investors and the founder can both act on:

- **Investors:** confirms or kills the year-1 thesis (₹9 Cr base / ₹25 Cr stretch). Sets up Series Seed conversations.
- **Founder:** binary decision input for the four strategy tripwires in `ROADMAP.md` ("Two breaches same week → fold to NRI-only SKU").

## KPI

- Metric: `unit_econ_memo_published` (manual count, target 1)
- Source: `docs/roadmap/_manual-kpis.yml` after memo is published
- Trip: founder updates `last_updated` + sets `unit_econ_memo_published: 1` on publish day

## Audit framework (six sections the memo must cover)

### 1. Acquisition (CAC by channel)

| Channel | Spend M7-M9 | New paying users | CAC | Notes |
|---|---|---|---|---|
| Organic (SEO + referrals) | ₹0 attributed spend, opportunity cost only | TBD | ₹0 nominal | SEO surface ~500 URLs as of 2026-06-14 |
| WhatsApp drip (supply-onboarding-v2 fleet) | Resend + WA Cloud free-tier | TBD | TBD | 7 daily drip agents |
| NRI paid (Meta + Google) | TBD if any | TBD | TBD | Blocked until an NRI rail exists `[verify — Stripe was removed; the NRI rail is undecided]` |
| Referral program | Referral payout cost ÷ converted referees | TBD | TBD | `apps/api/src/routes/referrals.ts` |
| Founder direct outreach | Time × ₹/hr | TBD | TBD | Pandit + temple direct calls |

Data sources:
- `apps/web/lib/posthog.ts` events — `signup`, `payment_success` with `$current_url` + `utm_source`
- Razorpay dashboard → Settlements → Customer-level export
- _Removed 2026-09-02: this source read "Stripe dashboard → Customers → first-payment timestamp". No such dashboard exists._ `[verify — Stripe was removed; the NRI rail is undecided]`
- `referral_claims` table — Supabase (Prisma model in `apps/api/prisma/schema.prisma`)

### 2. Monetization (ARPU + LTV)

For each of the eight revenue lines documented in `docs/roadmap-archive.md`, compute:

- Paying users in cohort (anyone who paid ≥1 puja / consultation / store order between M7 D1 and M9 D30)
- Revenue per user per month (₹)
- Gross margin per user (after Razorpay 2%, platform commission 20-40%, priest payout, COGS for store)
- Repeat-purchase rate within 90 days

Naive LTV = ARPU × gross margin × expected lifespan (months). For first audit, use lifespan = 1 / churn-rate-monthly. If churn data is too thin, cap LTV at 12-month projected revenue (conservative — better to under-promise to investors).

### 3. Payback period

Payback (months) = CAC / (ARPU × gross margin per month)

Target per CEO doc: < 6 months blended, < 4 months NRI. If blended payback > 9 months, this is a tripwire flag — recommend in memo to either (a) cut paid channels (b) raise prices (c) pivot to NRI-only SKU per existing tripwire doctrine.

### 4. Cohort retention (Day 1 / 7 / 30 / 90)

Pull from PostHog cohorts (PostHog free tier supports retention reports). Bucket by signup month (M7 / M8 / M9). Columns: D1, D7, D30, D60, D90.

Existing tripwire from `ROADMAP.md`:
- NRI Day-30 retention < 25% by week 8 = strategy breach

Add new tripwire candidates:
- Indian Day-30 retention < 15% = product-market-fit gap
- Cross-lane usage (devotee touching ≥2 of 8 revenue lanes) < 10% = super-app thesis weak

### 5. Comparison vs plan

Side-by-side: plan number (from R-Q3-F-001 forecast) vs actual (this audit).

Variance > ±25% needs explanation. Variance > ±50% needs strategy revision.

### 6. Recommendations (3-5 bullets, investor-actionable)

The memo should not just report numbers — it should tell investors what the founder will do in M10-M12 in response. Examples of acceptable recommendations:

- "Pause paid NRI acquisition until D30 retention reaches 25% — current 18%."
- "Double down on referral channel — CAC ₹85 vs paid ₹420, retention parity."
- "Sunset gaushala-seva lane — 6 months in, < 0.5% revenue contribution, distracts ops."
- "Open Series Seed conversations now — payback 4.2 months blended beats benchmark."

## Memo template (drop-in)

```
# Unit Economics M9 Audit — Darshya
> Reporting period: M7 D1 - M9 D30 (YYYY-MM-DD to YYYY-MM-DD)
> Author: <founder>
> Reviewed by: <board observer / lead investor if any>
> Status: DRAFT / FINAL

## TL;DR (3 bullets, investor-facing)
- Blended CAC: ₹___ (target < ₹500). Payback: ___ months (target < 6).
- Top channel by CAC efficiency: ___. Top channel by absolute volume: ___.
- Decision: <continue current plan / shift to NRI-only / raise / pivot>.

## Section 1 — Acquisition
[table from framework section 1, with actual numbers]

## Section 2 — Monetization
[per-lane ARPU + gross margin + LTV table]

## Section 3 — Payback
[blended + per-channel payback]

## Section 4 — Cohort retention
[D1/D7/D30/D60/D90 by signup month, NRI vs Indian split]

## Section 5 — Plan vs actual variance
[side-by-side, flag > ±25%]

## Section 6 — Recommendations for M10-M12
[3-5 bullets]

## Appendix
- Raw data export: <link to Supabase query + PostHog dashboard + Razorpay export>
- Methodology notes: <how LTV was calculated, what assumptions>
- Tripwire status: <which of the 4 ROADMAP.md tripwires breached>
```

## Data-pull checklist (founder runs)

1. Confirm R-Q3-F-001 (Q3 forecast model) is shipped and numbers are agreed.
2. Supabase: run queries in `apps/api/scripts/check-prod-tables.mjs` first to confirm `users`, `bookings`, `consultations`, `orders`, `referral_claims` are all populated for M7-M9 window.
3. PostHog: create cohorts for M7, M8, M9 signup months. Export retention CSV.
4. Razorpay: export Settlements for M7 D1 - M9 D30. Filter Indian-only.
5. _Removed 2026-09-02: this step read "Stripe: export Customers for same window. Filter NRI-only." There is no NRI rail and no processor to export from._ `[verify — Stripe was removed; the NRI rail is undecided]`
6. Compute the six framework sections.
7. Draft memo using template above.
8. Have board observer / lead investor (or trusted CFO advisor) review before publishing.
9. Update `docs/roadmap/_manual-kpis.yml` with `unit_econ_memo_published: 1` on publish day.
10. Flip this item's `status: shipped` + set `shipped_at`.

## Founder-action items remaining (env / secret / decision)

- **Block 1:** R-Q3-F-001 must ship before this item produces credible numbers. Confirm forecast model is locked.
- **Block 2:** Supabase + PostHog + Razorpay dashboard access confirmed (the Stripe dashboard this line used to require does not exist `[verify — Stripe was removed; the NRI rail is undecided]`). (If any are not set up — e.g. PostHog key not pasted per U8 gate — that channel's data will be missing.)
- **Decision 1:** Approve cohort-window definition (signup month vs first-paid month). Affects retention numbers materially.
- **Decision 2:** Approve LTV methodology (capped 12-month vs 1/churn). Conservative cap recommended for investor memo.
- **Decision 3:** Who reviews the memo before publish. Recommend at minimum a CFO-shaped advisor + one current investor / advisor.

## Cross-references

- `ROADMAP.md` — four strategy tripwires this audit feeds into
- `docs/roadmap-archive.md` — eight revenue lines + year-1 ₹9 Cr / ₹25 Cr targets
- `docs/free-tier-budgets.md` — confirms all data sources stay on free tier through M9
- `apps/api/src/routes/referrals.ts` — referral attribution source
- `apps/web/lib/posthog.ts` — PostHog event helpers
- `scripts/agents/roadmap/cxo/cfo.mjs` — weekly CFO advisory agent that should reference this memo once published
