---
id: R-Q1-F-001
title: "Decide incorporate vs sole-prop (founder decision #1)"
category: finance
owner_role: cfo
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "incorp_decision_made"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual KPI _manual-kpis.yml field incorp_decision_made (1 when founder writes decision in docs/company/00-orchestrator.md with rationale)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 1
est_cost_inr: 0

success_criteria:
  - "Founder writes decision in docs/company/00-orchestrator.md: 'Incorporate as Pvt Ltd' OR 'Continue sole-prop until ₹X MRR'"
  - "Rationale documented: liability shield need, tax bracket, investor-readiness, ~₹15k incorp cost"
  - "If incorporate chosen: CA/IndiaFilings engaged, MCA filing initiated"
  - "If sole-prop chosen: tripwire condition documented (e.g. flip to Pvt Ltd at ₹5L MRR OR pre-seed term-sheet)"

agent_brief:
  context_files:
    - docs/company/03-cfo.md
    - docs/company/00-orchestrator.md
    - docs/company/08-legal.md
  prompt_skeleton: |
    Cannot agent-assign — founder decision only.
    CFO sub-agent CAN: prepare 1-page decision brief listing (1) Pvt Ltd pros (limited liability, ESOP-ready, investor-friendly, ~18% corp tax, ₹15k MCA cost + ₹5k/yr compliance), (2) Sole-prop pros (zero setup, slab tax, no compliance), (3) tripwire (flip when MRR > ₹5L OR term-sheet received).
    Brief written to docs/agent-reports/YYYY-MM-DD-incorp-decision-brief.md. Founder reads, decides, writes outcome in docs/company/00-orchestrator.md.
    Success_criteria check is manual KPI flip.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["founder-decision","incorp","p0"]
created_at: 2026-06-09T21:50:13.304Z
updated_at: 2026-06-09T21:50:13.304Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
