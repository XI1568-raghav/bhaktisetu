---
id: R-Q4-G-005
title: "Onboard new India city Nagpur (10 of 25 — central)"
category: geo
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-S-001"]
blocks: []

kpi:
  metric: "city_active_users_nagpur"
  current: 0
  target: 3000
  unit: "users"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 100000
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

tags: ["geo","india","nagpur","tier2"]
created_at: 2026-06-09T22:09:24.241Z
updated_at: 2026-06-09T22:09:24.241Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
