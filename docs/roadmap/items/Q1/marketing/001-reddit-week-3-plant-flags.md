---
id: R-Q1-M-001
title: Reddit week-3 plant-flags — r/hinduism + r/india_speaks
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P1
status: shipped
agent_assignable: false
founder_blocker: null
depends_on: []
blocks: [R-Q1-M-002]

kpi:
  metric: reddit_comments_posted
  current: 0
  target: 21
  unit: count
  source: manual
  query: "manual count from _manual-kpis.yml field reddit_comments_count"

revenue_impact:
  amount_inr: 0
  confidence: low
  basis: "indirect — referral traffic, brand awareness"

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "21 helpful comments posted across r/hinduism + r/india_speaks (comment-only, no asks per CMO §2 week 1)"
  - "0 mod removals"
  - "Manual KPI updated"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
  prompt_skeleton: |
    CMO sub-agent. Compose 21 Reddit comment drafts for founder approval.
    Topics: puja/dharma/temple questions. Cite Darshya only if directly relevant. Comment-only, no asks.

handoff_notes: |
  2026-06-10: created from CMO doc week-1 plant-flags activity.

tags: [reddit, week-1, plant-flags, marketing]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Per CEO roadmap Day 1-30 + CMO §2 week 1.

# Reference material
- docs/company/02-cmo.md §2
- docs/ceo-roadmap-2026-05-27.md Day 1-30
