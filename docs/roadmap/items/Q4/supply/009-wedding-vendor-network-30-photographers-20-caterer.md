---
id: R-Q4-S-009
title: "Wedding vendor network — 30 photographers + 20 caterers + 15 decorators verified"
category: supply
owner_role: sales
quarter: Q4
month_target: 11
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-010"]

kpi:
  metric: "wedding_vendors_verified"
  current: 0
  target: 65
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 80000
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

tags: ["supply","wedding","vendor","ecosystem"]
created_at: 2026-06-09T22:09:26.554Z
updated_at: 2026-06-09T22:09:26.554Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
