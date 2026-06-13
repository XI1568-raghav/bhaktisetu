---
id: R-Q3-SA-001
title: "Anchor temple chain LOI — ISKCON OR BAPS OR Sringeri signed (B2B SaaS)"
category: sales
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U6'
depends_on: ["R-Q2-SA-001","R-Q3-E-007"]
blocks: []

kpi:
  metric: "anchor_loi_signed"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "docs/roadmap/_manual-kpis.yml key=anchor_loi_signed (founder updates on LOI signature from ISKCON OR BAPS OR Sringeri central; target 1)"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Cannot agent-assign — founder action U6 (Sentry DSN) required for B2B SLO commitments before LOI countersign"
  - "1 LOI signed (ISKCON central OR BAPS Akshardham OR Sringeri Math)"
  - "LOI covers ≥10 federated temples + commercial split (20-40% per CTO platform-commission rule)"
  - "B2B Temple SaaS API v1 (R-Q3-E-007) demoed end-to-end before LOI ask"
  - "Builds on R-Q2-SA-001 ISKCON central LOI groundwork (5-temple pipeline)"

agent_brief:
  context_files: []
  prompt_skeleton: |
    Cannot agent-assign — founder action U6 (Sentry DSN for B2B SLO observability) required before LOI countersign.
    Sub-agent Sales can draft LOI template + redline support + commercial term comparison vs SriMandir/AppsForBharat (R-Q2-SA-001 carries the groundwork).
    Reference: docs/company/05-sales.md, scripts/agents/cold-temple-outreach.mjs (existing ISKCON pipeline), R-Q3-E-007 API readiness gate.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","anchor","loi","saas"]
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
