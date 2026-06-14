---
id: R-Q1-F-003
title: "Razorpay live KYC submission for domestic real payments"
category: finance
owner_role: cfo
quarter: Q1
month_target: 2
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: 'U1'
depends_on: []
blocks: []

kpi:
  metric: "razorpay_live_active"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "Founder submits Section 8 KYC bundle via Razorpay Dashboard"
  - "Razorpay verification team approves live mode"
  - "Render env flipped from rzp_test_* to rzp_live_* keys"
  - "razorpay_live_active KPI flipped to 1 in docs/roadmap/_manual-kpis.yml"
  - "apps/api/scripts/probe-razorpay-mode.mjs prints mode=live ok=true"

agent_brief:
  context_files:
    - "docs/finance/razorpay-live-kyc-spec.md"
    - "docs/finance/R-Q1-F-003-handoff.md"
    - "apps/api/scripts/probe-razorpay-mode.mjs"
  prompt_skeleton: |
    Founder-action item. Agent role: maintain handoff doc + probe script + KPI tracker.
    Engineering already wired in apps/api/src/routes/payment.ts (env-or-noop).
    Cannot self-submit — needs founder Aadhaar/PAN/director-signed docs + Razorpay dashboard login.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: agent ship batch — created docs/finance/R-Q1-F-003-handoff.md + apps/api/scripts/probe-razorpay-mode.mjs + razorpay_live_active KPI tracker in _manual-kpis.yml. Status stays in_progress — KPI requires founder submission + Razorpay approval. PR finance/R-Q1-F-003-batch-2026-06-15.

tags: ["fundraising","razorpay","kyc","p1"]
created_at: 2026-06-09T21:50:13.304Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Currently all bookings flow through Razorpay test mode + cash-on-fulfilment. Live mode unblocks U1 activation gate — real-money domestic payment capture, settlement to Section 8 Foundation account, GST-compliant invoicing. P1 dependency for L1-L3 revenue lanes (puja booking, live darshan offerings, gaushala seva).

# Reference material

- `docs/finance/razorpay-live-kyc-spec.md` — submission spec (8 docs + 7 steps + risk)
- `docs/finance/R-Q1-F-003-handoff.md` — founder action sequence + tracking
- `apps/api/scripts/probe-razorpay-mode.mjs` — env-or-noop key mode probe
- `apps/api/src/routes/payment.ts` — Razorpay client wiring (already env-or-noop)
- `docs/activation-gates.md` — U1 founder gate
- `docs/roadmap/_manual-kpis.yml` — `razorpay_live_active` tracker
