# Incorporate vs Sole-Prop — CFO Decision Brief

**Item**: R-Q1-F-001
**Date**: 2026-06-13
**Owner role**: cfo (agent-prepared brief; founder decision required)
**Status**: Brief only — founder must write outcome to `docs/company/00-orchestrator.md`

---

## Context

R-Q1-F-001 is a P0 founder-decision item: pick the legal entity vehicle for Darshya commercial revenue (L4 paid commerce + L5 subscription).

Prior decision doc shipped 2026-06-12: `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`. Recommendation in that doc = **keep Foundation, scope a `Bhaktisetu Tech Pvt Ltd` subsidiary when commercial revenue (L4+L5) exceeds 20% of total MRR for 2 consecutive months**. Current L4+L5 run-rate already at 26% of Q2 ₹5L MRR target — the tripwire is effectively pre-armed.

This brief consolidates the 3 options + tripwire one more time so the founder can sign the decision text without re-reading the long-form doc.

---

## Option matrix

### Option A — Section 8 Foundation only (status quo)

| Pro | Con |
|---|---|
| Already operating (80G + CSR-1 + donor trust + customer-facing copy live in repo) | Hard cap on commercial revenue mix before tax authority reclassifies as for-profit |
| Donor liability shield via Section 8 limited-liability | No ESOP vehicle for first eng / pandit-ops hire |
| Tax-exempt on charitable income, 80G receipts for donors | Investors (pre-seed onward) usually refuse to invest in Section 8 directly |
| Single annual ITR-7 + AGM, minimal compliance | Commercial revenue commingles with charitable surplus — auditor flag risk |

### Option B — Sole-Prop (founder personal PAN)

| Pro | Con |
|---|---|
| Zero setup cost | Unlimited personal liability — every customer dispute touches founder personal assets |
| No compliance overhead | Slab tax on first ₹X then 30% — punitive vs 22% corp tax |
| Instant Razorpay + Stripe onboarding under founder PAN | No equity vehicle, no ESOP, uninvestable |
| | Cannot host Foundation's 80G + commercial pricing under same brand cleanly |

### Option C — Bhaktisetu Tech Pvt Ltd (subsidiary, Foundation as 51%+ shareholder)

| Pro | Con |
|---|---|
| Limited liability shield for commercial revenue | ₹15k MCA incorp + ~₹50-80K annual CA + audit |
| ESOP-ready, investor-ready (preferred for pre-seed term-sheet) | Quarterly GST + annual ITR-6 + board AGM + Form AOC-4/MGT-7 |
| ~22% corporate tax slab vs personal slab | Founder must finalize 6 open Qs first (registration #s SoT, board composition, FCRA, founder stipend, asset ownership, bank account) |
| Foundation retains 80G charitable arm, subsidiary runs commercial L4+L5 | ~6-8 weeks to first board resolution + first GST filing |
| Clean SoT for tax authority — charitable vs commercial revenue segregated | |

### Option D — LLP (limited liability partnership)

Mentioned for completeness, dropped from recommendation: no ESOP vehicle, harder to investor-onboard than Pvt Ltd, similar compliance load. Skip.

---

## Recommended decision (CFO view)

**Keep Section 8 Foundation as primary entity NOW. Scope Bhaktisetu Tech Pvt Ltd subsidiary in Q2** — tripwire conditions:

1. L4+L5 commercial revenue exceeds 20% of total MRR for 2 consecutive months **OR**
2. Pre-seed term-sheet received from any investor **OR**
3. First commercial CA recommends Pvt Ltd before quarterly GST deadline

Current state: L4+L5 = ₹1.3L of ₹5L Q2 target = **26%** at run-rate. Tripwire #1 is effectively armed; founder should decide whether to act now or wait for 2-month confirmation.

---

## Founder action checklist (must complete to flip status → shipped)

- [ ] Sign decision text in `docs/company/00-orchestrator.md` (either "Keep Foundation + Pvt Ltd subsidiary on tripwire" OR "Continue Foundation-only until ₹X MRR")
- [ ] Create `docs/legal/foundation-registration-numbers.md` (founder-only, SoT for CIN / 80G / CSR-1 / PAN / TAN / GSTIN / bank account)
- [ ] Set quarterly L4+L5 commercial revenue tracking in `_manual-kpis.yml` (key: `commercial_revenue_mix_pct`)
- [ ] Decide on FCRA application timing for NRI USD strategy (blocks NRI lane real money flow)
- [ ] Answer 6 open Qs from `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`:
  1. Registration numbers SoT location
  2. Board composition (Foundation board vs Pvt Ltd subsidiary board overlap)
  3. FCRA application Q3 or defer to Q4
  4. Founder stipend from Foundation vs Pvt Ltd payroll
  5. Asset ownership (domain / IP / brand) — Foundation or subsidiary
  6. Bank account split (Foundation current + Pvt Ltd current + escrow)

Once signed, flip `_manual-kpis.yml`:

```yaml
incorp_decision_made: 1
```

…and add `shipped_at: 2026-MM-DDTHH:MM:SS.000Z` to `docs/roadmap/items/Q1/finance/001-decide-incorporate-vs-sole-prop-founder-decision-1.md` frontmatter under `status: shipped`.

---

## Cost snapshot

| Vehicle | One-time | Annual |
|---|---|---|
| Section 8 Foundation (existing) | ₹0 | ~₹25K CA |
| Pvt Ltd subsidiary scope | ₹15K MCA | ₹50K-80K CA + audit + GST quarterly |
| Sole-prop (rejected) | ₹0 | Personal slab tax (punitive) |
| LLP (rejected) | ₹8K MCA | ₹30K CA |

---

## References

- Long-form: `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`
- Roadmap item: `docs/roadmap/items/Q1/finance/001-decide-incorporate-vs-sole-prop-founder-decision-1.md`
- CFO playbook: `docs/company/03-cfo.md`
- Orchestrator: `docs/company/00-orchestrator.md`
- Legal: `docs/company/08-legal.md`

---

**Cannot agent-assign — founder decision only.** Brief delivered; founder reads, decides, writes outcome.
