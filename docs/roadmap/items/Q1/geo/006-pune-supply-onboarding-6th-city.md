---
id: R-Q1-G-006
title: "Pune supply onboarding (6th city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 3
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "city_active_pune"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "supabase-select-1-if-count-priest-where-city-equals-Pune-and-aadhaar-verified-true-and-active-true-gte-3-else-0"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 10
est_cost_inr: 0

success_criteria:
  - "3 verified pandits onboarded in Pune by Mar 31 2026"
  - "1 Pune temple partner signed"
  - "5+ pujas listed at Pune temples in pujas table with city=Pune"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - apps/web/app/city/page.tsx
    - apps/api/src/routes/priests-public.ts
  prompt_skeleton: |
    Draft Pune priest outreach list. Top 20 from Kasba Ganpati + Dagdusheth Halwai + Chinchwad temple area.
    Cold-call script ready. Founder makes calls; sub-agent logs results to docs/agent-reports/pune-outreach.md.
    On signup: add city=Pune to Priest row + aadhaar gate. Update apps/web/app/city/pune marketing page.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","pune","p2"]
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
