---
id: R-Q1-P-002
title: "Audit + remove 8 portal pages with hardcoded mock arrays (CPO §1)"
category: product
owner_role: cpo
quarter: Q1
month_target: 2
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-P-001"]
blocks: []

kpi:
  metric: "mock_portals_cleaned"
  current: 0
  target: 8
  unit: "count"
  source: "gh_repo"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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

tags: ["product","mocks","p1"]
created_at: 2026-06-09T21:51:06.038Z
updated_at: 2026-06-09T21:51:06.038Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
