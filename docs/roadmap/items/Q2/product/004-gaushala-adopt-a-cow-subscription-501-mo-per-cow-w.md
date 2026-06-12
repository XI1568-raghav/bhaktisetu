---
id: R-Q2-P-004
title: "Gaushala adopt-a-cow subscription — ₹501/mo per cow w/ monthly video update"
category: product
owner_role: cpo
quarter: Q2
month_target: 6
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-S-010"]
blocks: []

kpi:
  metric: "adopt_a_cow_subscribers"
  current: 0
  target: 100
  unit: "users"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 50100
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

tags: ["product","gaushala","subscription","recurring"]
created_at: 2026-06-09T21:55:20.368Z
updated_at: 2026-06-09T21:55:20.368Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
