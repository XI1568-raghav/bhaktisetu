---
id: R-Q2-P-003
title: "Yatra package commerce — 5 packages live w/ real Razorpay (Char Dham + others)"
category: product
owner_role: cpo
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-P-001"]
blocks: []

kpi:
  metric: "yatra_packages_booked"
  current: 0
  target: 50
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"YatraInquiry\" WHERE status='paid' AND created_at >= '2026-04-01'"

revenue_impact:
  amount_inr: 250000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "5 yatra packages live in /yatra (Char Dham + Vaishno Devi + Tirupati + Kashi + Shirdi minimum)"
  - "Real Razorpay checkout wired (apps/api/src/routes/yatra-inquiry.ts) replacing setTimeout mock (P17 HANDOFF 2026-05-27)"
  - "Reference IDs follow YTR-YYYYMMDD-XXXXX format"
  - "≥10 yatra inquiries converted to paid bookings in Q2 (SQL count YatraInquiry status=paid)"
  - "Per-package landing pages at /yatra/[slug]/book/page.tsx work end-to-end"

agent_brief:
  context_files:
    - apps/api/src/routes/yatra-inquiry.ts
    - apps/web/app/yatra/[slug]/book/page.tsx
    - apps/web/lib/pilgrimage-circuits.ts
    - docs/company/04-cpo.md
  prompt_skeleton: |
    CPO sub-agent. P1 yatra commerce — 5 packages live w/ real Razorpay.
    Read apps/api/src/routes/yatra-inquiry.ts (real POST replacing setTimeout mock per P17 HANDOFF 2026-05-27).
    Verify /yatra/[slug]/book/page.tsx checkout flow end-to-end for all 5 packages.
    Confirm Razorpay HMAC verification (R-Q1-E-002 dep) lights up payment webhook.
    Coordinate w/ supply onboarding: each package needs verified pandit + temple anchor.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","yatra","commerce","razorpay"]
created_at: 2026-06-09T21:55:20.368Z
updated_at: 2026-06-09T21:55:20.368Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
