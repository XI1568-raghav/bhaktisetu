---
id: R-Q2-G-007
title: "WhatsApp diaspora groups — seed 10 NRI WA groups (Bay Area + NJ + LDN)"
category: geo
owner_role: cmo
quarter: Q2
month_target: 6
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: 'U7'
depends_on: ["R-Q1-G-008"]
blocks: []

kpi:
  metric: "wa_diaspora_groups_seeded"
  current: 0
  target: 10
  unit: "count"
  source: "manual"
  query: "founder-maintained tracking sheet — see docs/geo/R-Q2-G-007-whatsapp-diaspora-groups-handoff.md §Tracking"

revenue_impact:
  amount_inr: 50000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files:
    - "docs/geo/R-Q2-G-007-whatsapp-diaspora-groups-handoff.md"
    - "docs/activation-gates.md"
  prompt_skeleton: |
    Group seeding is offline founder activity — NOT automatable from agent.
    Reference docs/geo/R-Q2-G-007-whatsapp-diaspora-groups-handoff.md for:
    - 15 candidate anchor communities across Bay Area + NJ + London
    - Organizer outreach template
    - Co-branded broadcast vs festival-specific group format
    - Manual KPI tracking sheet schema
    - 5-criterion success definition
    Update current KPI value weekly from founder tracking sheet.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (r4): Scaffolded full recruitment playbook + 15 candidate communities + outreach template + tracking schema + 5-criterion success def at docs/geo/R-Q2-G-007-whatsapp-diaspora-groups-handoff.md. Status remains in_progress — KPI requires founder offline activity (estimated 8-12 week calendar). Platform-side prerequisites already shipped (NRI USD tier, gift-puja flow, per-source UTM, /nri landing). WhatsApp Business API integration (gate U7) NOT in scope of this item — tracked separately.

tags: ["geo","nri","wa","diaspora"]
created_at: 2026-06-09T21:55:18.035Z
updated_at: 2026-06-09T21:55:18.035Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
