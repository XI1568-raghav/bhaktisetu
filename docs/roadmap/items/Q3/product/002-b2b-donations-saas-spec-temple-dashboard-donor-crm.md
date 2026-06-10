---
id: R-Q3-P-002
title: "B2B Donations SaaS spec — temple dashboard + donor CRM + Razorpay split payouts"
category: product
owner_role: cpo
quarter: Q3
month_target: 8
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-007","R-Q3-E-010"]
blocks: []

kpi:
  metric: "b2b_donations_temple_count"
  current: 0
  target: 15
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT t.id) FROM temples t JOIN temple_b2b_features f ON f.temple_id = t.id WHERE f.donations_saas_enabled = true AND t.verified = true (Supabase via SUPABASE_DIRECT_URL; target 15 by Sep 30)"

revenue_impact:
  amount_inr: 300000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 20
est_cost_inr: 0

success_criteria:
  - "15 verified temples live on B2B Donations SaaS by Sep 30 (temple_b2b_features.donations_saas_enabled = true)"
  - "Spec covers: temple-admin dashboard /temple-portal/donations + donor CRM + Razorpay Route split-payouts (platform 20-40% per business rule #3) + 80G receipt auto-issue (per business rule #7 — donee 80G regn + PAN required)"
  - "Pre-req R-Q3-E-007 API readiness + R-Q3-E-010 multi-tenant temple admin shipped"
  - "5 paid pilot temples (₹2K-5K/mo SaaS subscription) signed before broad GA"

agent_brief:
  context_files:
    - apps/api/src/routes/temple-portal.ts
    - apps/web/app/temple-portal/page.tsx
    - apps/api/src/routes/donations.ts
    - prisma/schema.prisma
    - docs/company/04-product.md
  prompt_skeleton: |
    Product sub-agent. P0 B2B Donations SaaS spec — temple dashboard + donor CRM + Razorpay split payouts.
    Reference R-Q3-E-007 B2B Temple SaaS API v1 + R-Q3-E-010 multi-tenant temple admin panel — both must ship first.
    Spec must cover 4 modules: (1) temple-admin donation feed w/ donor filter+export, (2) donor CRM w/ tags + segment + WhatsApp/email blast, (3) Razorpay Route split payout (platform 20-40% per business rule #3), (4) 80G receipt auto-issue (donee 80G regn + PAN required per business rule #7).
    Schema: extend prisma temple_b2b_features w/ donations_saas_enabled boolean + saas_tier enum (free, basic_2k, pro_5k).
    Pilot rollout plan: 5 paid pilot temples (₹2K-5K/mo SaaS subscription) before GA broad launch.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","b2b","saas","donations"]
created_at: 2026-06-09T22:02:54.796Z
updated_at: 2026-06-09T22:02:54.796Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
