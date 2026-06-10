---
id: R-Q1-CS-003
title: "First 5 user phone interviews (NPS + churn signals)"
category: cs
owner_role: cs
quarter: Q1
month_target: 3
priority: P2
status: planned
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
