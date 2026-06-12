---
id: R-Q4-E-009
title: "B2B white-label v1 — temple chain custom domain + Razorpay sub-merchant + branding"
category: engineering
owner_role: cto
quarter: Q4
month_target: 11
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-010"]
blocks: ["R-Q4-SA-001"]

kpi:
  metric: "whitelabel_temples_live"
  current: 0
  target: 3
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM temples WHERE whitelabel_status = 'live' AND custom_domain IS NOT NULL"

revenue_impact:
  amount_inr: 600000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "3 white-label temple sites live with custom domain + branding + Razorpay sub-merchant by Nov 30 2026"
  - "Tenant resolution middleware lit up: temple-x.example.com -> temple_id = X"
  - "Per-tenant branding tokens (logo, colors, fonts) loaded from temples.branding_json column"
  - "Race-condition test: 2 tenants on same backend cannot read each other's bookings"

agent_brief:
  context_files:
    - apps/web/middleware.ts
    - apps/api/src/routes/temple-portal.ts
    - prisma/schema.prisma
    - docs/company/01-cto.md
  prompt_skeleton: |
    CTO sub-agent. Multi-tenant white-label v1. Extend middleware.ts to resolve req.hostname -> tenant_id.
    Add temples.custom_domain unique varchar(255) + branding_json jsonb + whitelabel_status enum migration.
    Razorpay sub-merchant onboarding flow via /admin/whitelabel-kyc. All API routes must filter by tenant_id
    from middleware context. Verify per success_criteria; orchestrator queries supabase per kpi.query above.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["whitelabel","b2b","multi-tenant","temple"]
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
