---
id: R-Q1-CS-001
title: "Document 10 support macros (payment failed + booking delay + refund + ...)"
category: cs
owner_role: cs
quarter: Q1
month_target: 1
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "cs_macros_documented"
  current: 10
  target: 10
  unit: "count"
  source: "manual"
  query: "manual:docs/cs/macros-v1.md (count `## Macro ` headers)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: SHIPPED. docs/cs/macros-v1.md w/ 10 P0 macros (SLA-breach apology / priest no-show / video-delay / payment-failed / date-confusion / refund-confirmation / reschedule / NRI-USD / festival-waitlist / founder-escalation). Each macro: trigger + tone note + reply text + follow-up SLA. Doctrine source cited (docs/company/07-cs.md). Live BS-20260427-K3HSD example used in Macro 1. Hindi + 5 regional translations deferred to R-Q1-CS-001b ticket.
  Founder action before go-live: fill +91-XXXXX-XXXXX placeholder in Macro 10, confirm bhaktisetu@upi handle in Macro 4. Closes: Q-C-20260611T2307-R-Q1-CS-001.

tags: ["cs","macros","p1"]
created_at: 2026-06-09T21:50:37.964Z
updated_at: 2026-06-12T05:30:00.000Z
shipped_at: 2026-06-12T05:30:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
