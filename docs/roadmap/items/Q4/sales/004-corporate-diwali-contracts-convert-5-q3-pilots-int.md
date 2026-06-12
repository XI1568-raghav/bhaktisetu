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

tags: ["b2b","corporate","diwali","contract"]
created_at: 2026-06-09T22:09:26.259Z
updated_at: 2026-06-09T22:09:26.259Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
