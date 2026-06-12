# Unit Economics M9 Audit — Template

> **Roadmap item**: R-Q3-F-002 (P0) · **Authored**: 2026-06-12 · **Target run date**: end of M9 (March 2027) · **Owner**: founder + CA

## Goal

By M9 (March 2027), Bhaktisetu should have 9 months of payment + booking + cohort data. Audit unit economics rigorously for investor pre-seed → Series A handoff.

## Formal definitions (Bhaktisetu-context)

### Customer

A unique `user_id` with ≥1 paid booking. Free signups don't count.

### Revenue per customer

Sum of all `payment.amount_inr` minus refunds, attributed to user. NOT GMV (GMV includes pandit/temple share which we don't keep).

### CAC (Customer Acquisition Cost)

Total customer-acquisition spend (months 1-9) / total customers acquired (months 1-9).

Per CLAUDE.md $0 marketing rule: paid CAC = ₹0. ORGANIC CAC = founder hours × ₹500/hr opportunity cost.

### LTV (Lifetime Value)

For India: average revenue per customer over Y1 + projected Y2-3 retention curve. Conservative: cap at 3-year horizon.

For NRI: 9x INR rate per business rule → much higher.

### Payback period

Months until LTV recovered. Target: <3 months for India, <1 month for NRI.

## Audit checklist (founder + CA — M9 + end of month)

```markdown
## Per-cohort retention

Pull from PostHog:
- [ ] M1 cohort: Day-0, Day-7, Day-30, Day-60, Day-90, Day-180 retention %
- [ ] M2 cohort: same
- [ ] M3 cohort: same
- [ ] ... through M9 cohort

Plot cohort retention chart. Investor will look at:
- Day-30 retention (>40% is excellent)
- Day-90 retention (>25% is strong)
- Day-180 retention (>15% means real product fit)

## Revenue distribution

- [ ] Total customers M1-M9: ____
- [ ] Total revenue M1-M9: ₹____
- [ ] ARPU (M9 average revenue per user): ₹____
- [ ] Median revenue per user: ₹____
- [ ] P95 revenue per user (top 5%): ₹____
- [ ] Customers w/ ≥3 bookings: ____ (= proxy for loyal segment)
- [ ] % revenue from top 20% of customers (Pareto check): ____% (>60% = high concentration risk)

## CAC

- [ ] Total founder hours M1-M9 on customer-acquisition (marketing + content + outreach): ____
- [ ] Opportunity cost ₹500/hr × hours = total CAC investment: ₹____
- [ ] Paid spend M1-M9 (should be ₹0): ₹____
- [ ] Total CAC: ____
- [ ] Customers acquired M1-M9: ____
- [ ] Avg CAC per customer: ₹____

## LTV calculation

Conservative (lifetime to date only):
- [ ] Total revenue / total customers = ARPU
- [ ] ARPU * gross margin % = contribution per customer
- [ ] Cumulative-to-date LTV: ₹____

3-year projected (using cohort retention curve):
- [ ] Y1 revenue/customer × retention curve = projected Y2+Y3
- [ ] Y1+Y2+Y3 cumulative projected LTV: ₹____
- [ ] LTV/CAC ratio: ____x (target: >3x for healthy SaaS-like business; >5x is strong)

## Payback period

- [ ] Months until cumulative-revenue-per-customer covers CAC: ____ months
- [ ] Target: <6 months for India; <2 for NRI

## Channel-level CAC

If R-Q3-E-009 affiliate tracking shipped:
- [ ] Reddit CAC: ₹____
- [ ] Twitter CAC: ₹____
- [ ] WA group CAC: ₹____
- [ ] Telegram CAC: ₹____
- [ ] Instagram CAC: ₹____
- [ ] Warm-network CAC: ₹____
- [ ] Channel mix recommendation (kill low-ROI channels): ____

## NRI vs India split

- [ ] NRI customer count: ____
- [ ] NRI revenue: ₹____
- [ ] NRI ARPU: ₹____ (should be ~9x India per business rule)
- [ ] NRI Day-30 retention: ____ % (tripwire: <25% → fold to NRI-only SKU rethink)
- [ ] NRI blended CAC: $____ (tripwire: >$40 → restructure NRI acquisition)
- [ ] NRI annual:per-puja revenue ratio: ____ (tripwire: <1:3 → product issue)
```

## Investor-ready summary table (paste in deck Slide 8)

```
                | India   | NRI   | Blended |
----------------|---------|-------|---------|
Customers M9    | ____    | ____  | ____    |
ARPU            | ₹____   | ₹____ | ₹____   |
Day-30 retain   | ____%   | ____% | ____%   |
LTV (3-yr proj) | ₹____   | ₹____ | ₹____   |
CAC             | ₹____   | $____ | ₹____   |
LTV/CAC         | ____x   | ____x | ____x   |
Payback months  | ____    | ____  | ____    |
Gross margin    | ____%   | ____% | ____%   |
```

## Red flags to call out (if any)

```markdown
- [ ] Day-30 retention <40% → product-fit gap
- [ ] LTV/CAC <3x → unit econ broken; pause growth, fix retention first
- [ ] Top 5% customers > 50% of revenue → too concentrated; expand mid-tier
- [ ] NRI tripwire fired (D30 <25% OR CAC >$40 OR annual:per-puja <1:3) → fold NRI-only thesis review
- [ ] Channel mix dominated by 1 source >70% → diversification risk
```

## Action plan from audit

```markdown
- [ ] Strong unit econ (LTV/CAC > 5x + Day-30 > 40% + payback < 3mo) → READY for Series A
- [ ] Medium (LTV/CAC 3-5x + Day-30 25-40%) → improve retention 90 days, then Series A
- [ ] Weak (LTV/CAC < 3x) → pause growth, fix product/retention first; pre-seed bridge round if needed
```

## Founder action

```markdown
- [ ] Set M9-end (March 2027) calendar reminder
- [ ] Run audit checklist above; fill into docs/finance/unit-econ-m9-audit-2027-03.md
- [ ] CA review (formal accounting reconciliation)
- [ ] Update pitch-deck Slide 8 w/ real numbers
- [ ] If red flags: file remediation tickets
- [ ] If green: kick off Series A investor pipeline
```

## Out of scope

- M3 / M6 mini-audits (lighter cadence; M9 is the deep audit)
- Per-puja-type unit econ (separate ticket if heterogeneity emerges)
- Customer-segment LTV (sampradaya / city / NRI-country level) — defer to v2
- Forecasting (use simple linear; ML forecasting overkill at this stage)

## Closes

R-Q3-F-002 — template shipped. Status flips to shipped after M9-end audit run + filled doc committed.
