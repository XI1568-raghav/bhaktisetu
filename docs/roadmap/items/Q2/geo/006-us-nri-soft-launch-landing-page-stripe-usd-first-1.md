---
id: R-Q2-G-006
title: "US NRI soft launch — landing page + Stripe USD + first 100 paid users"
category: geo
owner_role: sales
quarter: Q2
month_target: 5
priority: P1
status: planned
agent_assignable: true
founder_blocker: 'U2'
depends_on: []
blocks: []

kpi:
  metric: "us_nri_paid_users"
  current: 0
  target: 100
  unit: "users"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 300000
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

tags: ["geo","nri","us","soft-launch"]
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
