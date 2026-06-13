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
  - "50 pre-segmented contact slots in data/sales/warm-network-contacts-seed.csv (15 temple / 15 pandit / 10 gaushala / 5 donor / 5 diaspora)"
  - "12-column live tracker schema in data/sales/warm-network-tracker.csv (contact_name,relationship,channel,city,ask_type,script_variant,language,sent_at,replied_at,referral_received,supply_lead_id,notes)"
  - "5 scripts shipped in scripts/sales/warm-network/ (wa-script-{temple,pandit,gaushala}.md + email-script-formal.md + followup-script-day7.md) with Hindi + English bodies < 350 chars each and {first_name} placeholder"
  - "README.md founder runbook with 5-day send schedule + reply playbook + escalation rules"
  - "Schema tests pass (scripts/sales/warm-network/__tests__/tracker-schema.test.mjs) — 10/10 green covering header schema, 50-row count, ask_type distribution, script char limits, required files present"
  - "docs/agent-reports/2026-06-13-warm-network-reachout-ship.md documents deliverables + founder runbook"
  - "Founder sends 50 messages over 5-day window (manual WA/email — NOT bulk tool); reply rate logged per contact (positive/negative/silent); ≥3 qualified supply leads (target ₹2L pipeline)"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-12: Agent prep cycle 1 (6 deliverables, 11-col tracker, 4 WA scripts).
  2026-06-13: Re-shipped to current queue spec (Q-C-20260612T0001-R-Q1-S-014):
    - data/sales/warm-network-tracker.csv (12-col schema, +language col)
    - data/sales/warm-network-contacts-seed.csv (50 rows, pre-segmented 15/15/10/5/5 = temple/pandit/gaushala/donor/diaspora)
    - scripts/sales/warm-network/wa-script-{temple,pandit,gaushala}.md (Hindi + English bodies < 350 chars, {first_name} placeholder)
    - scripts/sales/warm-network/email-script-formal.md (older/formal contacts, full bilingual)
    - scripts/sales/warm-network/followup-script-day7.md (single nudge, Hindi + English)
    - scripts/sales/warm-network/README.md (5-day schedule, reply playbook, hard rules)
    - scripts/sales/warm-network/__tests__/tracker-schema.test.mjs (10/10 green)
    - docs/agent-reports/2026-06-13-warm-network-reachout-ship.md
  TDD: RED → 1/10. GREEN → 10/10. Success criteria concretized (replaced cycle-1 list).
  FOUNDER ACTION REQUIRED: ≤6h over 5 days — fill 50 contact_name values, send per scripts, log replies in tracker.
  Expected: 3-4 qualified supply leads → ₹1-3L pipeline.
  Status stays in_progress until founder reports reply-rate + conversion numbers.

tags: ["warm-network","founder","p0"]
created_at: 2026-06-10T20:35:05.804Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
