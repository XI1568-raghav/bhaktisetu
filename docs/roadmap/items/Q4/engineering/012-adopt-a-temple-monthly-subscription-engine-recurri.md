---
id: R-Q4-E-012
title: "Adopt-a-temple monthly subscription engine — recurring + temple share + 80G monthly"
category: engineering
owner_role: cto
quarter: Q4
month_target: 12
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-008"]
blocks: ["R-Q4-P-002"]

kpi:
  metric: "adopt_temple_active_subs"
  current: 0
  target: 500
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM subscriptions WHERE plan_type = 'adopt_temple' AND status = 'active' AND next_charge_at > NOW()"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Adopt-a-temple subscription engine live with 3 tiers (500/1500/5000 INR monthly)"
  - "500 active subscriptions by Dec 31 2026 via Razorpay recurring subscriptions API"
  - "Monthly 80G receipt auto-generated + emailed via Resend on each successful charge"
  - "Temple-side payout split: 70% to adopted temple + 30% platform fee tracked in payouts table"

agent_brief:
  context_files:
    - apps/api/src/routes/donations.ts
    - apps/api/src/routes/razorpay-webhook.ts
    - apps/web/app/adopt-a-temple/page.tsx
    - prisma/schema.prisma
  prompt_skeleton: |
    CTO sub-agent. Build Subscription model (user_id, temple_id, plan_type, amount_inr, status, next_charge_at).
    Integrate Razorpay subscriptions API (recurring tokens) with webhook handler for charge.succeeded/failed.
    Auto-generate 80G receipt on each charge via existing receipts service. Build /adopt-a-temple/[temple_slug]
    landing with 3-tier picker. Requires founder Razorpay live keys (U1) for production charges.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["adopt-temple","recurring","subscription"]
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
