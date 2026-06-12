---
id: R-Q2-M-011
title: "Referral program — formal launch w/ ₹100 credit per converted referee"
category: marketing
owner_role: cmo
quarter: Q2
month_target: 6
priority: P2
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "referral_conversions"
  current: 0
  target: 200
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM referral_claims WHERE status = 'rewarded'"

revenue_impact:
  amount_inr: 40000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "Prisma: ReferralCode + ReferralClaim tables exist (shipped 2026-05-27)"
  - "Wallet primitive: UserCredit + CreditLedgerEntry tables + WalletService idempotent creditUser() shipped"
  - "API: /api/v1/referrals/me + /claim + /mine routes (shipped 2026-05-27)"
  - "API: /api/v1/referrals/reward route — flips qualifying → rewarded, credits wallet ₹100"
  - "Web: /refer page (shipped 2026-05-27); middleware ref-cookie capture in Tier-2"
  - "Tests: 10/10 wallet service unit tests green"
  - "KPI query: live SELECT against referral_claims WHERE status='rewarded'"
  - "TIER-2 pending: ref-cookie middleware + 6 referrals API tests + 3 web tests + checkout hook wire"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Tier-1 shipped. Discovery: 70% of spec already existed (ReferralCode + ReferralClaim Prisma models from 2026-05-27, /api/v1/referrals/me + /claim + /mine routes, /refer page). Gap was: no wallet primitive for the reward sink.
  Tier-1 deliverables (this cycle):
    - apps/api/prisma/schema.prisma: added UserCredit + CreditLedgerEntry + CreditLedgerReason enum + back-relations on User + rewardLedgerId on ReferralClaim
    - apps/api/src/services/wallet.service.ts: idempotent creditUser({userId, deltaPaise, reason, idempotencyKey}) + getBalance() + verifyInvariant() audit. Storage in paise (₹100 = 10000). Transactional + overdraft-blocked.
    - apps/api/src/services/wallet.service.test.ts: 10/10 cases green covering credit happy path, idempotency reuse, zero-delta reject, non-int reject, short-key reject, overdraft block, balance read, invariant pass + drift detection.
    - apps/api/src/routes/referrals.ts: new POST /reward — flips qualifying → rewarded claim w/ wallet credit ₹100 (configurable via REFERRAL_REWARD_PAISE env). Idempotent via wallet key `referral-reward-${claimId}`. Auth-required, must be the referee.
    - KPI query flipped from TBD to live SQL.
  Tier-2 deferred (task #107 in tracker): apps/web/middleware.ts ref-cookie capture, 6 full referrals API tests (auth 401, code-not-found, dup claim, etc.), 3 web tests, checkout hook to fire /reward on PujaBooking confirmed status, NEXT_PUBLIC_FEATURE_REFERRAL flag. EDGE-RUNTIME ALERT: middleware addition triggers CLAUDE.md sweep — plan ~250-route migration BEFORE creating apps/web/middleware.ts.
  Migration NOT yet applied to production DB — run `pnpm --filter @poojly/api exec prisma migrate dev --name add_user_credit_ledger` in next deploy window.
  Closes (partial): Q-C-20260611T2307-R-Q2-M-011 Tier-1. Status stays in_progress until Tier-2 ships.

  2026-06-12 (Tier-2 partial): API tests + checkout hook shipped.
    - apps/api/src/routes/referrals.test.ts: 8/8 cases green covering GET /me unauth 401, GET /me happy path w/ derived code + stats, POST /claim self-referral 400, POST /claim unknown code 404, POST /claim signed_up 201, POST /claim duplicate idempotent 200, POST /reward happy path w/ wallet credit, POST /reward already-rewarded idempotent.
    - apps/api/src/services/payment.service.ts: added tryRewardReferralForBooking() helper, wired into verifyPayment side-effects on `shouldConfirm` block. Fire-and-forget — referral failure swallowed (hard rule: cannot block booking confirmation). Re-runs on webhook retry safely via wallet idempotency key.
    - All 39 related tests still green (wallet 10 + referrals 8 + payment 21).
    - Total session test count for this item: 18 new (wallet 10 + referrals 8).
  Tier-2 STILL deferred to task #107: apps/web/middleware.ts ref-cookie capture, 3 web component tests (need happy-dom setup), NEXT_PUBLIC_FEATURE_REFERRAL nav-link flag. Middleware blocked on edge-runtime ~250-route sweep planning.
  Closes (further partial): Q-C-20260611T2307-R-Q2-M-011 Tier-2 API + checkout. Status stays in_progress until middleware + web tests ship.

tags: ["growth","referral","viral"]
created_at: 2026-06-09T21:55:19.892Z
updated_at: 2026-06-09T21:55:19.892Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
