---
id: R-Q2-CS-003
title: "Multilingual macros — Tamil + Telugu + Bengali + Marathi support templates"
category: cs
owner_role: cpo
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: "native-speaker review for ta/te/bn/mr + Wati Meta template approval"
depends_on: ["R-Q2-E-003"]
blocks: []

kpi:
  metric: "multilingual_macros_count"
  current: 40
  target: 40
  unit: "count"
  source: "gh_repo"
  query: "sql/cs/multilingual-macro-impact.sql"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "40 intents × 6 languages = 240 strings in multilingual-macros-v1.yaml"
  - "Render script produces Wati + Freshdesk + Zoho outputs (242 files)"
  - "Schema + variable + unicode-block tests green (19/19 vitest)"
  - "DEPLOY-RUNBOOK.md ships with native-speaker review checklist + paste flow"
  - "SQL impact queries pinned for warehouse"
  - "FOUNDER: native-speaker sign-off for ta/te/bn/mr (BLOCKING)"
  - "FOUNDER: Wati Meta template approval for at least en/hi/ta"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: agent shipped scaffold (YAML, render script, 19 tests, runbook, SQL).
    en + hi production-grade. ta/te/bn/mr flagged for native review per spec §122.
    Status stays in_progress — founder action required (see founder_blocker).

tags: ["cs","multilingual","macros"]
created_at: 2026-06-09T21:55:15.909Z
updated_at: 2026-06-09T21:55:15.909Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
