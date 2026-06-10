---
id: R-Q3-G-001
title: "UK launch — landing page + Stripe GBP + 1.5K paid NRI users (London/Birmingham/Leicester)"
category: geo
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U2'
depends_on: ["R-Q2-G-006","R-Q3-S-006"]
blocks: ["R-Q3-L-002","R-Q3-M-009"]

kpi:
  metric: "uk_paid_users"
  current: 0
  target: 1500
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id)::int AS value FROM bookings WHERE payment_currency = 'GBP' AND payment_status = 'PAID' AND created_at >= '2026-07-01' -- UK NRI distinct paid users; target 1500"

revenue_impact:
  amount_inr: 750000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Cannot agent-assign — founder action U2 (Stripe NRI KYC for UK GBP) required before any UK paid path lights up"
  - "Stripe GBP rail live + Stripe Elements UK card capture rendering on /pujas/[slug]/book?cc=GB"
  - "1500 distinct paid GBP users in Supabase by Q3 close (London/Birmingham/Leicester top 3)"
  - "UK NRI 9-10x domestic pricing rule enforced (formatPrice GBP path in apps/web/lib)"
  - "GDPR compliance + DPA + cookie banner shipped per R-Q3-L-002"

agent_brief:
  context_files: []
  prompt_skeleton: |
    Cannot agent-assign — founder action U2 (Stripe NRI activation w/ UK GBP) required before this item can move.
    Sub-agent CMO can prep landing copy + influencer pipeline draft (R-Q3-M-009) but launch is hard-gated on U2.
    Reference: docs/activation-gates.md U2, apps/api/src/routes/payments.ts Stripe path, R-Q3-S-006 supply onboarding 15 UK pandits.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","nri","uk","launch"]
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
