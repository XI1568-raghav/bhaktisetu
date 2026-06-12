---
id: R-Q4-P-002
title: "Adopt-a-temple subscription spec — tiers + temple impact reports + 80G monthly"
category: product
owner_role: cpo
quarter: Q4
month_target: 11
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-012"]

kpi:
  metric: "adopt_temple_conversion_pct"
  current: 0
  target: 8
  unit: "percent"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 120000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: SHIPPED. docs/specs/adopt-a-temple-v1.md authored end-to-end:
    - Goal + Non-goals (recurring only, not gift/group v1)
    - 4 Personas (Bengaluru IT / Mumbai biz / Acme CSR / NRI San Jose)
    - 4 pricing tiers (Bronze ₹500 / Silver ₹2K / Gold ₹5K / Corporate ₹25K+) w/ 15% platform fee transparency
    - User journey (subscribe → monthly debit → impact PDF → annual 80G receipt)
    - 3 SQL data model tables (temple_subscription + temple_subscription_charge + temple_impact_report) w/ enums + indexes
    - 10 API endpoints + 1 Razorpay subscription webhook handler (subscription.charged/cancelled/payment_failed)
    - 7 UI wireframes (temple-page CTA / tier picker / subscriber dashboard / impact PDF layout / admin disburse / cancel-flow / annual receipt)
    - Test plan: 18 cases for engineering (11 API integration + 3 service + 1 PDF + 3 frontend)
    - MVP v1/v2 cut-line (Razorpay+Stripe in v1; auto-disbursement + corporate tier in v2)
    - 10 Open Questions for founder review (disbursement cadence, gateway routing, 80G timing, cancel taxonomy, pause max, proration, video SLA, retry policy, supporters opt-in default, refund window)
  Unblocks R-Q4-E-012 engineering pickup. Status stays planned on E-012 until founder answers the 10 open Qs.
  Closes: Q-C-20260612T0001-R-Q4-P-002.

tags: ["product","adopt-temple","subscription","recurring"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-12T06:30:00.000Z
shipped_at: 2026-06-12T06:30:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
