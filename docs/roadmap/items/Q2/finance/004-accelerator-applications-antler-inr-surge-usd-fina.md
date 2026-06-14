---
id: R-Q2-F-004
title: "Accelerator applications — Antler INR + Surge USD financial requirements"
category: finance
owner_role: cfo
quarter: Q2
month_target: 6
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-M-013"]
blocks: []

kpi:
  metric: "accelerator_applications"
  current: 0
  target: 3
  unit: "count"
  source: "manual"
  query: "count of submissions logged in docs/finance/applications/_log.md"

revenue_impact:
  amount_inr: 5000000
  confidence: low
  basis: "Antler ₹50L SAFE at typical 1-in-3 acceptance rate; Surge USD cheque + Series A halo are upside not counted."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "3 accelerator applications submitted within Q2 (Antler India + Surge by Peak XV + YC/Techstars)"
  - "Each submission logged in docs/finance/applications/_log.md with timestamp + program + cycle + outcome ETA"
  - "Reusable assets (deck v2 + financial model) built once, used 3x"
  - "Per-program requirement gaps tracked back to blocking items (U1 Razorpay KYC, U2 Stripe NRI KYC, R-Q1-F-001 incorporation)"

agent_brief:
  context_files:
    - "docs/finance/R-Q2-F-004-handoff.md"
    - "docs/finance/accelerator-applications-checklist.md"
    - "docs/finance/pitch-deck-v2-outline.md"
    - "docs/finance/pitch-deck-v2-financial-model.csv"
    - "docs/finance/R-Q1-F-001-handoff.md"
  prompt_skeleton: |
    Scaffold + per-program requirement checklist is complete in docs/finance/R-Q2-F-004-handoff.md.
    Submissions are founder-action — agent cannot submit applications on founder's behalf.
    Agent role: maintain submission target dates table as cycle deadlines update, surface deck/model refresh needs as KPI numbers change, log outcomes when founder reports back.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: scaffold + per-program requirement checklist + submission target dates shipped in docs/finance/R-Q2-F-004-handoff.md (R-Q2-F-004 batch). Status stays in_progress — KPI requires founder action (founder submits applications; agent cannot). Branch finance/R-Q2-F-004-batch-2026-06-15.

tags: ["fundraising","accelerator","financials"]
created_at: 2026-06-09T21:56:41.463Z
updated_at: 2026-06-09T21:56:41.463Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
