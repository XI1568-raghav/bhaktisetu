---
id: R-Q4-E-001
title: "Antim sanskar coordination v1 — pandit dispatch + ghat booking + 24h SLA"
category: engineering
owner_role: cto
quarter: Q4
month_target: 10
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-007"]
blocks: ["R-Q4-P-001"]

kpi:
  metric: "antim_sanskar_bookings_monthly"
  current: 0
  target: 150
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM bookings WHERE puja_type = 'antim_sanskar' AND status IN ('dispatched','completed') AND created_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 450000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Antim sanskar coordination flow live at /antim-sanskar/book with 24h SLA contract"
  - "150 monthly bookings by Dec 31 2026 across 10 cities with pandit + ghat dispatched"
  - "On-call pandit roster + ghat partner contracts in place for top 10 cities"
  - "Dignity-first UX validated: zero pricing on landing, post-call quote model, WhatsApp-first comms"

agent_brief:
  context_files:
    - apps/web/app/antim-sanskar/page.tsx
    - apps/api/src/routes/pujas.ts
    - docs/company/03-cpo.md
    - docs/runbooks
  prompt_skeleton: |
    CTO sub-agent. Build /antim-sanskar/book emergency intake form (name + phone + city + situation).
    Trigger SMS + WA to on-call pandit roster via Twilio fallback or WA Cloud (U7). Add antim_sanskar
    enum on bookings.puja_type + dispatch_status enum (received/pandit_assigned/ghat_booked/completed).
    24h SLA tracker with alerting via Resend if no dispatch in 2h. Verify per success_criteria above.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["antim-sanskar","coordination","dispatch","dignity"]
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
