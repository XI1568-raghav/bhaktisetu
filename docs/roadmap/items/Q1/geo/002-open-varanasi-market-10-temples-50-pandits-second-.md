---
id: R-Q1-G-002
title: "Open Varanasi market (10 temples + 50 pandits second city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 2
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-001","R-Q1-S-004"]
blocks: []

kpi:
  metric: "city_active_varanasi"
  current: 0
  target: 1
  unit: "count"
  source: "supabase"
  query: 'SELECT CASE WHEN (SELECT COUNT(*) FROM "Priest" WHERE city=''Varanasi'' AND aadhaar_verified=true) >= 50 AND (SELECT COUNT(*) FROM "Temple" WHERE city=''Varanasi'' AND verified=true) >= 10 THEN 1 ELSE 0 END'

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Supabase: ≥50 verified pandits in Varanasi (Priest table)"
  - "Supabase: ≥10 verified temples in Varanasi (Temple table)"
  - "≥10 paid bookings completed via Varanasi pandits in last 30d"
  - "/city/varanasi page live with temple + puja inventory"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - docs/company/02-cmo.md
    - apps/web/app/city/page.tsx
  prompt_skeleton: |
    Sales sub-agent. City-2 launch — Varanasi (highest devotional density India, Kashi Vishwanath halo).
    Blocked on R-Q1-S-001 (50 Varanasi pandits) + R-Q1-S-004 (10 Varanasi temples) — coordinate.
    Tactics: (1) physical recce — founder/agent visit Vishwanath corridor + Dashashwamedh ghat, (2) Pandit Sabha outreach, (3) hostel/dharamshala temple priest enrollment.
    Highest leverage city for NRI gift-puja revenue (Banaras = canonical "send puja to Kashi" lane).
    Founder action: 1-week Varanasi trip Q1 month 2.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","varanasi","city-2","p0"]
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
