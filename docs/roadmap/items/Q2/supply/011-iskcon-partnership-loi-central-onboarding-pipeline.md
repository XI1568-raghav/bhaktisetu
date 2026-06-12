---
id: R-Q2-S-011
title: "ISKCON partnership LOI — central onboarding pipeline for 5 ISKCON temples"
category: supply
owner_role: sales
quarter: Q2
month_target: 6
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q2-SA-001"]

kpi:
  metric: "iskcon_temples_onboarded"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Outreach kit shipped. 4 docs:
    - docs/sales/iskcon-org-map-2026-06.md (GBC + 5 zonal secs + TP autonomy + decision matrix + 3 central + 5 TP entry points + risk §8 covering Bangalore Bureau dispute + factions)
    - docs/sales/iskcon-loi-template-v1.md (~2-page LOI, non-binding, 60-day MoU path, customisation notes per recipient type)
    - docs/sales/iskcon-outreach-kit-v1.md (cold email Bureau + TP variants, WA warm-intro + Bureau-permitted variants, 4-touch follow-up sequence, founder action checklist, pre-LOI conversation script)
    - data/sales/iskcon-outreach-tracker.csv (11-col tracker header)
  ZERO sends from agent. Every [VERIFY-FOUNDER] marker requires founder verification via iskcon.org Leadership page before contact (board composition shifts annually).
  Recommended path: PILOT (TP-led, lower ceiling, faster) for v1. CENTRAL deal in v2 once pilot proves model.
  FOUNDER ACTION: ≤4h for verification + personalisation + 1 email per day × 5 days. Don't blast all 35 GBC.
  Closes (partial): Q-C-20260612T0503-R-Q2-S-011. Status stays in_progress until 3+ replies logged in tracker.

tags: ["supply","partnership","iskcon","b2b"]
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
