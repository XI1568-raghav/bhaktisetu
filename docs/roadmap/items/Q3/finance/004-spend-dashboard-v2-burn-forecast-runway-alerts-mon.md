---
id: R-Q3-F-004
title: "Spend dashboard v2 — burn forecast + runway alerts + monthly board pack auto-export"
category: finance
owner_role: cfo
quarter: Q3
month_target: 9
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "burn_dashboard_live"
  current: 0
  target: 1
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

tags: ["finance","burn","dashboard","runway"]
created_at: 2026-06-09T22:02:48.580Z
updated_at: 2026-06-09T22:02:48.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
