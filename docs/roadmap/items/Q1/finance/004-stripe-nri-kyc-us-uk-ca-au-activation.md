---
id: R-Q1-F-004
title: "Stripe NRI KYC (US/UK/CA/AU activation)"
category: finance
owner_role: cfo
quarter: Q1
month_target: 3
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: 'U2'
depends_on: []
blocks: []

kpi:
  metric: "stripe_live_active"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["fundraising","stripe","nri","kyc","p1"]
created_at: 2026-06-09T21:50:13.304Z
updated_at: 2026-06-09T21:50:13.304Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
