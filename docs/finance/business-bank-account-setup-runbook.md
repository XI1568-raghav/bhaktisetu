# Business Bank Account Setup + Book-keeping Runbook

> **Roadmap item**: R-Q1-F-002 (P1) · **Authored**: 2026-06-13 · **Time**: ~3 hr + 7-10 day bank-side processing

> **Correction 2026-09-02 (`OPS-10`).** This runbook named a second settlement rail throughout: "Razorpay/Stripe settlement-compatible (proven flow)", a step 5 "Stripe settlement bank update (via Stripe dashboard, ~5-7 days)", a "Razorpay/Stripe fee" ledger column, a "Match Razorpay/Stripe payouts" reconciliation step and a founder task to "switch Razorpay/Stripe settlement bank". **Stripe was removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`, `apps/api/src/services/payment.service.ts:2438-2450`). Razorpay is the only live rail and it settles INR only; no replacement international processor has been chosen, so there is no second dashboard to log into and no second processor fee to book. The second rail has been removed from the steps and the ledger rather than guessed at. Re-add a settlement lane here once the owner names an NRI rail.

## Goal

Separate Bhaktisetu Foundation operating account + accounting spreadsheet for clean monthly reconciliation.

## Bank account setup

### Recommended bank: ICICI / HDFC / Axis

Reasons:
- Razorpay settlement-compatible (proven flow)
- Net-banking + UPI integration
- Free-tier Foundation accounts (Section 8 entities)

### Required documents

- Foundation CIN (Companies Act 2013)
- 80G certificate copy
- Memorandum of Association
- Articles of Association
- Board resolution authorizing account opening
- KYC docs of 2 signatories (founder + Foundation board chair)
- Office address proof
- Initial deposit ₹10K

### Steps

1. Founder visits bank branch w/ docs (1 day)
2. Account opening processed (3-5 days)
3. Net-banking + UPI activation (2-3 days)
4. Razorpay settlement bank update (via Razorpay dashboard, ~3 days)
5. _Removed 2026-09-02. This step read "Stripe settlement bank update (via Stripe dashboard, ~5-7 days)". Stripe is gone and no replacement international processor has been chosen, so there is no second dashboard to update._ `[verify — Stripe was removed; the NRI rail is undecided]`

## Book-keeping spreadsheet structure

Google Sheets at `docs/finance/foundation-books-FY26-27.gsheet` (private):

### Sheet 1: Cash flow
| Date | Description | Category | Inflow | Outflow | Balance |
|---|---|---|---|---|---|

### Sheet 2: Revenue per lane
| Date | Lane | Booking ID / Subscription ID | Gross | Platform fee | Pandit/Temple share | Razorpay fee | Net to Foundation |
|---|---|---|---|---|---|---|---|

### Sheet 3: Expenses
| Date | Vendor | Category | Amount | Invoice # | Status (paid/pending) |
|---|---|---|---|---|---|

### Sheet 4: Donor list (for Form 10BD)
| FY | Date | Donor name | PAN | Amount | 80G receipt # |
|---|---|---|---|---|---|

## Monthly reconciliation (founder + CA)

Last Friday of each month:
- Match bank statement vs cash flow sheet
- Match Razorpay payouts vs DB records
- Identify discrepancies → flag for resolution
- File monthly summary → CA reviews

## Founder action

- [ ] Pick bank (ICICI vs HDFC vs Axis)
- [ ] Schedule branch visit
- [ ] Open Google Sheets template
- [ ] After account active: switch the **Razorpay** settlement bank to the new Foundation account (Razorpay only — no second processor account exists to switch) `[verify — Stripe was removed; the NRI rail is undecided]`
- [ ] Schedule monthly reconciliation calendar reminder

## Closes

R-Q1-F-002 — runbook shipped.
