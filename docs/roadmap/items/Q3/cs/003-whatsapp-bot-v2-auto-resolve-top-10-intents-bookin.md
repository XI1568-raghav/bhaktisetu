---
id: R-Q3-CS-003
title: "WhatsApp bot v2 — auto-resolve top 10 intents (booking status + refunds + reschedule)"
category: cs
owner_role: cs
quarter: Q3
month_target: 7
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-E-007"]
blocks: []

kpi:
  metric: "wa_bot_auto_resolve_pct"
  current: 0
  target: 40
  unit: "percent"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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

tags: ["cs","whatsapp","bot","automation"]
created_at: 2026-06-09T22:02:47.227Z
updated_at: 2026-06-09T22:02:47.227Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
