---
id: R-Q3-G-002
title: "Canada launch — landing page + Stripe CAD + 1K paid NRI users (Toronto/Vancouver/Brampton)"
category: geo
owner_role: sales
quarter: Q3
month_target: 8
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: 'U2'
depends_on: ["R-Q3-S-007"]
blocks: ["R-Q3-M-010"]

kpi:
  metric: "canada_paid_users"
  current: 0
  target: 1000
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id)::int AS value FROM bookings WHERE payment_currency = 'CAD' AND payment_status = 'PAID' AND created_at >= '2026-08-01' -- Canada NRI distinct paid users; target 1000"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "Cannot agent-assign — founder action U2 (Stripe NRI activation w/ CAD) required before any Canada paid path lights up"
  - "Stripe CAD rail live + Stripe Elements CA card capture on /pujas/[slug]/book?cc=CA"
  - "1000 distinct paid CAD users by Q3 close (Toronto/Vancouver/Brampton top 3 metros)"
  - "Canada NRI 9-10x domestic pricing rule enforced (formatPrice CAD path)"
  - "Depends on R-Q3-S-007 (10 Canada-based verified pandits onboarded)"

agent_brief:
  context_files: []
  prompt_skeleton: |
    Cannot agent-assign — founder action U2 (Stripe CAD rail) required before this Canada launch ships.
    Sub-agent CMO can prep Canada landing copy + R-Q3-M-010 outreach pipeline draft but launch hard-gated on U2.
    Reference: docs/activation-gates.md U2, apps/api/src/routes/payments.ts Stripe path, R-Q3-S-007 supply gate.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","nri","canada","launch"]
created_at: 2026-06-09T22:02:50.119Z
updated_at: 2026-06-09T22:02:50.119Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
