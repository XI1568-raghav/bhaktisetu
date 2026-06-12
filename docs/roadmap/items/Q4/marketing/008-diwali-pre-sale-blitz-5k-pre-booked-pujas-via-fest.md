---
id: R-Q4-M-008
title: "Diwali pre-sale blitz — 5K pre-booked pujas via festival calendar"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-E-011"]
blocks: []

kpi:
  metric: "diwali_pre_bookings"
  current: 0
  target: 5000
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM bookings WHERE festival_slug IN ('diwali','dhanteras','govardhan-puja','bhai-dooj') AND booked_at >= '2026-09-15' AND scheduled_at <= '2026-11-15'"

revenue_impact:
  amount_inr: 1500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "5000 pre-bookings across 4 Diwali-cluster festivals by Nov 15 2026"
  - "Meta + Google paid spend <= 5L INR for blended CAC <= 100 INR per pre-booking"
  - "WA-broadcast + email drip sequence launched 45 days pre-Diwali to existing devotees + waitlist"
  - "PostHog funnel diwali_landing > book_clicked > paid >= 8% end-to-end conversion"

agent_brief:
  context_files:
    - docs/company/06-marketing.md
    - apps/web/app/festivals/page.tsx
    - scripts/agents/daily-devotional-broadcast.mjs
  prompt_skeleton: |
    CMO sub-agent. Build 45-day pre-Diwali drip: 8 WA messages + 6 emails + 3 landing variants.
    Coordinate with R-Q4-E-011 festival calendar engineering; cannot pre-sell without bookable backend.
    Paid ads require founder Razorpay live keys (U1) + Meta business manager owner action.
    Sub-agent owns content/creative/copy/funnel-instrumentation; founder owns budget + ad-account access.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["diwali","pre-sale","festival","commerce"]
created_at: 2026-06-09T22:09:25.579Z
updated_at: 2026-06-09T22:09:25.579Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
