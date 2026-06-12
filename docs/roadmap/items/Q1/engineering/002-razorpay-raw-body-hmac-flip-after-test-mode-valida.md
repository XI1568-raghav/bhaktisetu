---
id: R-Q1-E-002
title: Razorpay raw-body HMAC flip after test-mode validation
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U1'
depends_on: []
blocks: []

kpi:
  metric: razorpay_verify_raw_enabled
  current: 0
  target: 1
  unit: count
  source: manual
  query: "manual KPI _manual-kpis.yml field razorpay_verify_raw_enabled (1 when Render env RAZORPAY_VERIFY_RAW=true AND test-mode webhook signature validated)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "Render env RAZORPAY_VERIFY_RAW=true set via dashboard (founder action)"
  - "curl POST /api/v1/payments/webhook with valid raw body + test-mode signature returns 200"
  - "Razorpay test-mode webhook delivers + signature verifies in Render logs"
  - "Zero prod webhook signature failures in Sentry for 7 days post-flip"

agent_brief:
  context_files:
    - apps/api/src/routes/payments.ts
    - docs/company/01-cto.md
    - docs/operational-context.md
  prompt_skeleton: |
    CTO sub-agent. Razorpay webhook HMAC over raw body — P0 security.
    Read apps/api/src/routes/payments.ts webhook handler. Currently HMAC computed over JSON.stringify (incorrect — Razorpay signs raw bytes).
    Wire Fastify rawBody preParsing hook, compute crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).
    Validate against test-mode webhook first. Founder paste RAZORPAY_VERIFY_RAW=true in Render dashboard after agent confirms test-mode signature parity.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["security","p0","razorpay"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-09T21:28:52.338Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
