---
id: R-Q1-L-002
title: "Refund-policy stress test + real lawyer review"
category: legal
owner_role: legal
quarter: Q1
month_target: 3
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "refund_policy_lawyer_reviewed"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 15000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["legal","refunds","p2"]
created_at: 2026-06-09T21:50:21.017Z
updated_at: 2026-06-09T21:50:21.017Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
