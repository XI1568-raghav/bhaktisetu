---
id: R-Q4-SA-005
title: "B2B Series A pipeline — 15 enterprise leads qualified for FY27 Q1 close"
category: sales
owner_role: sales
quarter: Q4
month_target: 12
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-SA-002"]
blocks: ["R-Q4-F-002"]

kpi:
  metric: "b2b_qualified_leads"
  current: 0
  target: 15
  unit: "count"
  source: "manual"
  query: "grep -c '| qualified |' docs/sales/trackers/b2b-series-a-enterprise-pipeline.md"

revenue_impact:
  amount_inr: 5000000
  confidence: medium
  basis: "Target ₹50L+ B2B pipeline by Q4-end per spec — 2 signed contracts × avg ₹25L setup."

est_hours: 28
est_cost_inr: 0

success_criteria:
  - "Pipeline kanban tracker shipped with 5 tier categories"
  - "Qualification 4-point rubric documented"
  - "18+ named accounts seeded across 5 tiers"
  - "Founder closes 15 qualified leads by Q4-end"
  - "5 pilot agreements in discussion"
  - "2 contracts signed"

agent_brief:
  context_files:
    - "docs/sales/b2b-series-a-pipeline-spec.md"
    - "docs/sales/trackers/b2b-series-a-enterprise-pipeline.md"
    - "docs/sales/R-Q4-SA-005-handoff.md"
    - "docs/sales/strategic-partnerships-matrix-15.md"
    - "docs/sales/cold-email-templates-10-use-cases.md"
  prompt_skeleton: |
    Maintain pipeline tracker + cadence reminders. Agent cannot fabricate buyer names or qualify leads.
    Founder owns: LinkedIn outreach, discovery calls, qualification rubric application, stage updates.
    On stage change in tracker: surface weekly digest in agent-fleet-summary; do NOT auto-update KPI from outreach text alone.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: spec + tracker + handoff shipped (R-Q4-SA-005 batch). Founder owns 15-lead qualification.
  Status stays in_progress until 15 qualified leads counted in tracker grep.

tags: ["b2b","pipeline","enterprise","series-a"]
created_at: 2026-06-09T22:09:26.259Z
updated_at: 2026-06-09T22:09:26.259Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
