---
id: R-Q1-M-004
title: "Twitter+LinkedIn+Instagram+YouTube accounts created with bio+pinned"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "social_accounts_active"
  current: 0
  target: 4
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "Twitter @bhaktisetu live with bio + pinned tweet"
  - "LinkedIn /company/bhaktisetu live with bio + pinned post"
  - "Instagram @bhaktisetu live (business account) with bio + pinned carousel"
  - "YouTube @bhaktisetu live with channel trailer pinned"
  - "All 4 accounts cross-linked to bhaktisetu.com/about"

agent_brief:
  context_files:
    - "docs/marketing/R-Q1-M-004-handoff.md"
    - "docs/marketing/social-accounts-setup-runbook.md"
  prompt_skeleton: |
    Founder-only execution. Agent role: ship spec + bio + pinned post templates.
    See docs/marketing/R-Q1-M-004-handoff.md for 4-platform paste-ready strings.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: agent shipped paste-ready handoff with bio + pinned post templates
  for all 4 platforms. KPI stays 0/4 until founder claims handles + confirms live.
  Status remains in_progress (founder-action required, agent cannot execute).

tags: ["social","week-1","p1","founder-action-required"]
created_at: 2026-06-09T21:47:07.357Z
updated_at: 2026-06-09T21:47:07.357Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
