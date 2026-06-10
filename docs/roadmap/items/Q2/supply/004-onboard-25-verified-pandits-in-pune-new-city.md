---
id: R-Q2-S-004
title: "Onboard 25 verified pandits in Pune (new city)"
category: supply
owner_role: sales
quarter: Q2
month_target: 5
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_pune"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" p JOIN \"User\" u ON p.user_id=u.id WHERE p.verified=true AND p.aadhaar_verified=true AND u.city ILIKE '%pune%'"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 pandits onboarded in Pune — new city expansion"
  - "Each verified=true AND aadhaar_verified=true (Priest table — business rule #4 gate)"
  - "Each onboarded via /priest-onboarding flow w/ KYC + bank account for payouts"
  - "Marathi language proficiency required (Maharashtra market localization)"
  - "Cross-link: 5+ pandits active in /priest/bookings dashboard (Sprint 1 P0 wired)"

agent_brief:
  context_files:
    - apps/api/src/routes/priests-public.ts
    - apps/web/app/priest-onboarding/page.tsx
    - apps/web/app/priest/page.tsx
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P0 Pune pandit onboarding — Maharashtra new city.
    Run pandit-acquisition agent for Pune geo (cold outreach to Marathi-speaking pandits).
    Verify each onboarded via /priest-onboarding flow w/ KYC (Aadhaar gate per business rule #4).
    Track pipeline in docs/agent-reports/YYYY-MM-DD-pandit-pipeline-pune.md.
    Coordinate w/ R-Q2-G-004 (Pune geo soft launch) — pandits required for city activation.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","pune","new-city"]
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
