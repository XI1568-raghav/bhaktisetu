---
id: R-Q1-P-006
title: "Referral 100 INR credit each side (after first paid booking)"
category: product
owner_role: cpo
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "referral_active"
  current: 0
  target: 1
  unit: "count"
  source: "gh_repo"
  query: "gh-1-if-apps-api-src-routes-referrals-ts-exists-and-referral-credit-100-inr-applied-on-claim-after-first-paid-booking-and-refer-page-tsx-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "/refer page live (already shipped per HANDOFF 2026-05-27)"
  - "Credit applied: ₹100 to both referrer + referee on first paid booking"
  - "ReferralClaimStatus enum + referral_codes + referral_claims tables in prisma"
  - "30-day cookie capture + auto-claim on auth"

agent_brief:
  context_files:
    - apps/api/src/routes/referrals.ts
    - apps/web/app/refer/page.tsx
    - apps/web/components/ReferralCapture.tsx
  prompt_skeleton: |
    Already shipped per HANDOFF 2026-05-27. Sub-agent verifies:
    GET /api/v1/referrals/mine returns 200 for authed user.
    Credit applies on first paid booking trigger (apps/api/src/routes/booking webhook).
    Sub-agent adds vitest case for credit-applied-once-per-referee guard.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","referral","growth","p2"]
created_at: 2026-06-09T21:51:06.038Z
updated_at: 2026-06-09T21:51:06.038Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
