---
id: R-Q4-G-001
title: "Australia launch full — Sydney + Melbourne + Brisbane diaspora + AUD checkout"
category: geo
owner_role: cmo
quarter: Q4
month_target: 10
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U3'
depends_on: ["R-Q3-G-002","R-Q4-S-004","R-Q4-M-012"]
blocks: []

kpi:
  metric: "au_paying_users_monthly"
  current: 0
  target: 500
  unit: "users"
  source: "stripe"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 1200000
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

tags: ["nri","au","launch","geo"]
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
