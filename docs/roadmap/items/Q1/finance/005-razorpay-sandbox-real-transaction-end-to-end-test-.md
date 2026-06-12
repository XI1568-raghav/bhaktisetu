---
id: R-Q1-F-005
title: "Razorpay sandbox real transaction END-TO-END test (₹1 charge + refund)"
category: finance
owner_role: cfo
quarter: Q1
month_target: 1
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-E-002"]
blocks: []

kpi:
  metric: "razorpay_e2e_tested"
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
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-12: Runbook shipped. docs/finance/razorpay-sandbox-e2e-runbook-v1.md (8-step ₹1 charge + refund E2E validation):
    - Prerequisites + env verification
    - Test booking creation via cURL or web
    - Razorpay order creation + DB verification
    - Test card payment (Visa 4111... + UPI success@razorpay + 3DS variants)
    - Payment capture verification (Razorpay dashboard + DB rows + booking flip to confirmed)
    - Webhook signature verification (local-dev simulation w/ openssl HMAC)
    - Refund initiation + processed verification
    - Cleanup steps
    - Pass criteria + 7 failure modes w/ debugging tips
    - Test runs log table (founder fills first run)
  FOUNDER ACTION: ~30 min focused run through 8 steps using test keys. After all 7 pass, schedule monthly re-run + log here. Pass criteria gates U1 live KYC submission.
  Closes (partial): R-Q1-F-005. Status flips to shipped after founder logs first successful run.

tags: ["payments","test","p0"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-12T09:45:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
