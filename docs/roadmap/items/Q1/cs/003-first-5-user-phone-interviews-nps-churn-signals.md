---
id: R-Q1-CS-003
title: "First 5 user phone interviews (NPS + churn signals)"
category: cs
owner_role: cs
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "user_interviews_completed"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "manual-kpi-count-completed-30min-phone-interviews-logged-in-docs-agent-reports-user-interviews-md-with-nps-and-churn-signal-fields"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 5
est_cost_inr: 0

success_criteria:
  - "5 users completed 30-min phone interviews by month 3"
  - "NPS score captured for each (0-10 scale)"
  - "Top 3 churn signals + top 3 wow moments aggregated in docs/agent-reports/user-interviews.md"

agent_brief:
  context_files:
    - docs/company/07-cs.md
    - apps/web/lib/posthog.ts
    - docs/agent-reports/
  prompt_skeleton: |
    Pull 5 paid users from past 30 days. Filter active + churned mix.
    Draft phone interview script. Cover NPS + first puja experience + churn signal.
    Founder runs calls. Sub-agent writes recap markdown per call to docs/agent-reports/user-interviews.md.
    Aggregate NPS + top 3 churn signals + top 3 wow moments at end of batch.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Groundwork shipped (R-Q1-CS-003 partial). 3 artifacts:
    - apps/api/scripts/ops/sla-breach-outreach.ts — re-runnable script, reads /admin/ops/sla-overdue-bookings, emits CSV w/ daysOverdue + repeatBreachCount + suggestedAction. 15/15 unit tests green covering csvField escaping, day math, priest flag, sort determinism, idempotency, empty-input.
    - docs/agent-reports/2026-06-12-sla-breach-action.md — 5 per-booking WhatsApp+Email drafts (EN+HI for Booking 1, template for 2-5), GH issue body for priest 821edbe5 investigation, founder runbook section D.
    - docs/agent-reports/user-interviews.md — interview log skeleton, 30-min script, NPS schema, churn/wow signal aggregation placeholders. Recruitment plan: invite SLA-breach devotees first (highest-intent post-resolution).
  Founder action pending: run script w/ real ADMIN_OPS_TOKEN, fill devotee contact placeholders from admin panel, send 5 WhatsApp+email outreach manually, open GH priest-quality issue, block priest 821edbe5 payouts. After resolution → kick off 5 phone interviews per skeleton.
  Closes (partial): Q-C-20260611T2307-R-Q1-CS-003. Status stays in_progress until 5 interviews complete + churn/wow signals aggregated.

tags: ["cs","interview","nps","p2"]
created_at: 2026-06-09T21:50:37.964Z
updated_at: 2026-06-09T21:50:37.964Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
