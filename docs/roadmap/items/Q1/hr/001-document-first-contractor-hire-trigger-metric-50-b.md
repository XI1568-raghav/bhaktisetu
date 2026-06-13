---
id: R-Q1-H-001
title: "Document first-contractor-hire trigger metric (50 bookings/wk OR 2h+ support OR 15h+ moderation)"
category: hr
owner_role: talent
quarter: Q1
month_target: 2
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "first_hire_trigger_documented"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual-kpi-1-if-docs-company-08-talent-md-has-section-titled-first-hire-trigger-with-3-quant-metrics-50-bookings-per-week-or-2h-daily-support-or-15h-weekly-moderation"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "docs/company/08-talent.md has First Hire Trigger section with 3 quant metrics"
  - "Trigger thresholds: 50+ bookings/wk OR 2h+ daily support OR 15h+ weekly moderation"
  - "Documented role spec (CS contractor) + budget cap (₹25k/mo) + onboarding doc link"

agent_brief:
  context_files:
    - docs/company/08-talent.md
    - docs/ceo-roadmap-2026-05-27.md
    - docs/agent-reports/
  prompt_skeleton: |
    Read docs/company/08-talent.md. Append First Hire Trigger section.
    Cite 3 trigger metrics from CEO doc: 50+ bookings/wk OR 2h+ founder daily on support OR 15h+ weekly moderation.
    Draft contractor role spec: part-time CS, 20h/wk, ₹25k/mo cap.
    Sub-agent emits weekly alert when any trigger condition crossed (check via daily-cron).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-11: shipped per Q-C-20260610T1623-R-Q1-H-001.
    Files: docs/hr/first-hire-trigger.md (T1/T2/T3 OR-logic, real Prisma queries verified against
    apps/api/prisma/schema.prisma — PujaBooking line 415 + SupportTicket line 1247).
    Cross-linked from docs/company/06-talent.md §5.
    No moderation audit table in schema — T3 marked BLOCKED w/ manual fallback to docs/hr/_first-hire-tracking.md.
    Recommended new roadmap item: ModerationAction audit table.

tags: ["hr","hiring","trigger","p2"]
created_at: 2026-06-09T21:50:30.082Z
updated_at: 2026-06-11T04:10:00.000Z
shipped_at: 2026-06-11T04:10:00.000Z
verified_at: 2026-06-11T04:10:00.000Z
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
