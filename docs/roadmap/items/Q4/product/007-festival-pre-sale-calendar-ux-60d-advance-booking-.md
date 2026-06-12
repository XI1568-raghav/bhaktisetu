---
id: R-Q4-P-007
title: "Festival pre-sale calendar UX — 60d advance booking + waitlist + early-bird"
category: product
owner_role: cpo
quarter: Q4
month_target: 12
priority: P2
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-011"]

kpi:
  metric: "festival_pre_sale_conv_pct"
  current: 0
  target: 12
  unit: "percent"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 80000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: SHIPPED. docs/product/specs/festival-presale-calendar-v1.md authored end-to-end:
    - Mission + 5 non-goals (no scarcity-deception, no merchandise v1, no multi-day group)
    - 4 personas (mobile devotee, family planner, NRI sankalp, first-time festival)
    - User journey (calendar → festival page → slot picker → confirm → waitlist → reminders)
    - 7 UI wireframes (calendar grid / detail / bundle / waitlist / confirm / WA reminder / admin dashboard)
    - 2 SQL data model tables (festival + festival_temple_slot) w/ enum constraints
    - 8 API endpoints under /api/v1/festivals/*
    - Copy guidelines: real-data only, NO fake scarcity ("18/40 left" allowed, "Only 5 left!" forbidden)
    - Cut-line v1 (Q3 2026 pre-Janmashtami) vs v2 (Q1 2027 pre-Holi)
    - 8 Open Questions (capacity caps, refund window, bundle proration, waitlist priority, WA U7 gate, copy i18n, tz display, email teaser opt-in)
  Unblocks R-Q4-E-011 engineering build (₹15L MRR via 60-day advance window).
  Closes: Q-C-20260612T0001-R-Q4-P-007.

tags: ["product","festival","pre-sale","calendar"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-12T07:30:00.000Z
shipped_at: 2026-06-12T07:30:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
