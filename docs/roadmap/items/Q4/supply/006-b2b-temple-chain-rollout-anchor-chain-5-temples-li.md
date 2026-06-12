---
id: R-Q4-S-006
title: "B2B temple chain rollout — anchor chain 5 temples live + custom branding deployed"
category: supply
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-010"]
blocks: ["R-Q4-SA-001"]

kpi:
  metric: "b2b_chain_temples_live"
  current: 0
  target: 5
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM temples WHERE chain_id IS NOT NULL AND whitelabel_status = 'live' AND went_live_at >= '2026-10-01'"

revenue_impact:
  amount_inr: 800000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "5 anchor chain temples live with custom branding deployed by Nov 30 2026"
  - "Each temple has dedicated subdomain (temple-slug.darshya.online) + verified ssl + custom logo"
  - "Razorpay sub-merchant account per temple for direct payouts (no platform escrow delay)"
  - "Onboarding playbook documented in docs/runbooks/b2b-temple-onboarding.md"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - apps/web/middleware.ts
    - apps/api/src/routes/temple-portal.ts
    - prisma/schema.prisma
  prompt_skeleton: |
    Cannot agent-assign — founder action required for temple-by-temple onboarding calls.
    Sub-agent can: build /admin/b2b-onboarding wizard + automate subdomain provisioning via CF API
    + ship Razorpay sub-merchant KYC flow + write onboarding runbook. Founder owns: per-temple intro
    calls (via anchor chain regional heads from R-Q4-SA-001) + KYC document collection + go-live sign-off.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","b2b","chain","rollout"]
created_at: 2026-06-09T22:09:26.554Z
updated_at: 2026-06-09T22:09:26.554Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
