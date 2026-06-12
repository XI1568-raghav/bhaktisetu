---
id: R-Q4-H-002
title: "On-call rotation v1 — 3-person rotation + PagerDuty + escalation matrix"
category: hr
owner_role: talent
quarter: Q4
month_target: 11
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-H-001","R-Q4-E-005"]
blocks: []

kpi:
  metric: "oncall_rotation_live"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["hr","oncall","pagerduty","ops"]
created_at: 2026-06-09T22:09:24.711Z
updated_at: 2026-06-09T22:09:24.711Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
