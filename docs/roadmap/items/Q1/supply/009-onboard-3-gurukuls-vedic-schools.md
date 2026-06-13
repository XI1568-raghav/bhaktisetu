---
id: R-Q1-S-009
title: "Onboard 3 gurukuls (Vedic schools)"
category: supply
owner_role: sales
quarter: Q1
month_target: 2
priority: P2
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_gurukuls_count"
  current: 0
  target: 3
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 8000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 10
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: dossier shipped by sub-agent cycle 1 (target list ≥10, outreach templates EN+HI+WA+call, qualification rubric, follow-up cadence D0/D3/D7/D14/D30, acceptance) at docs/agent-reports/sales/R-Q1-S-009-*.{csv,md}. Ready for founder review of top-3 priority targets.

tags: ["supply","gurukul","p2"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: 2026-06-13T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
