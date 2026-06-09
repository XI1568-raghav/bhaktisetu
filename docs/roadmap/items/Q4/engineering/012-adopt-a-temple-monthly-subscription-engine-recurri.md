---
id: R-Q4-E-012
title: "Adopt-a-temple monthly subscription engine — recurring + temple share + 80G monthly"
category: engineering
owner_role: cto
quarter: Q4
month_target: 12
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-008"]
blocks: ["R-Q4-P-002"]

kpi:
  metric: "adopt_temple_active_subs"
  current: 0
  target: 500
  unit: "count"
  source: "razorpay"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["adopt-temple","recurring","subscription"]
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
