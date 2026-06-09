---
id: R-Q4-P-002
title: "Adopt-a-temple subscription spec — tiers + temple impact reports + 80G monthly"
category: product
owner_role: cpo
quarter: Q4
month_target: 11
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-012"]

kpi:
  metric: "adopt_temple_conversion_pct"
  current: 0
  target: 8
  unit: "percent"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 120000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","adopt-temple","subscription","recurring"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-09T22:09:25.940Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
