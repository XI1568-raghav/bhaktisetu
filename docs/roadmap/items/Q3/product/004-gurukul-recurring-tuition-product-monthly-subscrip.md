---
id: R-Q3-P-004
title: "Gurukul recurring tuition product — monthly subscription + class scheduler + parent app"
category: product
owner_role: cpo
quarter: Q3
month_target: 9
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-008"]
blocks: []

kpi:
  metric: "gurukul_subscribers"
  current: 0
  target: 200
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
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

tags: ["product","gurukul","education","recurring"]
created_at: 2026-06-09T22:02:54.796Z
updated_at: 2026-06-09T22:02:54.796Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
