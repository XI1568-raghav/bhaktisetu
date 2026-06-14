---
id: R-Q2-L-002
title: "Priest contracts signed — 100 pandits with revenue-share template"
category: legal
owner_role: legal
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "priest_contracts_signed"
  current: 0
  target: 100
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "Standard contract template signed off by Indian counsel"
  - "Schedule A revenue-share matrix locked (tiered 70/75/80% + per-puja bonuses)"
  - "Onboarding tracker spec ready for engineering build-out"
  - "DocuSign or equivalent e-signature pipeline configured"
  - "100 pandits with status=contract_executed in pandit_contracts table"

agent_brief:
  context_files:
    - docs/legal/priest-contract-template-100-pandits.md
    - docs/legal/R-Q2-L-002-schedule-a-revenue-share.md
    - docs/legal/R-Q2-L-002-onboarding-tracker-spec.md
    - docs/legal/R-Q2-L-002-handoff.md
  prompt_skeleton: |
    Founder-action gated. Agent can refine template language, expand Schedule A
    per-puja overrides, or scaffold tracker DB schema. Cannot recruit pandits,
    submit contracts to DocuSign, or counter-sign.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: scaffold shipped (template + Schedule A + tracker spec + handoff).
    Status stays in_progress because KPI = 100 founder-recruited + counter-signed
    contracts. See docs/legal/R-Q2-L-002-handoff.md for founder action list.

tags: ["legal","contracts","priest","supply","founder-action-required"]
created_at: 2026-06-09T21:56:42.385Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
