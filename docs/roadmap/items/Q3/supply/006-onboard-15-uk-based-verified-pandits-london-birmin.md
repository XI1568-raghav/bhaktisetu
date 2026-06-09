---
id: R-Q3-S-006
title: "Onboard 15 UK-based verified pandits (London + Birmingham + Leicester)"
category: supply
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-G-006"]
blocks: ["R-Q3-G-001"]

kpi:
  metric: "verified_pandits_count_uk"
  current: 0
  target: 15
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 180000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 48
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","uk","nri"]
created_at: 2026-06-09T22:02:56.063Z
updated_at: 2026-06-09T22:02:56.063Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
