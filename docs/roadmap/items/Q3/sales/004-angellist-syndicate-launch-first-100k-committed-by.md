---
id: R-Q3-SA-004
title: "AngelList syndicate launch — first $100K committed by 20 angels"
category: sales
owner_role: sales
quarter: Q3
month_target: 8
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U4'
depends_on: ["R-Q3-SA-003"]
blocks: ["R-Q3-F-001"]

kpi:
  metric: "angellist_committed_usd"
  current: 0
  target: 100000
  unit: "usd"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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

tags: ["fundraising","angellist","syndicate","angels"]
created_at: 2026-06-09T22:02:55.221Z
updated_at: 2026-06-09T22:02:55.221Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
