---
id: R-Q1-L-003
title: "Priest contract template (Aadhaar gate + payout terms)"
category: legal
owner_role: legal
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-F-001"]
blocks: []

kpi:
  metric: "priest_contract_template"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual-kpi-1-if-docs-legal-priest-contract-template-md-exists-with-aadhaar-clause-and-payout-terms-section-and-cancellation-24h-clause"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Priest contract template MD shipped to docs/legal/priest-contract-template.md"
  - "Includes Aadhaar verification clause, 20-40% platform commission, 24h cancellation, video proof mandatory"
  - "Lawyer reviewed alongside R-Q1-L-002 refund policy"

agent_brief:
  context_files:
    - docs/company/06-legal.md
    - docs/ceo-roadmap-2026-05-27.md
    - apps/api/src/routes/admin-leads.ts
  prompt_skeleton: |
    Draft 4-page priest contract template. Cover business rule #4 (Aadhaar gate for payout),
    20-40% platform commission, business rule #5 (24h cancellation), video proof mandatory.
    Add NDA + IP clause + termination terms. Save to docs/legal/priest-contract-template.md.
    Founder reviews; bundles with R-Q1-L-002 lawyer engagement.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["legal","contracts","priest","p2"]
created_at: 2026-06-09T21:50:21.017Z
updated_at: 2026-06-09T21:50:21.017Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
