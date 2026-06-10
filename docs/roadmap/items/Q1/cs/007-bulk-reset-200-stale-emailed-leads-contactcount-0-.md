---
id: R-Q1-CS-007
title: "Bulk-reset 200 stale EMAILED leads → contactCount=0 if 0 reply+30d+role=TEMPLE"
category: cs
owner_role: cs
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "stale_leads_reset"
  current: 0
  target: 200
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.

tags: ["sql-reset","outreach","p0"]
created_at: 2026-06-10T20:35:05.804Z
updated_at: 2026-06-10T20:35:05.804Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
