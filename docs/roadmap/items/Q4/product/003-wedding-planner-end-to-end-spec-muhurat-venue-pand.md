---
id: R-Q4-P-003
title: "Wedding planner end-to-end spec — muhurat + venue + pandit + vendors + checklist"
category: product
owner_role: cpo
quarter: Q4
month_target: 10
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-010"]

kpi:
  metric: "wedding_planner_csat"
  current: 0
  target: 85
  unit: "percent"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
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
  2026-06-12: SHIPPED. docs/product/specs/wedding-planner-v1.md authored end-to-end (~700 LOC):
    - Mission + Non-goals (wedding-only, no court paperwork, no destination)
    - User Journey (5-step linear flow: muhurat → venue → pandit → vendors → dashboard)
    - 4 Personas (bride, bride's father, groom, groom's mother — covers parent-led + couple-led + multilingual)
    - Data Model Deltas: 3 SQL tables (wedding_event, wedding_vendor_booking, muhurat_request) w/ enums + indexes
    - API Surface: 12 endpoints across /api/v1/weddings + 1 public /api/v1/muhurat/preview (lead-capture teaser)
    - 12 UI Screens (ASCII wireframes)
    - Revenue Model: 3 tiers (Lite ₹15K / Standard ₹50K-₹3L / Premium ₹2L-₹25L) at 8-12% take-rate; Y1 ₹2L projection
    - MVP Cut-line table (v1 ship Q4 2026 vs v2 ship Q2 2027)
    - Competitor Diff vs WedMeGood / ShaadiSaga / BookMyPandit (muhurat-as-anchor = our moat)
    - 8 Open Questions for founder review (concurrency lock, refund policy, vendor SLA, KYC discrepancy, interfaith handling, sankalp i18n, postponement, scale)
  scripts/lint-product-specs.mjs extended w/ wedding-planner-specific rules (8 H2s required, ≥8 endpoints, ≥12 wireframes, 3 named tables, all 3 revenue tiers + 8-12% take-rate, ≥2 of 3 named competitors, v1+v2 in cut-line table). Lint GREEN.
  Closes: Q-C-20260612T0503-R-Q4-P-003. Unblocks R-Q4-E-010 engineering build.

tags: ["product","wedding","planner","e2e"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-12T06:00:00.000Z
shipped_at: 2026-06-12T06:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
