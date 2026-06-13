---
id: R-Q4-S-007
title: "Onboard 20 antim sanskar specialist pandits — Kashi + Haridwar + Prayagraj ghats"
category: supply
owner_role: sales
quarter: Q4
month_target: 10
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-001"]

kpi:
  metric: "antim_specialist_pandits"
  current: 0
  target: 20
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 100000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: scaffolding shipped (R-Q4-S-007 ship-loop). Playbook docs/sales/playbooks/antim-pandit-onboarding.md. Tracker docs/sales/trackers/antim-pandits-pipeline.md. 60-prospect CSV seeds/antim-pandits-prospects.csv. Schema migration + seed loader stubbed (supabase/migrations/, scripts/sales/seed-antim-pandits.ts). Handoff doc docs/sales/R-Q4-S-007-handoff.md. Founder must: (1) apply schema migration; (2) bootstrap signal-context kpi-collectors registry OR inline query into _kpi-supabase.mjs; (3) run outreach.

tags: ["supply","antim-sanskar","specialist","ghat"]
created_at: 2026-06-09T22:09:26.554Z
updated_at: 2026-06-09T22:09:26.554Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
