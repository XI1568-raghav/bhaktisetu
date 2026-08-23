/**
 * /pricing FAQ copy.
 *
 * Extracted from page.tsx so `__tests__/pricing-commission-truth.test.tsx` can
 * assert on the answers directly instead of scraping rendered markup.
 *
 * PM-06b (prod sweep 2026-08-12) — the payout answer published a dated bank
 * SLA on top of a rail that does not exist:
 *
 *   "Payouts are processed every Monday for the previous week's completed
 *    orders. Funds typically reach your bank account within 2-3 business days
 *    after processing."
 *
 * What actually happens today, read off the server:
 *   - Each confirmed payment mints a `Commission` row whose `amount` is the
 *     provider's earning (apps/api/src/lib/commission-math.ts).
 *   - `payout.service` refuses every withdrawal — self-serve AND the weekly
 *     sweep — until an admin has set `provider_kyc.verified` and a bank account
 *     is on file.
 *   - The transfer itself is manual. apps/api/src/routes/admin-bookings.ts:622:
 *     "The actual bank transfer stays owner-gated on RazorpayX/Cashfree."
 *     Neither rail is enabled on the account, so nothing moves money on a
 *     schedule.
 *
 * This is the single most load-bearing promise made to supply, and it is the
 * one most likely to be screenshotted in a complaint. Restore the Monday + T+2
 * wording on the day RazorpayX/Cashfree is live and the settlement cron runs —
 * not before.
 *
 * Same pass, same class of defect: the plan-change answer promised "you'll be
 * charged the prorated difference". A repo-wide search for prorat* finds one
 * unrelated hit in an astrology module; `subscription.service.subscribe()`
 * cancels the current row and creates the new one at full price, immediately,
 * in both directions.
 */

export interface PricingFaq {
 question: string;
 answer: string;
}

/**
 * TC-12 (P2) — the short form of the payout answer below, for supply pages
 * that only have room for a sentence.
 *
 * /list-temple published "Settlements within 7 days." to temple trusts. There
 * is no seven-day settlement: `payout.service` refuses every withdrawal —
 * self-serve AND the weekly sweep — until an admin has set
 * `provider_kyc.verified` with a bank account on file, and the transfer itself
 * is manual (apps/api/src/routes/admin-bookings.ts:622, "The actual bank
 * transfer stays owner-gated on RazorpayX/Cashfree"). Neither rail is enabled.
 *
 * Exported so the supply pages and the /pricing FAQ cannot publish two
 * different settlement promises. Restore a dated SLA in BOTH places on the day
 * the rail is live and the settlement cron runs — not before.
 */
export const PAYOUT_TIMING_SHORT =
 'Your share is credited to your earnings balance as soon as the payment is confirmed. ' +
 'Withdrawals are released by hand once we verify your KYC and bank details — automated ' +
 'bank transfers are not live yet, so we do not print a settlement date we cannot hold to.';

export const PRICING_FAQS: PricingFaq[] = [
 {
 question: "How does billing work?",
 answer:
 "Subscription fees are billed monthly to your linked payment method. Commission is deducted automatically from each transaction before payout. You can view a full breakdown in your earnings dashboard.",
 },
 {
 // PM-09 (prod sweep 2026-08-12): a grep for GST across /pricing,
 // lib/pricing.ts and the booking page returned nothing at all, so a
 // provider had no way to know whether tax would be added on top of the
 // price shown. It is not: subscription.service.ts writes
 // `amount: plan.price` and createRazorpaySubscription bills that same
 // figure, and apps/api/src/lib/store-pricing.ts computes
 // `subtotal + delivery` with no tax line ("NO TAX LINE … quote
 // tax-inclusive prices until a GSTIN and per-HSN rates exist").
 //
 // Still open and owner-gated, deliberately not answered here: whether
 // the platform is an aggregator collecting commission or the supplier of
 // the service, and TDS on provider payouts (194-O 0.1% vs 194J 10%).
 // Both are a CA's call and both change this answer.
 question: "Is GST added to these prices?",
 answer:
 "No. The amount you see is the amount charged — nothing is added at checkout, and no commission is grossed up for tax. Darshya is not GST-registered yet, so no GST is collected and nothing we issue today is a GST tax invoice. When registration happens we will show tax as its own line before you pay rather than adding it to a price you already agreed to, and we will say so here first.",
 },
 {
 question: "When do I get paid?",
 answer:
 "Your share of every completed order is credited to your Darshya earnings balance as soon as the payment is confirmed, so you can see what you have earned straight away. Withdrawing it needs two things: our team has to verify your KYC and bank details, and you raise a payout request from your earnings dashboard. We release approved payouts by hand today — automated weekly bank transfers are not live yet, so we will not print a settlement date we cannot hold to. Your onboarding contact confirms the current turnaround with you before you take your first booking.",
 },
 {
 question: "Can I change plans anytime?",
 answer:
 "Yes. You can switch plan at any time from your subscription settings. A change takes effect immediately and the new plan is charged in full from that moment — there is no part-month credit for the plan you are leaving, so it is usually cheapest to switch close to your renewal date.",
 },
 {
 question: "Is there a lock-in period?",
 answer:
 "No. All plans are month-to-month with no long-term commitment. Cancel anytime from your settings page — cancelling stops the next renewal rather than charging you an exit fee.",
 },
 {
 question: "What payment methods do you accept?",
 answer:
 "We accept UPI, credit/debit cards, net banking, and wallets via Razorpay. International cards are accepted too — billing is in INR.",
 },
 {
 // PM-02b: the old answer said premium devotee features "may be introduced
 // in the future". They exist and are billed today — the paid add-ons are
 // listed above, at the price the gateway charges.
 question: "Do devotees need to pay?",
 answer:
 "No. Browsing temples, watching live darshan, reading content, and checking your daily horoscope is free, and stays free. A few optional add-ons are paid — they are listed in the devotee section above with their exact price; nothing is charged unless you buy one.",
 },
];
