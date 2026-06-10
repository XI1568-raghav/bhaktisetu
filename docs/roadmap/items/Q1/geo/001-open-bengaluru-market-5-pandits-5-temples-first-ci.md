---
id: R-Q1-G-001
title: "Open Bengaluru market (5 pandits + 5 temples first city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-002"]
blocks: []

kpi:
  metric: "city_active_bengaluru"
  current: 0
  target: 1
  unit: "count"
  source: "supabase"
  query: 'SELECT CASE WHEN (SELECT COUNT(*) FROM "Priest" WHERE city=''Bengaluru'' AND aadhaar_verified=true) >= 5 AND (SELECT COUNT(*) FROM "Temple" WHERE city=''Bengaluru'' AND verified=true) >= 5 THEN 1 ELSE 0 END'

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Supabase: ≥5 verified pandits in Bengaluru (Priest table, city='Bengaluru', aadhaar_verified=true)"
  - "Supabase: ≥5 verified temples in Bengaluru (Temple table, city='Bengaluru', verified=true)"
  - "≥3 paid bookings completed via Bengaluru pandits in last 30d"
  - "/city/bengaluru page lists ≥5 temples + ≥10 puja offerings"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - docs/company/02-cmo.md
    - apps/web/app/city/page.tsx
  prompt_skeleton: |
    Sales sub-agent. City-1 launch — Bengaluru first market (founder home base, lowest CAC).
    Blocked on R-Q1-S-002 (30 pandit onboarding) — coordinate dependency.
    Tactics: (1) WhatsApp outreach to ISKCON Bangalore + Banashankari Temple priests, (2) local Brahmin community FB groups, (3) Google Maps temple list scrape + cold call.
    Track via Supabase Priest + Temple tables. Each verified entry must have aadhaar_verified=true (business rule #4).
    Founder action: KYC video calls + Aadhaar verification (manual).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","bengaluru","city-1","p0"]
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
