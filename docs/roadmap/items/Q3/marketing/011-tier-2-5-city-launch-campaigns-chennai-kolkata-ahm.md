---
id: R-Q3-M-011
title: "Tier-2 5-city launch campaigns — Chennai+Kolkata+Ahmedabad+Jaipur+Lucknow"
category: marketing
owner_role: cmo
quarter: Q3
month_target: 9
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-G-003","R-Q3-G-004","R-Q3-G-005","R-Q3-G-006","R-Q3-G-007"]
blocks: []

kpi:
  metric: "tier2_city_mau_sum"
  current: 0
  target: 5000
  unit: "users"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 250000
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

tags: ["tier2","city","launch","campaign"]
created_at: 2026-06-09T22:02:53.908Z
updated_at: 2026-06-09T22:02:53.908Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
