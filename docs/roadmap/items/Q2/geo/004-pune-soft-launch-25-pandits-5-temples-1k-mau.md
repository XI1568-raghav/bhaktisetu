---
id: R-Q2-G-004
title: "Pune soft launch — 25 pandits + 5 temples + 1K MAU"
category: geo
owner_role: sales
quarter: Q2
month_target: 5
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-S-004","R-Q2-S-007"]
blocks: []

kpi:
  metric: "pune_mau"
  current: 0
  target: 1000
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT u.id) FROM \"User\" u JOIN \"UserSession\" s ON s.user_id=u.id WHERE u.city ILIKE '%pune%' AND s.created_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 100000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 verified pandits onboarded in Pune (depends on R-Q2-S-004)"
  - "5 verified temples onboarded in Pune (Dagdusheth Halwai Ganpati + Chaturshringi + 3 others)"
  - "1000 Pune MAU (SQL count distinct UserSession 30d where User.city=Pune)"
  - "Pune-specific landing /city/pune live w/ temples + pujas + pandits real data"
  - "Sales pipeline: 3+ leads/week from /city/pune PostHog cohort"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/[slug]/page.tsx
    - apps/web/lib/cities.ts
    - scripts/agents/cold-temple-outreach.mjs
  prompt_skeleton: |
    Sales sub-agent. P0 Pune soft launch — new city expansion.
    Verify /city/pune live w/ 5 temples + 25 pandits + pujas data via API.
    Run cold-temple-outreach.mjs Pune segment weekly for temple acquisition.
    Coordinate w/ R-Q2-S-004 (Pune 25 pandits) + R-Q2-S-007 (Pune temples).
    Track MAU via PostHog city cohort + supabase SQL on User+UserSession join.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","pune","new-city"]
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
