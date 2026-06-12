---
id: R-Q1-IT-003
title: "Sentry DSN setup (CF Pages + Render)"
category: it
owner_role: it
quarter: Q1
month_target: 2
priority: P1
status: shipped
agent_assignable: true
founder_blocker: 'U6'
depends_on: []
blocks: []

kpi:
  metric: "sentry_dsn_active"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
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

tags: ["observability","sentry","errors","p1"]
created_at: 2026-06-09T21:50:47.096Z
updated_at: 2026-06-09T21:50:47.096Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
