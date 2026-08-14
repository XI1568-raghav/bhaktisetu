import { redirect } from 'next/navigation';

/**
 * `/settings/earnings` has no body of its own — it forwards to `/payouts`.
 *
 * P0 (2026-08-11): this route used to render a 496-line design mock as though
 * it were a signed-in provider's real ledger. Every figure was a string literal
 * (MOCK_MONTHLY / MOCK_TRANSACTIONS: "Total Earnings ₹1,44,800", eight
 * transactions with plausible IDs like TXN-20260415-001) — there was no fetch,
 * no useEffect and no API import anywhere in the file — and <AuthGuard> carried
 * no allowedRoles, so devotees saw a pandit's fabricated earnings too. A pandit
 * reconciling his bank statement against it would report a ₹1.44 lakh shortfall
 * that never existed. The rows were not even self-consistent with the 20% take
 * rate (product_sale 390/2598 = 15%, donation 500/5000 = 10%).
 *
 * Under those numbers sat two write-shaped controls that wrote nothing: a
 * "Request Instant Payout" button with no onClick, and a Bank Account panel
 * whose three inputs were uncontrolled `defaultValue`s (someone else's name, a
 * masked account number, an IFSC) behind an "Update Bank Details" button with
 * no handler. A provider could retype his account number, click save, see no
 * error, and every later payout would still reach the old bank — with no record
 * of the attempt to reconcile against.
 *
 * Redirect rather than rewire: `/payouts` is already the real surface (reads
 * GET /payouts/balance + GET /payouts/my, posts POST /payouts/request, gated to
 * provider roles). Rebuilding those calls here would have produced a strictly
 * worse copy — /payouts/balance exposes only available/pending/paid-out, so
 * three of the four summary cards and the whole monthly bar chart had no data
 * source at all — plus a second payout-request button against an endpoint that
 * deliberately has no dedupe. One payout surface, one code path.
 *
 * 307 (`redirect`), not 308: a real earnings page, if one is ever built, must be
 * able to reclaim this path without fighting a permanently cached redirect.
 */
export default function EarningsSettingsRedirect() {
  redirect('/payouts');
}
