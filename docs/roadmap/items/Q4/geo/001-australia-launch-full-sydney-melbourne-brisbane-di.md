---
id: R-Q4-G-001
title: "Australia launch full — Sydney + Melbourne + Brisbane diaspora + AUD checkout"
category: geo
owner_role: cmo
quarter: Q4
month_target: 10
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: 'U3'
depends_on: ["R-Q3-G-002","R-Q4-S-004","R-Q4-M-012"]
blocks: []

kpi:
  metric: "au_paying_users_monthly"
  current: 0
  target: 500
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id) FROM payments WHERE currency = 'AUD' AND status = 'captured' AND paid_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 1200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Stripe AUD activated for live AUD checkouts (founder U2 extension required)"
  - "500 AU-paying users by Dec 31 2026 verified via supabase currency=AUD query"
  - "/au landing page + 3 city sub-routes (sydney/melbourne/brisbane) live with AUD pricing"
  - "10 AU-based verified pandits onboarded per R-Q4-S-004 dependency"

agent_brief:
  context_files:
    - docs/company/08-geo.md
    - apps/web/app/nri/page.tsx
    - apps/web/lib/currency.ts
    - apps/api/src/routes/stripe-webhook.ts
  prompt_skeleton: |
    Cannot agent-assign — founder action U3 + Stripe AUD activation (U2 extension) required.
    Sub-agent can: scaffold /au landing + 3 city pages + AUD currency formatter + Stripe webhook
    handler for AUD payments + AU-specific WA broadcast templates + diaspora content series.
    Founder owns: Stripe AUD activation paperwork + ABN/GST setup + AU bank account verification.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["nri","au","launch","geo"]
created_at: 2026-06-09T22:09:24.241Z
updated_at: 2026-06-09T22:09:24.241Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
