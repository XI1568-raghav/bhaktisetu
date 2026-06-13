---
id: R-Q1-SA-003
title: "Sringeri Math direct outreach (anchor temple chain LOI candidate)"
category: sales
owner_role: sales
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "sringeri_intro_status"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual-kpi-1-if-docs-agent-reports-sringeri-outreach-md-has-status-equals-intro-call-completed-or-LOI-signed-with-date-stamp"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "1 intro call with Sringeri Math administration completed by Mar 31"
  - "Outreach attempts logged in docs/agent-reports/sringeri-outreach.md"
  - "Path to LOI documented (decision-maker name + next step)"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - docs/ceo-roadmap-2026-05-27.md
    - docs/agent-reports/
  prompt_skeleton: |
    Cannot agent-assign — founder action required for relationship.
    Sub-agent prepares warm intro asks: scrape LinkedIn for Sringeri Math admin contacts.
    Drafts 3-paragraph outreach email mentioning shared vision + 80G + video-proof differentiator.
    Founder sends email + does follow-up calls. Sub-agent logs each touch to docs/agent-reports/sringeri-outreach.md.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","sringeri","loi","p2"]
created_at: 2026-06-09T21:47:15.182Z
updated_at: 2026-06-09T21:47:15.182Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
