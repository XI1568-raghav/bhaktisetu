---
id: R-Q1-IT-005
title: "Rotate leaked Resend API key + update Render env"
category: it
owner_role: it
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U12'
depends_on: ["R-Q1-IT-004"]
blocks: []

kpi:
  metric: "resend_key_rotated"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 1
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.

tags: ["security","rotation","p0","u12"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-10T20:11:37.313Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
