---
id: R-Q1-G-007
title: "Hyderabad supply onboarding (7th city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "city_active_hyderabad"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "supabase-select-1-if-count-priest-where-city-equals-Hyderabad-and-aadhaar-verified-true-and-active-true-gte-3-else-0"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 10
est_cost_inr: 0

success_criteria:
  - "3 verified pandits onboarded in Hyderabad by Mar 31 2026"
  - "1 Hyderabad temple partner signed (Birla Mandir or Chilkur Balaji)"
  - "Telugu macro added to apps/web/lib/i18n for Hyderabad market"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - apps/web/app/city/page.tsx
    - apps/api/src/routes/priests-public.ts
  prompt_skeleton: |
    Draft Hyderabad priest outreach list. Top 20 from Birla + Chilkur Balaji + Yadagirigutta clusters.
    Telugu-first script ready. Founder makes calls; sub-agent logs to docs/agent-reports/hyderabad-outreach.md.
    On signup: city=Hyderabad in Priest row + aadhaar gate. Add Telugu cs macros.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","hyderabad","p2"]
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
