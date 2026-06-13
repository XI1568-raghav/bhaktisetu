---
id: R-Q4-E-011
title: "Festival pre-sale calendar — Diwali/Navratri/Karwa-Chauth bookings 60d in advance"
category: engineering
owner_role: cto
quarter: Q4
month_target: 11
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "festival_pre_sale_bookings"
  current: 0
  target: 5000
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM bookings WHERE festival_slug IS NOT NULL AND scheduled_at - booked_at >= INTERVAL '30 days' AND booked_at >= '2026-09-01' AND booked_at < '2026-12-01'"

revenue_impact:
  amount_inr: 1500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 28
est_cost_inr: 0

success_criteria:
  - "Festival calendar UI live at apps/web/app/festivals/[slug] with 60-day-ahead booking enabled for 8 major festivals"
  - "Bookings table gains festival_slug column + migration shipped via prisma db execute on prod"
  - "5000+ pre-bookings recorded across Diwali/Navratri/Karwa-Chauth by Nov 30 2026"
  - "Festival-aware Razorpay invoice template tested with capacity caps per temple per festival"

agent_brief:
  context_files:
    - apps/web/app/festivals/page.tsx
    - apps/web/lib/festivals.ts
    - apps/api/src/routes/pujas.ts
    - prisma/schema.prisma
  prompt_skeleton: |
    CTO sub-agent. Extend lib/festivals.ts 30 entries with bookable_window_days field.
    Add Prisma migration: festival_slug varchar(64) nullable on Booking + index on festival_slug+scheduled_at.
    Wire /festivals/[slug]/book page that lists eligible pujas + capacity counter per temple.
    Verify per success_criteria; orchestrator KPI scraper queries supabase per kpi.query above.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["festival","pre-sale","calendar","commerce"]
created_at: 2026-06-09T22:09:23.580Z
updated_at: 2026-06-09T22:09:23.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
