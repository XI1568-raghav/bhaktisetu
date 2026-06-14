---
id: R-Q3-H-001
title: "Senior backend contractor onboarded — 30hr/week Node + Postgres + India based"
category: hr
owner_role: hr
quarter: Q3
month_target: 7
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "senior_contractor_active"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "docs/roadmap/_manual-kpis.yml -> values.senior_contractor_active (founder updates on hire)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Frees 20-25 founder hr/week for BD + fundraising — indirect MRR lift. No direct revenue line."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "JD authored covering hard requirements + comp + interview process + onboarding plan (docs/hr/senior-backend-contractor-jd.md)"
  - "Handoff doc tracks founder-action lanes (docs/hr/R-Q3-H-001-handoff.md)"
  - "Trigger conditions documented (MRR > ₹2L + founder bandwidth + cash runway)"
  - "On hire: senior_contractor_active flipped 0->1 in _manual-kpis.yml + status flipped in_progress->shipped"

agent_brief:
  context_files:
    - "docs/hr/senior-backend-contractor-jd.md"
    - "docs/hr/R-Q3-H-001-handoff.md"
    - "docs/hr/first-hire-trigger.md"
  prompt_skeleton: |
    Founder-action-required: sub-agent cannot interview humans. JD already shipped 2026-06-13. Handoff doc tracks founder lanes (post JD, calendar calls, pay trial, pick fit). On hire, flip KPI + status.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: JD shipped (docs/hr/senior-backend-contractor-jd.md).
  2026-06-14: handoff doc shipped (docs/hr/R-Q3-H-001-handoff.md), success criteria populated, KPI source pinned, labeled founder-action-required. Status remains in_progress — flips on first contractor onboarded.

tags: ["hr","contractor","backend","senior","founder-action-required"]
created_at: 2026-06-09T22:02:50.945Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
