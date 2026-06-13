---
id: R-Q2-S-011
title: "ISKCON partnership LOI — central onboarding pipeline for 5 ISKCON temples"
category: supply
owner_role: sales
quarter: Q2
month_target: 6
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q2-SA-001"]

kpi:
  metric: "iskcon_temples_onboarded"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Outreach kit v1 shipped (iskcon-org-map-2026-06.md / iskcon-loi-template-v1.md / iskcon-outreach-kit-v1.md / data/sales/iskcon-outreach-tracker.csv).
  2026-06-13: Spec-compliant artifact set shipped per queue R-Q2-S-011 (Q-C-20260612T0503):
    - docs/sales/iskcon-org-map-2026-06.md (kept — already spec-compliant)
    - docs/sales/iskcon-loi-template-2026-06.md (NEW — focused 1-page LOI per spec, all 11 clauses, DRAFT + legal review required)
    - docs/sales/iskcon-temple-outreach-2026-06.md (NEW — 5 temple drafts ≤200 words each, Bangalore/Juhu/EOK/Chennai/Vrindavan, Vaishnava greeting, temple-specific facts)
    - docs/sales/iskcon-warm-intro-angels-2026-06.md (NEW — gap-report variant: 0 confirmed + 5 lead networks to verify with founder action checklist)
  ZERO sends from agent. Every [NAME-TBD]/[VERIFY-FOUNDER] marker requires founder verification before contact.
  Recommended path: PILOT (TP-led, lower ceiling, faster) for v1. CENTRAL deal in v2 once pilot proves model.
  FOUNDER ACTIONS (post-merge):
    1. Decide central GBC deal path vs distributed 5-temple path (org map informs)
    2. Send LOI to legal counsel before any signature send
    3. Validate 3 warm-intro angel candidates from Lead A + Lead B (~4h)
    4. Approve/edit 5 temple outreach drafts before send
    5. Confirm Bengaluru jurisdiction in LOI
  Closes (partial): Q-C-20260612T0503-R-Q2-S-011. Status stays in_progress until 3+ replies logged in tracker.

tags: ["supply","partnership","iskcon","b2b"]
created_at: 2026-06-09T21:55:22.029Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
