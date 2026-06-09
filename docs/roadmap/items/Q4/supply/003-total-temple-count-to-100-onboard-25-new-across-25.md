---
id: R-Q4-S-003
title: "Total temple count to 100 — onboard 25 new across 25 cities"
category: supply
owner_role: sales
quarter: Q4
month_target: 10
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-009"]
blocks: ["R-Q4-SA-001"]

kpi:
  metric: "verified_temples_total"
  current: 0
  target: 100
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 48
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","temple","scale","coverage"]
created_at: 2026-06-09T22:09:26.554Z
updated_at: 2026-06-09T22:09:26.554Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
