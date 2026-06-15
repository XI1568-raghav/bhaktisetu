---
id: R-Q4-S-004
title: "Onboard 10 Australia-based verified pandits (Sydney + Melbourne + Brisbane)"
category: supply
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-007"]
blocks: ["R-Q4-G-001"]

kpi:
  metric: "verified_pandits_count_au"
  current: 0
  target: 10
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" WHERE country='AU' AND identity_verified=true AND status='ACTIVE'"

revenue_impact:
  amount_inr: 180000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "10 Priests in Supabase with country='AU' AND identity_verified=true AND status='ACTIVE'"
  - "Distribution: Sydney 4+, Melbourne 4+, Brisbane 2+ (no single-metro concentration)"
  - "First 10 AU bookings completed Q4 (downstream KPI, R-Q4-G-001 unblock)"
  - "Average rating 4.5+/5 within 60 days of activation"
  - "80%+ pandit retention at 60-day post-onboarding churn check"
  - "Engineering dependencies shipped: AU identity verification path + AU compliance fields on Priest model"

agent_brief:
  context_files:
    - "docs/supply/R-Q4-S-004-au-pandits-handoff.md"
    - "docs/supply/R-Q3-S-004-jaipur-25-pandits-handoff.md"
    - "docs/supply/hyderabad-pandit-onboarding-spec.md"
  prompt_skeleton: |
    Founder-action item. Agent has shipped the AU onboarding scaffold,
    sampradaya targeting, AUD pricing tier, AU compliance checklist,
    and engineering-dependency surfacing in
    docs/supply/R-Q4-S-004-au-pandits-handoff.md.

    Do NOT mark this item shipped from agent side — KPI is human-onboarding
    + verification. Status flips when Supabase row count hits 10.

    Engineering blockers (separate roadmap items required):
    1. Widen aadhaarVerified → identityVerified jurisdiction-aware
    2. Add country/abn/wwccNumber/auBankBsb fields to Priest model
    3. Verify Stripe Connect AU AUD payout rail

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R4 ship): scaffold + handoff doc + AU compliance checklist
  + AUD pricing tier + engineering dependency list shipped via
  supply/R-Q4-S-004-batch-2026-06-15-r4. Status remains in_progress per
  founder-action rule. KPI populated with real Supabase query.

tags: ["supply","pandit","au","nri"]
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
