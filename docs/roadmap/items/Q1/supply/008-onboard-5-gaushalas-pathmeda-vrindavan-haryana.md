---
id: R-Q1-S-008
title: "Onboard 5 gaushalas (Pathmeda + Vrindavan + Haryana)"
category: supply
owner_role: sales
quarter: Q1
month_target: 2
priority: P2
status: blocked
agent_assignable: true
founder_blocker: "Founder must dial T1 gaushala prospects per outreach kit in docs/agent-reports/sales/R-Q1-S-008-*. Agent artifacts shipped."
depends_on: []
blocks: []

kpi:
  metric: "verified_gaushalas_count"
  current: 0
  target: 5
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 15000
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
  2026-06-13: agent prepared target list + outreach kit. Founder must dial T1 prospects. See docs/agent-reports/sales/R-Q1-S-008-*.

tags: ["supply","gaushala","adopt-a-cow","p2"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-13T05:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
