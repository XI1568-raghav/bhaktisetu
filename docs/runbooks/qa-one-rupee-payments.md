# QA one-rupee payments

Purpose: let named testers run REAL, live, two-way journeys on production (pay, provider action, video proof, PDF receipt, review, payout, refund) for about Rs 1 per flow, so the whole chain can be tested with tiny money.

Nothing here changes what a normal customer pays. The feature is off until the env var below is set, and it only ever applies to a signed-in account whose email is on the list.

## 1. Turn it on

1. Render dashboard > the API service > Environment > add

   ```
   QA_PAYER_EMAILS=test.devotee@example.com,test.priest@example.com
   ```

   Comma-separated, case-insensitive, spaces ignored. List every account that will PAY (normally the devotee test account; add others only if they also pay, for example a priest buying from the store). Providers who only receive money do not need to be listed.
2. Restart the API so it reads the variable (the code reads it on every request, so a restart is the only step; no code deploy is needed once this change is live).
3. Sign in as a listed account. A yellow pill reads "QA pricing active: fees waived for this tester account" on every page.
4. To turn it off: delete the variable (or empty it) and restart. Prices return to normal immediately.

The list is never sent to the browser. `GET /auth/me` returns only `user.qaPricing: true|false` for the caller.

## 2. What is waived (and only for listed emails)

| Rule | Normal customer | QA payer |
|---|---|---|
| Puja platform fee (`PLATFORM_FEE_INR`) | Rs 51 | Rs 0 |
| Prasad delivery add-on (`PRASAD_DELIVERY_FEE_INR`) | Rs 150 | Rs 0 |
| Donation minimum | Rs 101 | Rs 1 (still whole rupees, max Rs 10,00,000 unchanged) |
| Consultation minimum amount | Rs 50 | Rs 1 |
| Consultation minimum minutes | 5 (max 60) | 1 (max 60) |
| Store delivery fee | Rs 49 under Rs 499 | Rs 0 |

Where it lives: `apps/api/src/lib/qa-payer.ts` (allowlist), `booking.service.ts` `bookingFeesInr` (used by `POST /bookings/create-order` and `POST /bookings/from-offering`), `routes/donations.ts`, `routes/consultation.ts`, `lib/store-pricing.ts` plus `routes/store-orders.ts` and `routes/store.ts` (cart). Web: `apps/web/lib/qa-pricing.ts` (`useQaPricing`), `QaPricingBanner`, the booking wizard, offering checkout, donation form, consultation booking page and the cart.

The server is the authority. If a page shows a total the server will not charge, the order is refused (store and yatra with `price_mismatch`; the puja wizard stops before Razorpay opens with "The amount for this booking changed...").

## 3. Minimum a QA payer pays, per flow

The amount is whatever the SELLER priced the item at, plus nothing. The puja, product, session and astrologer rate must therefore be set to a tiny price by the test provider.

| Flow | Minimum a QA payer pays | How to get there |
|---|---|---|
| Puja booking (temple wizard or priest offering) | the puja price, so Rs 1 | Temple manager sets the offering `priceOverride` (or the priest sets the offering base price) to 1. No platform fee, no prasad fee. NRI view of a Rs 1 puja is also Rs 1 (the 2.5x price rounds up to the domestic price). |
| Prasad add-on | Rs 0 extra | Waived. India-only address rule still applies. |
| Donation (gaushala or temple) | Rs 1 | Pick "Custom amount" or the Rs 1 chip. Receipt DR-... is produced. PAN is not requested below Rs 2,000. |
| Astrology consultation | Rs 1 | Astrologer sets rate to Rs 1 per minute (the portal minimum is Rs 1, maximum Rs 1000); devotee books 1 minute. |
| Wellness session | the session price, so Rs 1 | Instructor sets the session price to 1. The API has no floor on wellness price (0 = free enrol with no payment). |
| Store order | the product price, so Rs 1 | Store owner sets a product price to 1; delivery is waived. |
| Razorpay | Rs 1 (100 paise) is the gateway's own minimum order, as given by the owner; not re-verified here | Nothing below Rs 1 is possible. |

