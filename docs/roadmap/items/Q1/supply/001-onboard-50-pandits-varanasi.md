---
id: R-Q1-S-001
title: Onboard 50 verified pandits in Varanasi
category: supply
owner_role: cmo
quarter: Q1
month_target: 2
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: [R-Q1-E-003]
blocks: [R-Q1-S-002]

kpi:
  metric: verified_pandits_count_varanasi
  current: 8
  target: 50
  unit: count
  source: supabase
  query: 'SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city=''Varanasi'''

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "50 pandits × 3 pujas/mo × ₹1500 × 30% commission"

geo:
  scope: city
  values: [Varanasi]

est_hours: 40
est_cost_inr: 0

tripwire:
  - condition: "verified_pandits_count_varanasi < 15 by 2026-08-01"
    action: pivot_to_remote_onboarding

success_criteria:
  - "Supabase: SELECT COUNT(*) ≥ 50 verified Varanasi pandits"
  - "≥ 30 of those completed ≥ 1 paid puja in last 30d"
  - "Churn (no puja in 45d) < 20%"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
    - docs/company/05-sales.md
    - apps/api/src/routes/priest-onboarding.ts
  prompt_skeleton: |
    Sector CMO + Sales. Pandit-onboarding sprint Varanasi.
    Read CMO §1 + Sales §1 Tactic A. Generate 5 outreach drafts.
    Verify via SQL above.

handoff_notes: |
  2026-06-10: created from year-1 import.

tags: [varanasi, pandit, supply, year-1]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Body (human-readable)
## Why this matters
## Reference material
## Already shipped
## Risks
