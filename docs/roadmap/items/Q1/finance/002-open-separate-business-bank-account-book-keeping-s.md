---
id: R-Q1-F-002
title: "Open separate business bank account + book-keeping spreadsheet"
category: finance
owner_role: cfo
quarter: Q1
month_target: 2
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-F-001"]
blocks: []

kpi:
  metric: "business_bank_open"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Foundation current account opened at ICICI/HDFC/Axis"
  - "Razorpay + Stripe settlement bank switched to Foundation account"
  - "Book-keeping spreadsheet (4 sheets) live + first month reconciled"
  - "Monthly reconciliation cadence scheduled (founder + CA)"

agent_brief:
  context_files:
    - "docs/finance/business-bank-account-setup-runbook.md"
    - "docs/finance/foundation-books-FY26-27-template.csv"
    - "docs/finance/R-Q1-F-002-handoff.md"
  prompt_skeleton: |
    Agent portion complete (runbook + template + handoff shipped 2026-06-15).
    Founder-action-required for bank account opening + settlement bank switch.
    See R-Q1-F-002-handoff.md for 7-step founder sequence.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: business-bank-account-setup-runbook.md shipped.
  2026-06-15: R-Q1-F-002-handoff.md + foundation-books-FY26-27-template.csv scaffolded.
    Status stays in_progress — KPI business_bank_open requires founder branch visit + Razorpay/Stripe settlement bank switch.
    Depends on R-Q1-F-001 (incorp decision) — bank account opens in chosen entity name.

tags: ["finance","bank","p1"]
created_at: 2026-06-09T21:50:13.304Z
updated_at: 2026-06-09T21:50:13.304Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
