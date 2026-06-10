---
id: R-Q1-S-003
title: "Onboard 25 verified pandits in Mumbai"
category: supply
owner_role: sales
quarter: Q1
month_target: 2
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_mumbai"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: 'SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city=''Mumbai'''

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Supabase: SELECT COUNT(*) ≥ 25 verified Mumbai pandits (aadhaar_verified=true, city='Mumbai')"
  - "≥ 15 of those completed ≥ 1 paid puja in last 30d"
  - "Churn (no puja in 45d) < 25%"
  - "≥ 5 NRI gift-puja conversions delivered via Mumbai pandits"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
    - docs/company/05-sales.md
    - apps/api/src/routes/priests-public.ts
  prompt_skeleton: |
    Sales sub-agent. Mumbai pandit onboarding sprint — blocks R-Q1-G-003 city launch.
    Targets: Siddhivinayak corridor, ISKCON Juhu, Babulnath, Mahalakshmi temple pandits + Gujarati Brahmin sabha network.
    Higher commission willingness (Gujarati network) — start commission negotiation at 30% (vs 25% Bengaluru baseline).
    Generate 5 outreach drafts (Marathi + Gujarati + English). Verify via SQL above.
    Founder action: 3-day Mumbai recce + KYC video calls.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","mumbai","p0"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-09T21:47:01.131Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
