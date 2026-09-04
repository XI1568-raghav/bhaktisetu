# Series A Prep Model — 18-month Forecast + Cohort LTV + Market + Sensitivity

> **Roadmap item**: R-Q4-F-002 (P0) · **Authored**: 2026-06-13 · **Target**: Q4 (Feb 2027) — Series A pitch ready

## Goal

By Q4-end, Bhaktisetu has 9-12 months operational data. Build Series A-ready financial model.

## Model structure

### Sheet 1: Historical (M0-M12)

- Actual M1-M12 monthly revenue per lane
- Actual MAU + active subscriber + paying customer per month
- Actual gross margin per lane
- Actual operating cost (founder stipend + hires + infra + marketing)
- Actual net contribution per month

### Sheet 2: Forecast (M13-M30, 18 months)

Project forward by lane:
- L1 Puja bookings: extrapolate from M9-M12 growth rate, apply seasonality (festival peaks)
- L2 Adopt-temple subs: net new × retention curve
- L3 CSR: deal-based, lumpy
- L4 B2B SaaS: per-partner ARR ladder
- L5 Affiliate: % of L1+L2

### Sheet 3: Cohort LTV

- Per-acquisition-month cohort (M1-M12)
- Revenue per cohort month 0/1/3/6/12
- Cohort retention curve (Day-30, Day-90, Day-180, Day-365)
- Projected 36-month LTV per cohort

Cohort LTV = Σ(monthly revenue × retention) for 36 months.

Target: India cohort 36-month LTV ≥ ₹1,500 (= 3 paid bookings on average over 3 yrs). NRI ≥ ₹15,000.

### Sheet 4: Market sizing

```
India devotional spending TAM:
  1B Hindus × ₹2,000 avg annual ritual spend = ₹2 lakh crore
  Online-addressable (10-year horizon): 5% = ₹10,000 Cr
  Bhaktisetu addressable (verified-temple niche): 1% = ₹100 Cr
  Bhaktisetu 5-year capture target: 0.1% = ₹100 Cr ARR

NRI diaspora TAM:
  30M NRI Hindu × $200 avg annual = $6B = ₹50,000 Cr
  Bhaktisetu addressable: 2% = ₹1,000 Cr
  5-year target: 0.5% = ₹250 Cr ARR

Combined 5-year ARR target: ₹350 Cr (at 30% YoY = today's ₹5L MRR → ₹2.5 Cr ARR Year 1 → ₹15 Cr Y2 → ₹50 Cr Y3 → ₹150 Cr Y4 → ₹350 Cr Y5)
```

### Sheet 5: Sensitivity scenarios (Bear / Base / Bull)

| | Bear | Base | Bull |
|---|---|---|---|
| Q4-end MRR | ₹6L | ₹12.5L | ₹20L |
| Year-2 MRR | ₹15L | ₹50L | ₹100L |
| Year-3 ARR | ₹2 Cr | ₹10 Cr | ₹30 Cr |
| Series A ARR | ₹2 Cr | ₹5 Cr | ₹10 Cr |
| Series A valuation | $10M | $30M | $60M |
| Round size | $2M | $5M | $10M |

## Pitch to Series A investors

Target investors (different tier from pre-seed):
- Accel India
- Sequoia / Peak XV Partners
- Lightspeed India
- Nexus Venture Partners
- Matrix Partners

Use enriched deck (per F-001 + F-002 deck Q1-actuals addendum). Add new slides:
- Cohort retention chart
- Per-lane revenue breakdown chart
- Market sizing math
- Sensitivity scenario fan chart
- 18-month forecast + cash runway

## Founder action

- [ ] Q4-end: pull all M1-M12 actuals from Razorpay + PostHog + Supabase _(this line named Stripe as a fourth source; Stripe was removed 2026-08-11 and no replacement international processor has been chosen, so there is nothing to pull from it)_ `[verify — Stripe was removed; the NRI rail is undecided]`
- [ ] Build 5-sheet Google Sheet financial model
- [ ] CA + advisor review pre-investor send
- [ ] Pre-warm 5 Series A investors via mutual intros
- [ ] Send model + deck → 1-on-1 30-min calls

## Closes

R-Q4-F-002 — model spec shipped.
