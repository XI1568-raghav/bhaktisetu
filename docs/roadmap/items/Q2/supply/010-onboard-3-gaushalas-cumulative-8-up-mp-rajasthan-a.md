---
id: R-Q2-S-010
title: "Onboard +3 gaushalas (cumulative 8 — UP + MP + Rajasthan additions)"
category: supply
owner_role: sales
quarter: Q2
month_target: 5
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-008"]
blocks: []

kpi:
  metric: "verified_gaushalas_count"
  current: 0
  target: 8
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 24000
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

tags: ["supply","gaushala","scale"]
created_at: 2026-06-09T21:55:22.029Z
updated_at: 2026-06-09T21:55:22.029Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
