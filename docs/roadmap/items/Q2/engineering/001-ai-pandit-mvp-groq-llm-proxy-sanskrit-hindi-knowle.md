---
id: R-Q2-E-001
title: "AI Pandit MVP — Groq LLM proxy + Sanskrit/Hindi knowledge base ingest"
category: engineering
owner_role: cto
quarter: Q2
month_target: 4
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q2-P-001"]

kpi:
  metric: "ai_pandit_responses_per_day"
  current: 0
  target: 500
  unit: "count"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["ai","pandit","mvp","groq"]
created_at: 2026-06-09T21:55:16.790Z
updated_at: 2026-06-09T21:55:16.790Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
