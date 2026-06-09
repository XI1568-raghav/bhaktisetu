---
id: R-Q4-E-011
title: "Festival pre-sale calendar — Diwali/Navratri/Karwa-Chauth bookings 60d in advance"
category: engineering
owner_role: cto
quarter: Q4
month_target: 11
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "festival_pre_sale_bookings"
  current: 0
  target: 5000
  unit: "count"
  source: "razorpay"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 1500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 28
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["festival","pre-sale","calendar","commerce"]
created_at: 2026-06-09T22:09:23.580Z
updated_at: 2026-06-09T22:09:23.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
