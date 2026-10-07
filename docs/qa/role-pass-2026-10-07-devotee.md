# Role pass 2026-10-07: devotee, NRI, booking, cancellation, admin refund

Local stack only (Postgres 55432 db `darshya_a`, API :4001, web :3001, demo Razorpay values, no third-party keys).
Logged in as `demo-devotee-token` / `demo-admin-token`; in the browser by writing `poojly_session`, `poojly_user` and the `poojly_user` cookie. Production was not touched.

## Flows

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Devotee session, browse | PASS | `/auth/me` 200 (devotee@demo.com). Web at :3001 logged in: /dashboard, /temples, /temples/tirupati-balaji, /pujas, /store, /astrology, /bookings, /donations, /profile all 200, no 5xx and no page errors. Screenshots in the scratchpad `shots-devotee/`. |
| 1b | Temple page "5 offerings, Book button" | PASS (API) / NOTE (web) | `GET /temples/tirumala-tirupati` returns 5 active offerings (Satyanarayan 1501, Lakshmi 901, Ganesh 751, Ram Charit Manas 3501, Navgraha 2101). The web slug redirects (308) to the editorial page `/temples/tirupati-balaji`, which lists 9 editorial pujas, not the 5 DB offerings; the bookable path is `/pujas/book?slug=...` (see 2). |
| 2 | Domestic temple puja booking | PASS | `POST /bookings/create-order` 201, `BS-20261007-IO94D` (matches `BS-YYYYMMDD-XXXXX`), amount 80200 paise = puja 751 + platform fee 51 = 802, INR. `verify-payment` with HMAC(`<order>|<pay>`, "demo") 200, booking `confirmed`, payment `captured`, listed in `/bookings/my`. Commission split 80/20 on the puja price (priest 600.80, platform 150.20), temple share 37.55 pending. Web wizard drove temple, slot, devotee, review (INR 751 + 51 = 802, cancellation copy matches API), payment step created the real order (201). The browser cannot complete payment locally (no Razorpay checkout in the demo build; the page says "payment gateway is not configured, you have NOT been charged" and points to Complete payment): expected locally. |
| 3 | NRI pricing | PASS | `nriPricing:true`, Lakshmi puja 901: puja = 901 x 2.5 = 2252.5 rounded to 2250, + 51 fee = 2301 -> 230100 paise, currency INR; row: price 2301, priest 1800 (80% of 2250), platform 450. Fees not multiplied. Without the flag the same offering is 952 (95200 paise). Wizard shows USD only after the "I live outside India" display mode: 751 -> 1880 + 51 = 1931 INR, "$23", labelled "charged as Rs 1,931". |
| 4 | Cancellation window | PASS | 106 h out: quote "Full refund (48h+)", cancel 200 `requiresRefund:true`. 30 h out: quote 75% (601.50), cancel 200. 23 h and 10 h out: quote `cancellationAllowed:false`, cancel 409 "Cancellation is not allowed within 24 hours of the scheduled puja time.", booking stays `confirmed`. The /bookings Cancel button shows the same message from a window.alert. |
| 5 | Admin refund | PASS | Policy refund (`refundType:"policy"`) on a full-tier booking: 802 refunded, payment `refunded` (cumulative 802), booking `refunded`, Commission `PENDING` -> `REVERSED`, temple payout `pending` -> `reversed`; repeat call is idempotent (`skipped`). 75% tier: refund 601.50, payment `partially_refunded`, booking stays `cancelled`, commission scaled 600.80 -> 150.20 and still PENDING (proportional unwind by design). `refunds/pending` carries `policyQuote`. Devotee token on these routes: 403. |
| 6 | Donation | PASS | Gaushala donation 501: create-order 200 (50100 paise, demo), verify 200, receipt `DR-20261007-2DE4`, status paid. Receipt PDF generated for a donee with no 80G number/PAN reads "Proof of donation - not a tax exemption certificate" and "This receipt is not valid for a Section 80G deduction"; no 80G claim anywhere in the donation page copy. Rs 50 refused 400. Temple donations list is empty locally (no approved temple manager): expected. |
| 7 | Wallet / referral | PASS (UI) / FAIL (API, fixed) | `/refer` shows "Referrals are coming soon ... no referral reward to claim today", no credit UI. `/wallet` 404. API still exposed `POST /referrals/reward`: see BUG-3. |
| 8 | Negative checks | PASS (2 small gaps fixed) | Devotee on `/admin/bookings`, `/admin/users`, `/admin/commissions`, refund approve, PATCH admin user: 403; anonymous 401; web /admin, /admin/refunds, /priest redirect a devotee to /dashboard. Malformed bodies (`{bad`, `{}`, `null`, `[]`, non-UUID ids) on create-order, book, verify-payment, cancel, donations, payments/verify: all 400. Two 5xx/odd statuses found on the admin refund route: BUG-2. |

## Bugs

