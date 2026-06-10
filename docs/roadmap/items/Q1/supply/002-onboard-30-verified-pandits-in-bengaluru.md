---
id: R-Q1-S-002
title: "Onboard 30 verified pandits in Bengaluru"
category: supply
owner_role: sales
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_bengaluru"
  current: 0
  target: 30
  unit: "count"
  source: "supabase"
  query: 'SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city=''Bengaluru'''

revenue_impact:
  amount_inr: 90000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Supabase: SELECT COUNT(*) ≥ 30 verified Bengaluru pandits (aadhaar_verified=true, city='Bengaluru')"
  - "≥ 20 of those completed ≥ 1 paid puja in last 30d"
  - "Churn (no puja in 45d) < 25%"
  - "Avg pandit rating ≥ 4.5/5 from devotee reviews"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
    - docs/company/05-sales.md
    - apps/api/src/routes/priests-public.ts
  prompt_skeleton: |
    Sales + CMO sub-agent. Bengaluru pandit onboarding sprint — blocks R-Q1-G-001 city launch.
    Read Sales §1 Tactic A pandit-network drip. Generate 5 WhatsApp outreach drafts targeting ISKCON Bangalore + Banashankari + Malleshwaram temple pandits.
    Each onboarded pandit needs: Aadhaar upload + 2-min KYC video call + first paid test puja within 14d.
    Verify via SQL above. Founder action: KYC video calls (5-10/week).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","bengaluru","p0"]
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
