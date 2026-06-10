---
id: R-Q1-G-003
title: "Open Mumbai market (third city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 2
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-003","R-Q1-S-006"]
blocks: []

kpi:
  metric: "city_active_mumbai"
  current: 0
  target: 1
  unit: "count"
  source: "supabase"
  query: 'SELECT CASE WHEN (SELECT COUNT(*) FROM "Priest" WHERE city=''Mumbai'' AND aadhaar_verified=true) >= 25 AND (SELECT COUNT(*) FROM "Temple" WHERE city=''Mumbai'' AND verified=true) >= 5 THEN 1 ELSE 0 END'

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Supabase: ≥25 verified pandits in Mumbai (Priest table)"
  - "Supabase: ≥5 verified temples in Mumbai (Temple table — Siddhivinayak + ISKCON Juhu + 3 others)"
  - "≥5 paid bookings completed via Mumbai pandits in last 30d"
  - "Mumbai NRI gift-puja conversion (USD payment) lights up"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/page.tsx
  prompt_skeleton: |
    Sales sub-agent. City-3 launch — Mumbai (highest disposable income + NRI gift-from-relatives anchor).
    Blocked on R-Q1-S-003 (25 Mumbai pandits) + R-Q1-S-006 (5 Mumbai temples) — coordinate.
    Tactics: (1) Siddhivinayak + ISKCON Juhu priest outreach, (2) Gujarati pandit network (high commission willingness), (3) Marathi local-news PR.
    Highest LTV city — Gujarati/Marathi diaspora US/UK gift-puja anchor.
    Founder action: 3-day Mumbai trip Q1 month 2.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","mumbai","city-3","p0"]
created_at: 2026-06-09T21:50:55.201Z
updated_at: 2026-06-09T21:50:55.201Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
