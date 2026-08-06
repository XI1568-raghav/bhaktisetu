# Provider Payouts — Cross-Cutting Phase 2 Plan

**Scope:** Unified provider payout system across ALL roles
**Date:** 2026-08-06
**Status:** Phase 1 shipped (PR #233, live on prod) · Phase 2 (money rails) planned
**Research basis:** 4-agent scan (2 codebase + 2 market: Razorpay Route/X Payouts, Cashfree, UC/AstroTalk payout economics, TDS rules).

---

## 1. The problem (why this was the #1 cross-cutting gap)

Only **priests** had a payout path (`PriestPayout`). Every other role — astrologer, wellness instructor, store owner, temple manager, gaushala — accumulated `Commission` rows that sat **PENDING forever with no way to be paid**. The admin "pending payouts" view even **double-counted** the cut (showed 21% of gross as an astrologer's payout). `markPayoutPaid` was wired to nothing.

**This is the single highest-leverage cross-cutting fix** — providers on 4 of 7 roles literally couldn't get paid end-to-end. Supply dies if you can't pay people.

---

## 2. What the research said (payout rails + economics)

- **Rails:** RazorpayX Payouts (IMPS ₹5L / UPI ₹1L instant 24x7, ~₹5+18% GST/payout, `X-Payout-Idempotency` header); **Cashfree Payouts** is the price/perf leader (₹2 UPI, T+1, 1000+/batch). Common pattern: Razorpay collections + Cashfree payouts.
- **Cadence:** goods e-comm settles weekly T+7 (Amazon/Flipkart/Meesho); **gig/services is faster** — UC pays partners Mon/Wed/Fri with 100% same-day guarantee. **Weekly minimum; T+1 or better wins supply in 2026.**
- **Tax:** Sec 194-O e-comm TDS dropped to **0.1%** (Oct 2024); Sec 194J **10%** applies when paying professionals directly (AstroTalk deducts 10% on astrologer payouts). **CA decision** — 194-O 0.1% vs 194J 10%.
- **Pre-payout KYC gate:** PAN mandatory (20% TDS without it) + penny-drop bank verification (~₹1-3/check) before first payout.
- **Transparency playbook (UC):** guaranteed payout day + line-item earnings ledger + status tracking + auto-retry → **cut payout-anxiety support contacts 40%.**

---

## 3. Shipped in Phase 1 (PR #233, live)

**Design:** a single `PayoutRequest` lifecycle over the `Commission` ledger. `Commission.amount` IS the provider's net share (80%) for every role.

| Piece | Detail |
|---|---|
| **Schema** | `PayoutRequest` model + `ProviderRole`/`PayoutRequestStatus` enums + `Commission.payoutRequestId` link (additive migration `20260806000000_provider_payout_requests`, applied + verified on prod) |
| **payout.service.ts** | `getPayoutBalance` (available/pending/paid), `requestPayout` (KYC-gated, atomic create+link), `processPayout` (complete→mark PAID + reference; reject/fail→release to PENDING so balance isn't lost) |
| **Provider routes** | `GET /payouts/balance`, `POST /payouts/request`, `GET /payouts/my` (all roles) |
| **Admin routes** | `GET /admin/bookings/payout-requests`, `POST .../payout-requests/:id/process` |
| **Web** | `/payouts` page — balance cards, KYC-gated request button, payout history |
| **Tests** | 10 payout.service unit tests + live E2E (endpoints 401-live, /payouts page 200). Full API suite 813 green. |

**Verified live:** migration applied to prod DB (table + column + enum confirmed), endpoints return 401 (auth-gated, not 404), `/payouts` page 200.

---

## 4. Phase 2 (money rails — planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **RazorpayX / Cashfree Payouts integration** — admin "process" triggers a real transfer (contact → fund account → payout) with idempotency key `provider_id + period`, auto-retry, reversal handling | ₹2-6/txn, instant 24x7 via IMPS/UPI |
| P1 | **Weekly settlement cron** (guaranteed payout day, e.g. every Tuesday) — auto-create PayoutRequests for all providers above threshold | UC Mon/Wed/Fri same-day guarantee; weekly T+7 floor |
| P2 | **Penny-drop bank verification** before first payout (Cashfree Account Verification ~₹3/check) + PAN mandatory | de-facto required to avoid wrong-account refunds |
| P2 | **TDS handling** — CA decides 194-O 0.1% vs 194J 10%; deduct on payout, issue Form 16A quarterly | AstroTalk deducts 10%; normalized in the supply market |
| P2 | **Itemized settlement report** (gross → commission → TDS → net, per-service line items) + payout status tracking in provider app | UC transparency playbook (-40% support contacts) |
| P3 | **Multi-rail payout choice** (UPI / bank) + on-demand instant payout option | Preply self-serve = supply gold standard |

---

## 5. Success metrics

- **All 6 provider roles can withdraw end-to-end** (was: only priest)
- **Payout cadence**: weekly guaranteed day, T+1 aspiration
- **Zero double-count**: Commission.amount = provider's exact net share
- **Supply trust**: payout-anxiety support contacts ↓ (UC anchor -40%)

---

*This closes the biggest cross-cutting gap. Next cross-cutting items from the consolidated report: temple revenue share, real-astrologer directory, store catalog unification, recurring subscriptions, panchang-push revival.*
