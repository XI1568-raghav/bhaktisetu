---
id: R-Q1-S-014
title: "Manual founder warm-network reachout — 50 personal contacts asking for referrals"
category: supply
owner_role: sales
quarter: Q1
month_target: 1
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "wa_warm_referrals_sent"
  current: 0
  target: 50
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "50 contacts identified + segmented by relationship × ask_type (data/sales/warm-network-contacts-seed.csv)"
  - "4 WA script variants ready (temple/pandit/gaushala/donor), each w/ 3 sub-variants for relationship depth"
  - "Live tracker CSV w/ explicit schema (data/sales/warm-network-tracker.csv)"
  - "Founder sends 50 messages over 5-day window (manual WA/email/LinkedIn — NOT bulk tool)"
  - "Reply rate logged for every contact (positive/negative/silent)"
  - "≥3 qualified supply leads from 50 asks (target = ₹2L pipeline value)"
  - "Handoff note updated w/ aggregate reply rate + conversion + lessons learned"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-12: Agent prep complete. 6 deliverables shipped:
    - data/sales/warm-network-tracker.csv (live tracker, 11 cols)
    - data/sales/warm-network-contacts-seed.csv (50-row template w/ pre-segmented relationship × ask_type)
    - scripts/sales/warm-network/wa-script-{temple,pandit,gaushala,donor}.md (4 scripts × 3 variants each = 12 ready-to-send templates + post-reply follow-ups)
    - docs/agent-reports/2026-06-12-warm-network-reachout-prep.md (full execution playbook + segmentation logic + 5-day send schedule + expected outcomes math + risk mitigations)
  Success criteria populated (replaced placeholder w/ 7 concrete bars).
  FOUNDER ACTION REQUIRED: ≤6h total over 5 days — fill 50 contact_name values, send messages per scripts, log replies in tracker.
  Expected outcome: 3-4 qualified supply leads → ₹1-3L pipeline value.
  Closes (partial): Q-C-20260612T0001-R-Q1-S-014. Status stays in_progress until founder reports back w/ reply-rate + conversion numbers.

tags: ["warm-network","founder","p0"]
created_at: 2026-06-10T20:35:05.804Z
updated_at: 2026-06-10T20:35:05.804Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