### Cannot reach Rs 1, and why

- Subscriptions: paid plans are Rs 799 and up and show "Opens soon" (not purchasable); free plans are not payments. Unchanged on purpose.
- Yatra packages: fixed catalogue tiers with a server-computed total (`computeYatraTotalInr`), not an arbitrary seller price. Not changed.
- Marriage and home-puja pages: inquiry forms with no payment endpoint. They display an 18% GST estimate line but nothing is charged.
- Weekly payout sweep: still has its Rs 100 floor (`WEEKLY_SETTLE_MIN_INR`). It is a cron with no signed-in user, so it cannot be made per-tester. Use the self-serve payout request instead: `requestPayout` has no floor (it only needs a balance of at least Rs 0.01), and it still needs the provider's KYC and bank details. Test accounts must have them on file.
- Cancellation inside 24 hours: a devotee cannot cancel a confirmed booking inside 24h (business rule 5), so Rs 1 refund tests must book at least 24h ahead (48h+ for the full refund).

## 4. Money maths at Rs 1 (checked, covered by tests)

- Puja split: 80% pandit / 20% platform, in Decimal: Rs 1 gives `priestPayout 0.80`, `platformCommission 0.20`. `Commission.amount` = provider earning (0.80), `Commission.percentage` = platform take rate (0.2000). Invariant unchanged.
- Temple share 5% of the puja price: Rs 0.05, written as a row (the writer skips only when the amount is 0 or less).
- Consultation: platform 0.20, astrologer 0.80. Wellness: instructor 0.80 (`WELLNESS_PLATFORM_COMMISSION` default 0.20). Store: `total x (1 - store commission)`, so 0.80 at a 20% rate. A store owner whose commission is set to 100% would get a 0.00 earning row; that is an existing data case and not reachable with default rates.
- Payout rails stay mutually exclusive: `createPriestPayout` still refuses when a `Commission` owns the booking. Nothing about QA pricing touches it.
- No new zero-amount or negative rows: partial-refund ledger scaling rounds to 2 decimals half-up (for example commission 0.80 retained 25% = 0.20, temple 0.05 retained 25% = 0.01), and full refunds go through the full-reversal path.

## 5. Refunds at Rs 1: what to test, and the 75% finding

The devotee cancellation ladder applies to the puja price (fees are not part of it):

| Cancel | Refund of a Rs 1 puja |
|---|---|
| 48h or more before | 100% = Rs 1.00 = 100 paise |
| 24 to 48h before | 75% = Rs 0.75 = 75 paise |
| inside 24h | not allowed for the devotee |

Findings from reading the code (`cancellation.service.ts`, `refund.service.ts`, `payment.service.ts processRefund`):

- Rounding: the refund is computed in rupees rounded to 2 decimals (`Math.round(x * 100) / 100`) and converted to integer paise (`Math.round(inr * 100)` or `Decimal.mul(100).toFixed(0)`) before the gateway call. 75% of Rs 1 is exactly 75 paise, so there is no rounding error and no fractional paise is ever sent.
- Gateway: both refund rails call Razorpay's refund API with `amount` in paise. The code does not enforce its own minimum refund beyond "greater than 0". I did NOT verify whether Razorpay accepts a 75 paise refund and I am not asserting a Razorpay rule. If the gateway refuses, the refund is not recorded as done: the booking stays as it was, `Payment.metadata.refundFailureReason` and a `REFUND_FAILED` money-audit row are written, and the admin can retry. The admin sees a plain-English message ("The payment gateway rejected this refund. Check the payment in the Razorpay dashboard before retrying."); the gateway's own reason is kept in the API log only (`[refund.service] gateway refund failed ... description`), by design, so account detail never reaches the browser.
- Recommended test plan: **test the full (>=48h) refund at Rs 1; the 75% case may be refused by the gateway.** If the 75% attempt fails, read the real reason in the API log or the Razorpay dashboard, and record it here.
- After a partial refund the payment is `partially_refunded` and the booking is not flipped to `refunded`; the pandit's commission and the temple share are scaled down proportionally (Rs 0.80 becomes 0.20 after a 75% refund, as the ladder retains 25% of what was paid).

