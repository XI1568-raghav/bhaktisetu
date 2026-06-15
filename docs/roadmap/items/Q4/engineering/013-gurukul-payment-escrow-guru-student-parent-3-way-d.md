---
id: R-Q4-E-013
title: "Gurukul payment escrow — guru/student/parent 3-way + dispute hooks"
category: engineering
owner_role: cto
quarter: Q4
month_target: 10
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-008"]
blocks: ["R-Q4-P-005"]

kpi:
  metric: "gurukul_escrow_volume_inr"
  current: 0
  target: 1000000
  unit: "inr"
  source: "razorpay"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 80000
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
  2026-06-15: full compliance + architecture handoff written at docs/engineering/R-Q4-E-013-gurukul-payment-escrow-handoff.md.
    R2 PR #71 was rejected for proposing direct custody (unlicensed PA-PG under RBI 2020). Mandatory architecture
    is Razorpay Routes (split-payouts at PSP level, Bhaktisetu never holds parent funds). 12-item founder/legal/CA
    checklist must complete before engineering builds. Status stays in_progress until founder unblocks items 1-3
    (Razorpay Routes upgrade + sub-merchant onboarding design).

tags: ["gurukul","escrow","payment","education"]
created_at: 2026-06-09T22:09:23.580Z
updated_at: 2026-06-09T22:09:23.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
