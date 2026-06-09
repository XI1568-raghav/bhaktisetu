---
id: R-Q3-G-001
title: "UK launch — landing page + Stripe GBP + 1.5K paid NRI users (London/Birmingham/Leicester)"
category: geo
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U2'
depends_on: ["R-Q2-G-006","R-Q3-S-006"]
blocks: ["R-Q3-L-002","R-Q3-M-009"]

kpi:
  metric: "uk_paid_users"
  current: 0
  target: 1500
  unit: "users"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 750000
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

tags: ["geo","nri","uk","launch"]
created_at: 2026-06-09T22:02:50.119Z
updated_at: 2026-06-09T22:02:50.119Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