| ID | Sev | What | Repro | Status |
|---|---|---|---|---|
| BUG-1 | P2 | A refunded booking still shows a Cancel button on /bookings (API would 409), and a fully refunded booking drops out of the Cancelled tab (only visible under All) because the cancelled view filtered `status = cancelled`. | Cancel a paid booking, admin refund it in full, open /bookings: row is `Refunded` with a Cancel button; `GET /bookings/my?view=cancelled` omits it and `counts.cancelled` ignores it. | FIXED: `apps/web/app/bookings/page.tsx` (no Cancel on refunded), `apps/api/src/services/booking.service.ts` (cancelled view = cancelled + refunded). Tests added/updated. |
| BUG-2 | P2 | `POST /admin/bookings/refunds/:id/approve` returned 500 for a non-UUID id (Prisma P2023) and 502 for `{"refundType":"partial"}` with no `amountInr`. Admin-only, no money moved. | Admin: `POST .../refunds/notauuid/approve {}`; `POST .../refunds/<id>/approve {"refundType":"partial"}`. | FIXED: 404 and 400 respectively (also reject route P2023 -> 404). Tests added. |
| BUG-3 | P1 (latent, referral UI hidden) | `POST /referrals/reward` credited the referrer wallet Rs 100 for ANY `bookingId` UUID: it never checked the booking exists, belongs to the referee, or is paid. A second account can claim the first account's code and mint wallet credit for free. Wallet has no spend path yet, so no cash left the building, but the ledger is wrong and it becomes real money the day credit is spendable. | Account B `POST /referrals/claim {code of A}`, then B `POST /referrals/reward {claimId, bookingId:"11111111-1111-4111-8111-111111111111"}` returned 200 `rewarded`, `newBalancePaise:10000`. | FIXED: reward requires a booking owned by the caller with a captured payment, else 409 `booking_not_paid`. Test added. Recommendation: also gate the whole route behind `HAS_REFERRAL_CREDIT` while the programme is off (product call, not done). |
| OBS-1 | P2 | `POST .../refunds/:id/approve` with no `refundType` refunds the FULL amount (API default is `full`); only the web admin page defaults to the policy amount. A booking cancelled in the 75% tier approved with `{}` returned 802, not 601.50. | Cancel at 30 h, approve with `{}`. | Not changed (the invariant "admin refunds default to the policy amount" holds in the UI; flipping the API default is a behaviour change for any other caller). Decide whether the API default should also be `policy`. |
| OBS-2 | P2 | Commission `percentage` is the platform rate over the TOTAL (0.2509 = 1 - 600.80/802), i.e. it includes the Rs 51 fee, while the split is 80/20 of the puja price. Consistent with the documented invariant (amount = provider earning); just not "0.20". | Read `commissions.percentage`. | Documented only. |
| OBS-3 | P2 | In the partial (75%) refund the policy's `cancellationFeeToPriestFraction = 1.0` is not what the ledger does: the provider keeps 25% of their earning (uniform 20/80 on retained revenue, DI-02), not the whole 25% fee. | Compare R booking commission 150.20 with fee 200.50. | Documented only (product/policy decision). |
| OBS-4 | P2 | /bookings tab "Upcoming" excludes `pending_payment` rows (by design) so a devotee with only unpaid holds sees Upcoming 0 while the All tab lists them. | n/a | Documented only. |
| OBS-5 | info | Login throttle works: the 6th demo-login in a short window returned 429 "Try again in 15 minutes". | | n/a |

## Fixes made (all with tests)

- `apps/web/app/bookings/page.tsx` + `apps/web/__tests__/bookings-complete-payment.test.tsx` (new case: refunded row has no Cancel).
- `apps/api/src/services/booking.service.ts` + `booking.service.test.ts` (cancelled view includes refunded; test helper updated).
- `apps/api/src/routes/admin-bookings.ts` + `admin-bookings.refund-policy.test.ts` (400 for partial without amount, 404 for malformed id).
- `apps/api/src/routes/referrals.ts` + `referrals.test.ts` (reward needs the referee's paid booking; new refusal test, two happy-path tests now mock the paid booking).

Tests run (only the touched files): api `admin-bookings.refund-policy` + `admin-bookings` (27), `booking.service` + `bookings` (231), `referrals` (10); web `bookings-complete-payment`, `bookings-status-pill`, `bookings-my-pagination` (21). All green; `tsc --noEmit` clean in apps/api.

## Not tested, and why

- A real card payment, Razorpay checkout and Razorpay refund API (no keys by design; demo signature path only).
- Astrology booking/consultation payment and store checkout: only the pages' rendering (200, no errors) was checked; this pass was scoped to temple puja, donation, cancellation and refund.
- A temple donation (no approved temple manager profile exists locally) and an 80G receipt WITH registration data (no donee has 80G/PAN; the eligible branch is covered by existing unit tests).
- Mobile app.
- Prod-only behaviour (Supabase auth, SMTP, Cloudflare); notification channels are all unconfigured locally.
