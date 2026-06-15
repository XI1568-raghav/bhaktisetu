---
id: R-Q2-S-007
title: "Onboard +5 verified temples Pune (Dagdusheth+Chaturshringi+ISKCON+others)"
category: supply
owner_role: sales
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_temples_count_pune"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 25000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 14
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R4): Handoff doc shipped — docs/supply/R-Q2-S-007-pune-5-temples-handoff.md.
    Public-domain institutional contacts (5 trusts) + Marathi-first WhatsApp +
    email templates + KYC checklist + 10-week onboarding pipeline + Ganesh
    Chaturthi Sep 2026 launch readiness + sub-ticket split (007a-e). Status
    stays in_progress — founder must physically engage 5 temple admins, sign
    MoUs, complete KYC, go-live. Flips to shipped only when verified_temples
    Supabase row count for city='Pune' reaches 5 with real-paid bookings.

tags: ["supply","temple","pune","new-city"]
created_at: 2026-06-09T21:55:22.029Z
updated_at: 2026-06-09T21:55:22.029Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
