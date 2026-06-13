---
id: R-Q3-P-005
title: "UGC reviews v2 spec — photo prompts + reviewer XP + verified pilgrim badge"
category: product
owner_role: cpo
quarter: Q3
month_target: 8
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-014"]
blocks: []

kpi:
  metric: "ugc_reviews_with_photo_pct"
  current: 0
  target: 30
  unit: "percent"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 30000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","ugc","reviews","trust"]
created_at: 2026-06-09T22:02:54.796Z
updated_at: 2026-06-09T22:02:54.796Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
