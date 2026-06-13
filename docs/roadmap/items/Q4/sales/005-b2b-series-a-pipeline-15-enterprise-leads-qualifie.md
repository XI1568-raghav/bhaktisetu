---
id: R-Q4-SA-005
title: "B2B Series A pipeline — 15 enterprise leads qualified for FY27 Q1 close"
category: sales
owner_role: sales
quarter: Q4
month_target: 12
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-SA-002"]
blocks: ["R-Q4-F-002"]

kpi:
  metric: "b2b_qualified_leads"
  current: 0
  target: 15
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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

tags: ["b2b","pipeline","enterprise","series-a"]
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
