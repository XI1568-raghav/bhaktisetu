---
id: R-Q1-F-002
title: "Open separate business bank account + book-keeping spreadsheet"
category: finance
owner_role: cfo
quarter: Q1
month_target: 2
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-F-001"]
blocks: []

kpi:
  metric: "business_bank_open"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["finance","bank","p1"]
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
