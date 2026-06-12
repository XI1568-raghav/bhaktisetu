---
id: R-Q4-P-006
title: "B2B white-label v1 spec — custom domain + branding + multi-tenant admin"
category: product
owner_role: cpo
quarter: Q4
month_target: 11
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-009"]

kpi:
  metric: "whitelabel_temple_csat"
  current: 0
  target: 90
  unit: "percent"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 20
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: SHIPPED. docs/specs/b2b-whitelabel-v1.md authored end-to-end:
    - Goal + 5 non-goals (SDK+iframe not raw API, no custom puja types v1)
    - 5 target B2B segments (matchmaking, NRI community, astrology, devotional content, fintech)
    - 3 personas + 2 user journeys (devotee-side + partner-side)
    - 2 SQL data model tables (b2b_tenant + b2b_booking_attribution — multi-tenancy via attribution table NOT direct booking column)
    - 8 API endpoints under /api/v1/b2b/*
    - SDK npm package shape (@bhaktisetu/embed) + iframe widget contract w/ postMessage events
    - Webhook contract (booking.paid → partner, HMAC-SHA256 signature, 3 retries over 24h)
    - 3 revenue tiers (Starter 10% / Growth 15% / Strategic 20%) w/ min monthly volume + revenue commitments
    - Test plan: 13 cases (8 integration + 3 widget + 2 CSP/iframe security)
    - Cut-line v1 (Q1 2027) vs v2 (Q3 2027)
    - 10 Open Questions (sandbox vs prod keys, CSP ownership, refund handling, brand accessibility, devotee data ownership, termination handling, intl tax, partner-vs-temple share source, webhook escalation, SEO impact)
  Engineering ticket R-Q4-E-013 to be filed next cycle for build.
  Closes: Q-C-20260610T1623-R-Q4-P-006.

tags: ["product","whitelabel","b2b","multi-tenant"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-12T07:45:00.000Z
shipped_at: 2026-06-12T07:45:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
