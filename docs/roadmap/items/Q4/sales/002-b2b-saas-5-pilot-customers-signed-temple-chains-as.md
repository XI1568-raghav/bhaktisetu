---
id: R-Q4-SA-002
title: "B2B SaaS 5 pilot customers signed — temple chains + ashrams + matha networks"
category: sales
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-SA-002"]
blocks: []

kpi:
  metric: "b2b_pilot_customers_signed"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "manual-kpi-count-signed-pilot-MSA-temple-chains-ashrams-matha-with-30day-paid-trial"

revenue_impact:
  amount_inr: 1500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "5 pilot MSAs signed by Nov 30 2026 with 3 temple chains + 1 ashram network + 1 matha"
  - "Each pilot has activated white-label subdomain + custom branding deployed via R-Q4-E-009"
  - "Pilot pricing locked at 30K INR / month SaaS fee + 5% transaction take rate"
  - "All 5 pilots onboarded to /admin/b2b-clients dashboard with churn tracking"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - docs/company/03-cpo.md
    - apps/web/app/admin/leads/page.tsx
  prompt_skeleton: |
    Cannot agent-assign — founder action required for relationship-driven B2B sales.
    Sub-agent can: build B2B SaaS landing page + ROI calculator + comparison vs Razorpay-only setup
    + prep 30K MSA template + automate /admin/leads pipeline tracking. Founder owns: cold outreach
    via diaspora networks + LinkedIn + temple-chain CXO intros + pilot pricing negotiation + closing.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","saas","pilot","commercial"]
created_at: 2026-06-09T22:09:26.259Z
updated_at: 2026-06-09T22:09:26.259Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
