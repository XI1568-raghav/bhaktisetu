---
id: R-Q2-SA-001
title: "ISKCON central partnership LOI signed — 5 temple onboarding pipeline"
category: sales
owner_role: sales
quarter: Q2
month_target: 4
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-S-011"]
blocks: []

kpi:
  metric: "iskcon_loi_signed"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual KPI _manual-kpis.yml field iskcon_loi_signed (1 when LOI countersigned by ISKCON central HQ + 5 temple onboarding pipeline confirmed in writing)"

revenue_impact:
  amount_inr: 150000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "ISKCON central HQ (Mayapur or Mumbai chowpatty) outreach email + 2 follow-ups sent"
  - "First meeting scheduled w/ ISKCON central temple administration"
  - "LOI drafted (Darshya legal template) + counter-reviewed by ISKCON legal"
  - "LOI countersigned — 5-temple pilot pipeline named (city + temple-in-charge contact)"
  - "Pilot temples added to Darshya temple catalog w/ verified flag (Sprint 3 P1 gate)"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - docs/company/08-legal.md
    - scripts/agents/cold-temple-outreach.mjs
    - apps/web/lib/temples.ts
  prompt_skeleton: |
    Sales sub-agent. P0 ISKCON central partnership — depends on R-Q2-S-011 first ISKCON pilot.
    Cannot agent-assign LOI negotiation — founder/legal must lead.
    Agent action: draft outreach email + follow-up cadence + LOI template per docs/company/08-legal.md.
    Track pipeline in docs/agent-reports/YYYY-MM-DD-iskcon-pipeline.md w/ stage (outreach/meeting/loi-draft/signed).
    On LOI signed: update manual KPI _manual-kpis.yml field iskcon_loi_signed=1, trigger 5-temple onboarding workflow.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","iskcon","partnership","loi"]
created_at: 2026-06-09T21:56:43.738Z
updated_at: 2026-06-09T21:56:43.738Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
