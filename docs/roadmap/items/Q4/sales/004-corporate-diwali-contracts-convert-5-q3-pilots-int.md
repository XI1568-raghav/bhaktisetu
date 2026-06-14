---
id: R-Q4-SA-004
title: "Corporate Diwali contracts — convert 5 Q3 pilots into ₹50L+ commitments"
category: sales
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-SA-005"]
blocks: []

kpi:
  metric: "corporate_diwali_revenue"
  current: 0
  target: 5000000
  unit: "inr"
  source: "manual"
  query: "manual-kpi-corporate-diwali-revenue-inr-sum-of-signed-contract-values-Oct-Nov-2026"

revenue_impact:
  amount_inr: 5000000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "5 corporate Diwali contracts signed by Nov 5 2026 totaling >= 50L INR"
  - "Each contract has signed PO + 50% advance via Razorpay invoice"
  - "Booking dates locked in admin/leads with status=CONVERTED + dealValue>=1000000"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - docs/ceo-roadmap-2026-05-27.md
    - apps/web/app/admin/leads/page.tsx
  prompt_skeleton: |
    Cannot agent-assign — founder action required.
    Sales requires founder relationship-driven outreach + contract negotiation + PO signing.
    Sub-agent can prep collateral (one-pager + ROI calculator + case-study deck) + draft cold emails
    + populate Lead rows via /admin/leads API. Founder owns calls + meetings + closing.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: Sub-agent prep collateral shipped — ROI calculator + cold email sequence (Day 0/3/7/14) + one-pager outline + case-study deck skeleton + Razorpay invoice/PO checklist + admin lead tracking spec + founder weekly cadence Aug-Nov. See `docs/sales/corporate-diwali-q4-sa-004-collateral.md`. Founder owns relationship-driven outreach + contract negotiation + PO signing motion; sub-agent cannot make calls, take meetings, sign LOIs, or negotiate commercial terms. Label: founder-action-required.

tags: ["b2b","corporate","diwali","contract","founder-action-required"]
created_at: 2026-06-09T22:09:26.259Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Diwali 2026 (Nov 8) corporate giving window is the largest single-quarter B2B revenue lever in year 1. Converting 5 Q3 CSR pilot conversations into signed ₹50L+ commitments delivers ₹5 Cr total — ~30% of Q4 revenue target. Each contract also anchors recurring renewals for Q4 2027 + Q4 2028, compounding the lifetime value beyond the immediate ₹5 Cr.

Bhaktisetu's edge in this segment:
- 80G auto-receipts (operational lift owned by Bhaktisetu Foundation, zero corp finance overhead)
- Monthly impact PDFs per donor (CSR reporting differentiator vs. unstructured devotional giving)
- Co-branded landing pages per corporate (employee-mobilization signal)
- 4,500+ verified temples integrated (depth no competitor matches)

# Sub-agent prep collateral (shipped 2026-06-14)

Full collateral pack: [`docs/sales/corporate-diwali-q4-sa-004-collateral.md`](../../../../sales/corporate-diwali-q4-sa-004-collateral.md)

Includes:
- 5-account target list (Tier 1-3 with founder action windows)
- ROI calculator formulas + TCS sample (₹21.6 Cr total commitment potential)
- 4-touch cold email sequence (Day 0 hook / Day 3 value / Day 7 social proof / Day 14 handoff)
- One-pager outline (founder generates Figma/Canva)
- 10-slide case-study deck skeleton (founder fills with Q3 pilot quotes)
- Razorpay invoice + PO checklist
- Admin lead tracking spec (`status=CONVERTED` + `dealValue ≥ 1,000,000`)
- Founder weekly cadence Aug 1 → Nov 5

# Founder action required

Sales motion = relationship-driven. Sub-agent cannot:
- Make phone calls / take meetings / sign LOIs
- Negotiate commercial terms (₹50L commitment / 50% advance / Razorpay invoice)
- Build CXO-level trust at TCS / Infosys / Tata Trusts / Reliance Foundation / Adani / Aditya Birla CSR teams

Cycle re-prep available on demand as Q3 pilot data lands.

# Reference material

- [`docs/sales/corporate-diwali-conversion-plan.md`](../../../../sales/corporate-diwali-conversion-plan.md) — original conversion plan
- [`docs/sales/corporate-diwali-gifting-spec.md`](../../../../sales/corporate-diwali-gifting-spec.md) — gifting product spec
- [`docs/sales/b2b-corporate-gifting-email-templates.md`](../../../../sales/b2b-corporate-gifting-email-templates.md) — adjacent email templates
- [`docs/company/04-sales.md`](../../../../company/04-sales.md) — sales charter
- [`docs/ceo-roadmap-2026-05-27.md`](../../../../ceo-roadmap-2026-05-27.md) — Q4 revenue plan
- `apps/web/app/admin/leads/page.tsx` — admin lead-tracking UI
