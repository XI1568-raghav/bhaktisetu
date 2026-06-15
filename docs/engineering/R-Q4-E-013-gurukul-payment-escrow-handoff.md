# R-Q4-E-013 — Gurukul payment escrow handoff (3-way guru/student/parent)

**Status:** in_progress (founder/legal handoff — NOT spec'd for engineering build)
**Priority:** P2
**Est:** 24h (post-handoff resolution)
**Created:** 2026-06-15
**Prior PR rejected:** R2 PR #71 — proposed Bhaktisetu holding parent funds directly = unlicensed PA-PG activity under RBI 2020 guidelines.

## Why this is a handoff, not an implementation

The original spec is a 1-line placeholder. Building a 3-way payment escrow for gurukul fees (parent → platform → guru, with dispute hooks) without a fully validated PSP-routes architecture risks:

1. **Unlicensed PA-PG activity** under [RBI Guidelines on Regulation of Payment Aggregators and Payment Gateways (2020)](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11822). Any entity that collects funds from a payer and holds them before settling to the actual merchant requires a PA license (₹15 Cr net worth minimum, RBI approval). Bhaktisetu does NOT hold this license.
2. **Minor consent gaps** under DPDP Act 2023 §9 (children's data) — gurukul students are commonly minors; consent must come from verifiable parent, not the student.
3. **TDS §194-O** compliance on e-commerce operator deductions if Bhaktisetu collects on behalf of gurus.
4. **GST on commission** classification (18% on platform commission, not on the underlying tuition fee).

## Mandatory architecture: Razorpay Routes (split payouts at PSP level)

**Bhaktisetu MUST NEVER custody funds.** Use [Razorpay Routes](https://razorpay.com/docs/payments/route/) so the PSP splits payments at the gateway level. Money flow:

```
Parent (payer)
   │
   │  ₹X tuition + ₹X * commission%
   ▼
Razorpay (PA license holder, NPCI-regulated)
   │
   ├── ₹X * (1 - commission%) → Guru linked-account (settled per Razorpay schedule)
   └── ₹X * commission%        → Bhaktisetu linked-account (platform fee)
```

Bhaktisetu's API ONLY:
- Creates the Razorpay order with `transfers[]` payload specifying split.
- Stores the booking + split metadata for reconciliation.
- Triggers dispute / refund webhooks to Razorpay (which executes against guru's linked account).
- NEVER receives, holds, or batch-disburses parent funds.

## Pre-launch compliance checklist (founder must complete BEFORE engineering builds)

| # | Item | Owner | Notes |
|---|---|---|---|
| 1 | Razorpay Routes account upgrade | Founder | Email partners@razorpay.com — requires existing live Razorpay merchant + KYC |
| 2 | Razorpay sub-merchant onboarding flow for gurus | Founder + Legal | Each guru = Razorpay linked account; needs PAN, bank, Aadhaar, GST (if applicable) |
| 3 | Guru KYC gate (block payout until verified) | Founder + Engineering | Reuse existing `priest.aadhaarVerified` pattern from business rule #4 |
| 4 | Commission % per gurukul (configurable, default 15%) | Founder | Lower than puja (20-40%) due to recurring monthly fee model |
| 5 | DPDP §6 consent flow for Jitsi session recording | Legal | Parent consents on behalf of minor student; recording optional, default OFF |
| 6 | DPDP §9 minor consent — verifiable parent signature | Legal | Razorpay's KYC of payer establishes parent identity; bind to student profile |
| 7 | TDS §194-O deduction (1% on payments to guru if guru's annual gross > ₹5L) | CA + Engineering | Bhaktisetu must deduct before split; complexity → punt to Razorpay TDS Tools if available |
| 8 | GST registration (if commission revenue > ₹20L/yr) | CA | Charge 18% GST on platform commission line item, NOT on tuition |
| 9 | Refund policy — pro-rated for unattended classes, full for non-delivery | Founder + Legal | Trigger refund via Razorpay Refunds API against guru's linked account |
| 10 | Dispute window (parent disputes class quality) — 7 days | Founder + Legal | Manual ops review during pilot; auto-escalate at 14d to human |
| 11 | Cancellation window (parent cancels enrolment) — 30 days notice for monthly, end-of-quarter for quarterly | Founder + Legal | — |
| 12 | Terms of service update + parent signature flow | Legal | Distinct from puja ToS; minor-specific clauses |

## Engineering scope (post-handoff resolution)

Once items 1-12 above are resolved by founder + legal + CA, engineering implements:

1. `apps/api/src/services/razorpay-routes.ts` — wrapper for Razorpay Routes API (`createLinkedAccount`, `createOrderWithTransfers`, `refundWithTransfer`).
2. `apps/api/src/routes/gurukul-payment.ts` — `POST /gurukul/:id/enrol` (creates order with transfer split), `POST /gurukul/enrolment/:id/refund` (admin-gated), `GET /gurukul/enrolment/mine` (parent dashboard).
3. `apps/api/prisma/schema.prisma` — `GurukulEnrolment` model: `studentName`, `studentDob`, `parentUserId`, `guruId`, `gurukulId`, `feeAmount`, `commissionAmount`, `razorpayOrderId`, `razorpayTransferIds[]`, `status` (pending_payment, active, completed, refunded, disputed), `consentToRecord`, `consentSignedAt`.
4. `apps/web/app/gurukul/[id]/enrol/page.tsx` — parent enrolment form (student details, consent checkboxes for §6 + §9, payment).
5. `apps/web/app/profile/gurukul-enrolments/page.tsx` — parent dashboard (active enrolments, class history, refund requests).
6. `apps/web/app/admin/gurukul-disputes/page.tsx` — ops dispute review queue.
7. Tests: TDD for split math, KYC gate, refund pro-rating, consent enforcement.

## Estimated breakdown (post-handoff)

| Phase | Hours |
|---|---|
| Razorpay Routes integration + sub-merchant onboarding | 8 |
| Prisma schema + migration + ensure-schema replay | 2 |
| API routes + tests | 6 |
| Parent enrolment UI + consent flow | 4 |
| Admin dispute queue | 2 |
| End-to-end test (Razorpay test mode) | 2 |
| **Total** | **24** |

## References

- [RBI Guidelines on Payment Aggregators and Payment Gateways (March 17, 2020)](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11822)
- [Razorpay Routes documentation](https://razorpay.com/docs/payments/route/)
- [DPDP Act 2023 — §6 (consent), §9 (minors)](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf)
- [Income Tax §194-O — TDS on e-commerce operators](https://incometaxindia.gov.in/Pages/acts/income-tax-act.aspx)
- Prior rejected PR: R2 PR #71 (proposed direct escrow custody — rejected for unlicensed PA-PG activity)

## Why not ship now

Engineering can scaffold the data model and the Razorpay Routes wrapper independent of founder action, but:

- Cannot ship the **enrolment flow** until Razorpay Routes account is upgraded (item 1).
- Cannot ship the **payout gate** until guru sub-merchant onboarding KYC schema is finalised (items 2-3).
- Cannot ship the **consent flow** until legal review of parent-signature + recording consent text (items 5-6).
- Shipping the data model alone risks divergence from the final Razorpay Routes schema (transfer IDs, settlement IDs, refund correlation).

**Recommendation:** founder completes items 1-3 (Razorpay Routes upgrade + sub-merchant flow design) as the unblock. Engineering then ships the full 24h scope in a single sprint with confidence the architecture is compliant.

## Status flip protocol

- Founder completes items 1-3: spec gets fully populated (replace placeholder body in `013-gurukul-payment-escrow-guru-student-parent-3-way-d.md`), status remains `in_progress`.
- Engineering ships phases 1-7 above: status flips to `shipped`, `shipped_at` populated.
- First successful enrolment processed in production (with real parent paying real guru via Routes split): `verified_at` populated.

---

Authored 2026-06-15 by autonomous orchestrator. Handoff to founder + legal + CA. Do not implement custody-based escrow under any circumstance.
