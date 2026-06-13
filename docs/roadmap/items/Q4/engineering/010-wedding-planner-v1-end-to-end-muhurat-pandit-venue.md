---
id: R-Q4-E-010
title: "Wedding planner v1 end-to-end — muhurat + pandit + venue + catering + photographer"
category: engineering
owner_role: cto
quarter: Q4
month_target: 10
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-P-003"]

kpi:
  metric: "wedding_planner_bookings"
  current: 0
  target: 30
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM weddings WHERE status IN ('booked','paid','completed') AND created_at >= '2026-10-01'"

revenue_impact:
  amount_inr: 900000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Wedding planner UI live at /weddings/planner with 5-step flow (muhurat > pandit > venue > catering > photographer)"
  - "Weddings table + WeddingVendor table migrated to prod via prisma db execute"
  - "30 paid wedding bookings by Dec 31 2026 with avg ticket >= 30K INR"
  - "Vendor marketplace integration: pandit/venue/catering/photographer all bookable in 1 transaction"

agent_brief:
  context_files:
    - apps/web/app/weddings/page.tsx
    - apps/web/app/weddings/inquiry/page.tsx
    - apps/api/src/routes/weddings.ts
    - prisma/schema.prisma
  prompt_skeleton: |
    CTO sub-agent. Extend existing /weddings module (inquiry-only today) into full e2e flow.
    Add WeddingVendor model (type enum: venue/catering/photographer) + Wedding-> vendor[] FK array.
    Build /weddings/planner 5-step wizard with muhurat from /astrology/muhurat + pandit from /pandits.
    Razorpay split-payment to multiple vendors per booking. Verify per success_criteria above.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["wedding","planner","e2e","commerce"]
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
