---
id: R-Q4-F-003
title: "Profitability M12 audit — confirm M8+ profitable + audited financials Q4 close"
category: finance
owner_role: cfo
quarter: Q4
month_target: 12
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-F-002"]
blocks: []

kpi:
  metric: "profitable_months_streak"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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

tags: ["profitability","audit","financials","series-a"]
created_at: 2026-06-09T22:09:23.919Z
updated_at: 2026-06-09T22:09:23.919Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
