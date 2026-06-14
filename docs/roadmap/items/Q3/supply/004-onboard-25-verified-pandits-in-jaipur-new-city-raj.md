---
id: R-Q3-S-004
title: "Onboard 25 verified pandits in Jaipur (new city — Rajasthan)"
category: supply
owner_role: sales
quarter: Q3
month_target: 8
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_jaipur"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" WHERE city='Jaipur' AND \"aadhaarVerified\"=true AND status='ACTIVE';"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "25 pandits × avg 4 bookings/month × ₹3000 avg × 25% commission = ₹75k/month Jaipur GMV share. Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 pandits live and verified in Supabase Priest table (city=Jaipur, aadhaarVerified=true, status=ACTIVE)"
  - "Mix per docs/supply/R-Q3-S-004-jaipur-25-pandits-handoff.md (vedic/satyanarayan/wedding/antim-sanskar/navagraha/devi/rudrabhishek)"
  - "Average rating 4.5+/5 across first 50 bookings"
  - "80%+ pandit 30-day retention post-onboarding"
  - "25+ completed Jaipur bookings by end of Q3"

agent_brief:
  context_files:
    - "docs/supply/R-Q3-S-004-jaipur-25-pandits-handoff.md"
    - "docs/supply/10-astrologers-onboarding-spec.md"
    - "docs/supply/3-city-temple-onboarding-spec.md"
  prompt_skeleton: |
    Founder-action-required item. Agent ships scaffold + handoff doc.
    Recruitment is physical (in-person Jaipur visits, KYC, reference checks) —
    cannot be agent-completed. See handoff doc for sourcing channels,
    KYC checklist, pricing tier, coordinator workflow, risk mitigation.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: spec populated by agent R-Q3-S-004-batch (item 35/40).
  Full handoff at docs/supply/R-Q3-S-004-jaipur-25-pandits-handoff.md.
  Status remains in_progress — KPI requires founder recruitment of 25 humans.
  Engineering scaffold (R-Q1-S-002a/b/c + R-Q1-E) already shipped.

tags: ["supply","pandit","jaipur","rajasthan"]
created_at: 2026-06-09T22:02:56.063Z
updated_at: 2026-06-09T22:02:56.063Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
