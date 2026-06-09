---
id: R-Q2-G-003
title: "Delhi soft launch — 25 pandits + 5 temples + 1K MAU"
category: geo
owner_role: sales
quarter: Q2
month_target: 5
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-S-003","R-Q2-S-006"]
blocks: []

kpi:
  metric: "delhi_mau"
  current: 0
  target: 1000
  unit: "users"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 100000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","delhi","new-city"]
created_at: 2026-06-09T21:55:18.035Z
updated_at: 2026-06-09T21:55:18.035Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