Consultation and wellness cancellations refund in full inside their own rules; at Rs 1 that is Rs 1.00.

## 6. Receipts, GST and 80G: what they say today

Checked in `apps/api/src/lib/pdf-invoice.ts` and `pdf-receipt.ts`, and by tests that generate each PDF at Rs 1.

- Booking, consultation, wellness and store receipts (`pdf-invoice.ts`) are headed "DARSHYA RECEIPT" (PDF subject: "Payment receipt - proof of payment only, not a statutory tax document"). There is no GSTIN, no tax line and no HSN code. The footer reads: "Amount shown is the full amount charged. No tax was added or collected on it." and "Proof of payment only - no input tax credit. Retain this receipt for your records." Rs 1 renders as `INR 1.00`.
- Donation receipt (`pdf-receipt.ts`, number `DR-...`): headed "OFFICIAL DONATION RECEIPT". Because `HAS_80G` is false and no donee 80G/PAN is on file, it says "Proof of donation - not a tax exemption certificate" and "This receipt is not valid for a Section 80G deduction...". A Rs 1 receipt is generated normally. Fixed in this change: the amount in words for Rs 1 now reads "One Rupee Only" (it said "One Rupees Only").
- Web copy: `apps/web/lib/company.ts` has `HAS_GST_REGISTRATION_VERIFIED: false`, `gstin: null`; store prices are quoted tax-inclusive with no tax line; the yatra page has no GST row. The marriage and home-puja inquiry pages show an 18% GST estimate on a quote, not a payment.
- NOT changed, as instructed: no GST logic was added.

Recommendation for the owner and CA (not implemented): until a GSTIN exists, keep the receipts as "proof of payment" documents (current behaviour). Once registered, the CA should decide the treatment per supply (puja services, astrology, wellness, goods with HSN rates, platform commission, the Rs 51 platform fee) before any tax line, GSTIN or "tax invoice" heading is introduced. Rs 1 test payments are real revenue in the books: tell the CA they are test transactions (tag them by the QA emails) so they can be excluded or reversed in reporting. 80G stays off until registration; donation receipts will keep saying so.

## 7. Suggested end-to-end checklist (Rs 1 each)

1. Set `QA_PAYER_EMAILS`, restart, sign in as the devotee test account, confirm the banner.
2. Provider test accounts set tiny prices: temple offering Rs 1, astrologer Rs 1/min, wellness session Rs 1, store product Rs 1. Each provider also needs KYC and bank details for the payout step.
3. Pay each flow once; check the Razorpay payment is Rs 1.00 and the booking/consultation/order shows paid.
4. Provider acts (accept, perform, upload video proof, mark complete); devotee downloads the PDF receipt and leaves a review.
5. Provider requests a payout (self-serve); admin processes it.
6. Refund: book a second puja at least 48h ahead, cancel, confirm Rs 1.00 returns. Optionally try the 24-48h case and record whether Razorpay accepts 75 paise.
7. Remove the variable when testing ends.

## 8. Risks and things not verified

- Not verified against live Razorpay: the minimum refund amount, and that 75 paise refunds succeed.
- The mobile app does not know the flag: a listed account will see normal prices there and the server will charge the waived amounts (puja) or refuse a mismatching store total. Test on web.
- The listed tester accounts are real accounts on a real gateway. Anyone who controls a listed email gets reduced fees; keep the list short and remove it after testing.
- Rs 1 payments reach the books and the payout ledger like any other.
