---
id: R-Q1-CS-006
title: "WA blast 21 founder-network contacts asking 5 referrals each (warm intros)"
category: cs
owner_role: cs
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U7'
depends_on: []
blocks: []

kpi:
  metric: "wa_warm_intros_sent"
  current: 0
  target: 21
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
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-14: engineering hooks shipped (wa-warm-intro-helpers + tests). Blast itself
  is manual founder-action per docs/cs/R-Q1-CS-006-handoff.md — labeled
  founder-action-required on PR. KPI wa_warm_intros_sent flips to 21 once founder
  completes the 21-message blast and commits the manual-kpis update.

tags: ["warm-intro","wa","p0","founder-action-required"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
