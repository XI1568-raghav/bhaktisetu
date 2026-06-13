---
id: R-Q2-G-002
title: "Mumbai scaled to 80% target — 50 pandits + 10 temples + 2K MAU"
category: geo
owner_role: sales
quarter: Q2
month_target: 4
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-G-002"]
blocks: []

kpi:
  metric: "mumbai_mau"
  current: 0
  target: 2000
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT u.id) FROM \"User\" u JOIN \"UserSession\" s ON s.user_id=u.id WHERE u.city ILIKE '%mumbai%' AND s.created_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "50 verified pandits onboarded in Mumbai (cumulative from R-Q1-S-003 25 + R-Q2-S-002 25)"
  - "10 verified temples onboarded in Mumbai (cumulative from Q1 5 + Q2 5)"
  - "2000 Mumbai MAU (SQL count distinct UserSession in 30d where User.city=Mumbai)"
  - "Mumbai-specific landing /city/mumbai live w/ temples + pujas + pandits real data"
  - "Sales pipeline: 5+ leads/week from /city/mumbai PostHog cohort"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/[slug]/page.tsx
    - apps/web/lib/cities.ts
    - scripts/agents/cold-temple-outreach.mjs
  prompt_skeleton: |
    Sales sub-agent. P0 Mumbai scale milestone — depends on R-Q1-G-002 base.
    Verify /city/mumbai live w/ 10 temples + 50 pandits + pujas data via API.
    Run cold-temple-outreach.mjs Mumbai segment weekly for temple acquisition.
    Coordinate w/ R-Q2-S-002 (Mumbai +25 pandits onboarding) — must hit 50 cumulative.
    Track MAU via PostHog city cohort + supabase SQL on User+UserSession join.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","mumbai","scale"]
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
