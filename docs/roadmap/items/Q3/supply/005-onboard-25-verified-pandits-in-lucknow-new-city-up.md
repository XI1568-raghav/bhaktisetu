---
id: R-Q3-S-005
title: "Onboard 25 verified pandits in Lucknow (new city — UP)"
category: supply
owner_role: sales
quarter: Q3
month_target: 9
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_lucknow"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" WHERE city='Lucknow' AND aadhaarVerified=true AND status='ACTIVE'"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "25 pandits x ~3 bookings/mo x ~₹1000 net commission/booking = ₹75k/mo run-rate at month 12."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 pandits live + verified in Supabase Priest table (city=Lucknow, aadhaarVerified=true, status=ACTIVE)"
  - "25+ Lucknow bookings completed during Q3 (downstream)"
  - "Average rating 4.5+/5"
  - "Repeat-customer rate 25%+"
  - "Coordinator hired OR founder visits scheduled"
  - "First 5 onboardings end-to-end run by founder before delegating"

agent_brief:
  context_files:
    - "docs/supply/R-Q3-S-005-lucknow-25-pandits-handoff.md"
    - "docs/supply/R-Q3-S-004-jaipur-25-pandits-handoff.md"
    - "docs/supply/hyderabad-pandit-onboarding-spec.md"
  prompt_skeleton: |
    Lucknow pandit recruitment is supply-side; KPI requires physical founder/coordinator action.
    Engineering scaffold + onboarding pipeline is already shipped (R-Q1-S-002a/b/c + R-Q1-E).
    Sub-agent should: (1) verify pandit-listing city-filter renders for Lucknow, (2) ensure /city/lucknow page exists, (3) confirm payout flow gated on Aadhaar per business rule #4, (4) help founder with weekly Supabase row-count probe + WhatsApp drip templates for pandit outreach (no fabrication of names/contacts; use [VERIFY-FOUNDER] tokens).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14 R4: handoff doc shipped at docs/supply/R-Q3-S-005-lucknow-25-pandits-handoff.md.
    Status stays in_progress — KPI gates on founder physical recruitment in Lucknow.
    Engineering pre-reqs all shipped (R-Q1-S-002a/b/c + R-Q1-E).
    Pricing tier-2 confirmed (25% commission). Sampradaya = Awadh Smarta + Vaishnava (Ramanandi).
    Strategic adjacency: Ayodhya/Naimisharanya/Varanasi expansion. Recommend dual-mandate coordinator.

tags: ["supply","pandit","lucknow","up"]
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
