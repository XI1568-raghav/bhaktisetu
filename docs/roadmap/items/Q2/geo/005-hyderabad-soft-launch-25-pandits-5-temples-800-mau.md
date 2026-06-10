---
id: R-Q2-G-005
title: "Hyderabad soft launch — 25 pandits + 5 temples + 800 MAU"
category: geo
owner_role: sales
quarter: Q2
month_target: 6
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-S-005","R-Q2-S-008"]
blocks: []

kpi:
  metric: "hyderabad_mau"
  current: 0
  target: 800
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT u.id) FROM \"User\" u JOIN \"UserSession\" s ON s.user_id=u.id WHERE u.city ILIKE '%hyderabad%' AND s.created_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 80000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 verified pandits onboarded in Hyderabad (depends on R-Q2-S-005)"
  - "5 verified temples onboarded in Hyderabad (Birla Mandir + Chilkur Balaji + 3 others, depends on R-Q2-S-008)"
  - "800 Hyderabad MAU (SQL count distinct UserSession 30d where User.city=Hyderabad)"
  - "Hyderabad-specific landing /city/hyderabad live w/ temples + pujas + pandits real data"
  - "Sales pipeline: 2+ leads/week from /city/hyderabad PostHog cohort"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/[slug]/page.tsx
    - apps/web/lib/cities.ts
    - scripts/agents/cold-temple-outreach.mjs
  prompt_skeleton: |
    Sales sub-agent. P1 Hyderabad soft launch — south India expansion.
    Verify /city/hyderabad live w/ 5 temples + 25 pandits + pujas data via API.
    Run cold-temple-outreach.mjs Hyderabad segment weekly for temple acquisition.
    Coordinate w/ R-Q2-S-005 (Hyderabad 25 pandits) + R-Q2-S-008 (Hyderabad temples).
    Track MAU via PostHog city cohort + supabase SQL on User+UserSession join.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","hyderabad","south","new-city"]
created_at: 2026-06-09T21:55:18.035Z
updated_at: 2026-06-09T21:55:18.035Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
