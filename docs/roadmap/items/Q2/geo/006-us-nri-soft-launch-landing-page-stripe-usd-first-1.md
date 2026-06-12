---
id: R-Q2-G-006
title: "US NRI soft launch — landing page + Stripe USD + first 100 paid users"
category: geo
owner_role: sales
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: 'U2'
depends_on: []
blocks: []

kpi:
  metric: "us_nri_paid_users"
  current: 0
  target: 100
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id) FROM \"Booking\" WHERE currency='USD' AND status='completed' AND created_at >= '2026-04-01'"

revenue_impact:
  amount_inr: 300000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "Stripe USD KYC live (gate U2 unblocked — founder action)"
  - "/nri landing page live w/ Stripe Elements USD checkout flow (apps/web/app/nri/page.tsx)"
  - "First 100 paid USD users completed via Stripe (SQL count distinct user_id where currency=USD)"
  - "9-10x INR pricing applied per business rule #2 (verified via apps/api/src/lib/pricing.ts)"
  - "EmailCapture source='nri-landing' converts ≥5% to paid (PostHog funnel)"

agent_brief:
  context_files:
    - apps/web/app/nri/page.tsx
    - apps/api/src/routes/payments.ts
    - apps/web/components/StripeClientSecretCheckout.tsx
    - docs/activation-gates.md
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P1 NRI revenue lever — gated on U2 Stripe USD KYC (founder action).
    Verify /nri page live + Stripe Elements wired (HANDOFF 2026-05-27 shipped clientSecret-only fallback).
    Confirm 9-10x INR pricing applied via apps/api/src/lib/pricing.ts per business rule #2.
    Run NRI Google Ads $200/mo across US/UK/CA/AU per R-Q2-M-006.
    Cannot agent-assign Stripe KYC — founder business docs required.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","nri","us","soft-launch"]
created_at: 2026-06-09T21:55:18.035Z
updated_at: 2026-06-09T21:55:18.035Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
