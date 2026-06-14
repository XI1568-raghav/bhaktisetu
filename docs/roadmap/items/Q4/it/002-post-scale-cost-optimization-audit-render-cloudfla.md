---
id: R-Q4-IT-002
title: "Post-scale cost optimization audit — Render + Cloudflare + Supabase + Razorpay spend"
category: it
owner_role: it
quarter: Q4
month_target: 12
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-E-004"]
blocks: []

kpi:
  metric: "monthly_infra_cost_inr"
  current: 0
  target: 150000
  unit: "inr"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
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
  2026-06-14: Engineering-hand handoff doc shipped (docs/it/R-Q4-IT-002-handoff.md). Item now founder-action-required (Render/Supabase/Razorpay/Stripe/GH dashboard access + business judgment for ROI ranking). Handoff includes:
    - 14-row per-service spend snapshot template w/ dashboard pull instructions
    - Per-feature cost-attribution table (live darshan / puja / NRI gift / astrology / SSG / agents / orchestrator / email / Knowledge Hub)
    - Optimization opportunity ROI ranking template (Render autoscale, R2 migration, Razorpay MOR negotiation, LLM prompt caching, cron throttle, Sentry cleanup, image compression, OG static migration)
    - 8 tripwires for ongoing observability (Render compute, CF builds, Supabase DB, GH Actions, Anthropic, Razorpay/Stripe fee %)
    - Decision log + 9 pass-criteria + resume cheatsheet (4× 6hr founder sessions across 1 quarter)
  UNBLOCKS:
    - Q4 ₹150,000/mo infra-cost ceiling KPI
    - Quarterly cost-guardrail cadence (Q1 of next year auto-scheduled via founder calendar entry)
    - All ad-hoc paid-tier flips (each must reconcile to audit doc going forward)
  FOUNDER ACTION: ~24 hr spread across 1 quarter — dashboard invoice pulls + business decisions on optimization ranking + tripwire wiring + decision log entries.
  Closes (partial): R-Q4-IT-002. Status flips to shipped after founder completes 9 pass-criteria + audit report dated within last 7 days.

tags: ["it","cost","optimization","audit"]
created_at: 2026-06-09T22:09:25.039Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
