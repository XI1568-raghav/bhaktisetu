---
id: R-Q1-M-015
title: Referral cash program — ₹100 credit per converting referral (LOW priority per founder)
category: marketing
owner_role: cmo
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: [R-Q1-E-003]
blocks: []

kpi:
  metric: referral_paid_conversions_per_month
  current: 0
  target: 50
  unit: count
  source: supabase
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 25000
  confidence: low
  basis: "50 paid referrals × avg ₹500 puja = ₹25k/mo gross. Net: ₹25k − 50 × ₹100 credit = ₹20k/mo. Founder flagged this as LOW priority — track but don't optimize."

est_hours: 16
est_cost_inr: 5000

success_criteria:
  - "Existing referral-code flow (a99e9a3 referrals route) extended with cash-credit issuance"
  - "Referrer gets ₹100 platform credit (12-month validity, non-transferable, redeemable on puja booking ≥₹500) when referee completes first paid booking"
  - "Credit visible on /profile + auto-applies on next checkout"
  - "Hard cap: 1 referral credit per IP per day (anti-farming) + 10 lifetime referrals per account (anti-Ponzi)"
  - "Monthly cash-out impact dashboard line item in /admin/metrics"
  - "Refund-policy v2 Clause 3.5 already covers Platform Credit terms — no separate legal text needed"

agent_brief:
  context_files:
    - apps/api/src/routes/referrals.ts
    - apps/web/app/refer/page.tsx
    - docs/legal/refund-policy-v2-FINAL.md
  prompt_skeleton: |
    CMO sub-agent. Extend referral MVP (commit a99e9a3) with cash-credit.
    NEW Prisma table 'platform_credits' (id, userId, amount, source enum, expiresAt, redeemedAt nullable, redeemedBookingId nullable).
    Trigger: ReferralClaim row flips status='converted' → INSERT credit row + auto-apply on next checkout via Razorpay order amount reduction.
    Anti-farming guards per success_criteria. Audit log mandatory for credit issuance + redemption.

handoff_notes: |
  2026-06-12: created per founder ask 2026-06-10 — "referral $$ program as LOW priority roadmap item".
  Founder explicit: deprioritize. Ships AFTER Q1 P0/P1 work clears.

tags: [marketing, referral, credits, p2, low-priority]
created_at: 2026-06-12T02:00:00Z
updated_at: 2026-06-12T02:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters (and why it's LOW priority)

Referral programs work for high-LTV consumer brands but the math here is borderline:

- 50 paid referrals/mo × ₹500 avg puja = ₹25k gross
- Less 50 × ₹100 credits issued = ₹5k cash-out cost
- Net ₹20k/mo
- vs. founder time required to monitor abuse, anti-farming, customer support on credit disputes

Founder verdict: build it because it's a flywheel hedge, not because numbers excite. Ships AFTER R-Q1-IT-002 + R-Q1-H-001 + Q1 P0/P1 backlog clears.

# Pre-read

- `apps/api/src/routes/referrals.ts` — referral codes + claims MVP
- `apps/web/app/refer/page.tsx` — share UI
- `docs/legal/refund-policy-v2-FINAL.md` Clause 3.5 — Platform Credit terms (already drafted)

# Founder action required

- Confirm ₹100 credit amount (could be ₹50 or ₹150 — test sensitivity post-MVP)
- Confirm 12-month validity (vs. 6 or never-expire)
- Confirm 10-lifetime referral cap per account
- Decide on launch channel (footer banner / signup flow / /refer page enhancement)

# Cost

- Engineering: 16h
- Initial credit-issuance budget: ₹5k (50 referrals × ₹100)
- Anthropic tokens: 0 (no LLM in flow)
