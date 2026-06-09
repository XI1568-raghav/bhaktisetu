---
id: R-Q1-E-011
title: Wire FCM server key (env-or-noop already in place)
category: engineering
owner_role: cto
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: 'U5'
depends_on: []
blocks: []

kpi:
  metric: fcm_push_live
  current: 0
  target: 1
  unit: count
  source: manual
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
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["mobile","push","fcm"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-09T21:28:52.338Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
