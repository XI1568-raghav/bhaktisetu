# Role pass 2026-10-07: astrologer, wellness instructor, store owner, admin

Local stack only (own database `darshya_c`, API on 4003, web on 3003). Nothing touched production.
Demo tokens, demo Razorpay, no third-party keys. Findings below were reproduced against the code on `main` at `7e8551a9`
and, where fixed, re-checked on the live local API after the fix.

## Verdicts

| Flow | Result |
|---|---|
| Astrologer: profile, approval + KYC, devotee books and pays, astrologer completes, earnings held | PASS |
| Astrologer: directory read-only, booking binds to a real `AstrologerProfile`, fixture refused | PASS (the TASKS.md "PENDING 2" note is stale, see below) |
| Wellness: profile, session, devotee books and pays, instructor completes, earnings held then released | PASS, with P1 fixed (unapproved instructor could sell) |
| Store: profile, product, prepaid commission 0.20 / 0.80, COD creates no commission | PASS |
| Store: sample catalogue non-buyable, no DHL, prasad abroad India-only | PASS for catalogue / DHL / prasad; P1 fixed (unapproved store was buyable) and P1 fixed (US address accepted on a store order) |
| Store: "quality gate on edits" | N/A, no such gate exists for store products (see P2-5) |
| Admin: dashboard, approvals, bookings + waiting, refunds, payouts, ops, metrics | PASS with P1 open (revenue omits consultations and wellness) |
| Admin routes reject non-admin with 401/403 | FAIL, P0 found and fixed: the 403 was sent but the handler still ran |
| Admin bad bodies give 400 | PASS, two 500s found and fixed |

## Bugs

### P0-1 (fixed): a denied request still ran the route handler (authorization bypass with side effects)
`requireRole` / `requireAnyRole` / `authenticateUser` (`apps/api/src/middlewares/auth.ts`) reply 403/401 from an async hook but did
not `return reply`. Fastify then ran the route handler while the response was in flight. The client saw 403, the action was applied.

Repro on the local API with the unfixed code (demo tokens, so any logged-in non-admin):
1. `PATCH /api/v1/admin/users/<wellness user id> {"approved":false}` with `demo-devotee-token` -> `403 Forbidden`, but
   `wellness_profiles.approved` flipped to `f` (confirmed by psql; repeated with the `wellness` token).
2. `POST /api/v1/wellness/sessions` with `demo-devotee-token` -> `403`, but a `wellness_sessions` row was created for the devotee.
3. The server log showed `Reply was already sent, did you forget to "return reply"` for the route.
Impact: every `requireRole` / `requireAnyRole` route (all `/admin/*`, all provider portals) ran for any authenticated user. An anonymous
request was not observed to mutate (the first hook's 401 happens early enough), but the same window applies to single-hook routes.
Fix: denials now `return reply`, and `authenticateUser` returns `reply` whenever it did not set `currentUser`.
After the fix (API restarted): the same devotee/wellness calls return 403 and the approval stays `t`, no new session row, no
"already sent" warnings.
Test: `apps/api/src/middlewares/auth.deny-stops-handler.test.ts` over a real socket with the error-localization plugin. Honest caveat:
this test passes on the old code too (I could not reproduce the timing in a minimal Fastify app; the live before/after above is the
real proof). It stays as a contract guard. Recommend someone finds the hook combination in `server.ts` that opens the window and
turns this into a failing-before test.
Severity note: this exists on `main`, so production has had it. Deploy the fix soon; no data access leak was observed (the
response body is the 403), the risk is unauthorised writes.

### P1-1 (fixed): an unapproved wellness instructor's classes were public and payable
`POST /wellness/sessions` has no approval check and `POST /wellness/sessions/:id/enroll` sold the class to a devotee while
`wellness_profiles.approved = false`. The astrologer path refuses unapproved profiles. Fix: enroll answers
`409 This instructor is not yet approved to take bookings.` unless an approved `WellnessProfile` exists. Test added in
`wellness-enroll-capacity.f455.test.ts` (the shared `beforeEach` now stubs an approved profile). Not changed: the public
`GET /wellness/sessions` listing still shows an unapproved instructor's class (it can no longer be bought).

### P1-2 (fixed): an unapproved store's products were on the public shelf and orderable
`PUT /store-admin/profile` says a self-created store "stays unapproved until a human reviews it", yet `GET /store/products(/live)`, the
product-by-handle lookup, search and `POST /store/orders` ignored `approved`. Repro: store created, `approved=f`, product listed
(`buyable:true`), devotee placed order `ORD-20261007-1E68` and paid it. Fix: the live catalogue, handle lookup, search and order lookup
filter on `storeProfile.approved`. Re-verified live: shelf empty and order answers `product_not_found` until the admin approves, then
the product appears. Test: `store.approved-only.test.ts`.

### P1-3 (fixed): store orders were accepted for non-Indian addresses
Support FAQ and `/nri-pujas` say store orders are delivered within India only; `POST /store/orders` accepted and priced a US address
(order `ORD-20261007-EE61`). The web checkout hardcodes India, so only direct API / mobile callers could do it. Fix: the shipping address
schema refuses a country other than India / IN (400 with a plain sentence). Test: `store-orders.india-only.test.ts`.

### P1-4 (open): admin revenue and GMV tiles omit consultations and wellness
After a Rs 300 consultation, a Rs 500 wellness class, a Rs 500 store order and a Rs 1,151 puja, `/admin/dashboard.totalRevenue`
= 1651, `/admin/metrics/{dashboard,investor}` GMV = Rs 500 (store only, the puja came after) and the line breakdown shows only
Puja and Donations. Consultations (raw SQL table, no `Payment` row) and wellness enrollments never write a captured `Payment`, so
Rs 800 of collected money is invisible to the founder's tiles. Same class as AO-04. Not fixed: needs a deliberate decision on the
source (either write `Payment` rows for those rails or add them to the aggregate). `/admin/revenue` also reports
`totalCommissions: 0` and `platformTakeInr: 0` while three PENDING commission rows exist (probably PAID-only by design; label it).

### P2 findings
1. (fixed) `POST /admin/bookings/refunds/<not-a-uuid>/approve|reject` answered 500 (Prisma P2023); now 404. Test in `admin.role-pass-malformed-input.test.ts`.
2. (fixed) `GET /admin/users?search=%00` answered 500; now 400.
3. (open) Earnings release is provider-triggered: an astrologer can `PATCH /consultation/:id/complete` (and an instructor set a session
   `COMPLETED`) at any time, including for a slot weeks away, which releases the held earnings immediately. Consider refusing completion
   before the scheduled time.
4. (open) Store earnings are "available" (`availableInr` 400) the moment the order is paid, before shipping. Store is not in the
   2026-10-05 held-until-proved list, so this matches the stated invariants; flagging it because every other provider role is held.
5. (open) There is no quality gate on store product create/edit (the existing `cause-quality` gate covers gaushala/temple only).
   A product can be created or edited to price 0 and goes live (an existing unit test asserts `price: 0` is valid). If a Rs 0 listing is
   not intended, require `price > 0`.
6. (open) `/store/cart/items` accepts catalogue-fixture ids (`prod_015`) and `/store/cart/checkout` returns a non-persisted
   `pending_payment` order for them. Nobody can pay it (no Razorpay route resolves it), so no money is at risk, but the cart should refuse
   non-buyable items like `POST /store/orders` does.
7. (open) `GET /wellness/instructors` still serves the 8-person fixture with invented ratings and review counts. The web avoids it;
   the API is public.
8. (open) `/shipping` section 3 says "If you want prasad sent to an address outside India, write to support before you add it". The owner
   decision of 2026-10-06 is India only; the sentence invites a request that cannot be honoured.
9. (open) `GET /admin/users?approved=false` ignores the parameter (returns everyone); `PATCH /admin/users/:id` with an unknown field
   answers 200 as a no-op; `POST /admin/ratings/not-a-uuid/hide` answers 200.
10. (open) Seed data: `prisma/seed.ts` creates 3 approved, bookable astrologers (`astro.vedic|tarot|numero@darshya.online`) whose users
    are not real logins. If the seed was ever run on production, a devotee can pay one of them and nobody will answer. I could not check
    production; run `SELECT display_name, approved FROM astrologer_profiles` there and unapprove any seeded row that has no real person.

## Astrologer detail (PENDING item 2 in TASKS.md is stale)
- Create: `PATCH /astrologer-portal/profile` creates the `AstrologerProfile` (approved=false). Not in `/astrology/astrologers` while unapproved.
- Booking an unapproved profile: `404 Astrologer not found`. Booking a fixture slug (`astro_001`): `409 ASTROLOGER_NOT_BOOKABLE`, no
  order, no charge. So a devotee cannot be charged for a fixture astrologer; `consultation.ts` (AW-02) refuses before any money moves.
  The seeded astrologers are real DB profiles (see P2-10).
- After admin approve + KYC verify: devotee `POST /consultation/book` (Rs 300, 15 min at Rs 20), `verify-payment` (HMAC with key `demo`)
  -> `confirmed`; replaying verify did not create a second commission.
- Held: astrologer dashboard `upcomingInr 240`, `/payouts/balance` `availableInr 0, upcomingInr 240`; commission amount 240, percentage 0.20 (80/20).
- A devotee completing it: 403. The astrologer completing it: 200, repeat is idempotent; balance then `availableInr 240, upcomingInr 0`.
- The astrologer sees the booking in dashboard `upcomingSessions` (with a Jitsi URL); `/consultation/mine` for the astrologer is empty
  (it lists the caller's own purchases). There is no astrologer-side "all my consultations" list, only the dashboard's confirmed ones.

## Wellness detail
Profile via `PATCH /wellness-portal/profile`, session via `POST /wellness/sessions`, devotee `enroll` + `enrollments/:id/verify`
-> PAID, commission amount 400 / percentage 0.20, held (`upcomingInr 400`) until the session is `COMPLETED`, then `availableInr 400`
(KYC verified). Bad status enum -> 400.

## Store detail
- Prepaid (`/payments/store-orders/:id/razorpay` then `/verify`; the store-order demo signature is the literal `demo`, not the HMAC):
  commission amount 400.00 / percentage 0.2000 on a Rs 500 order.
- COD: order left unpaid, store owner `PATCH /store/orders/:id/status` CONFIRMED -> SHIPPED -> DELIVERED, zero commission rows;
  dashboard splits `todayOnlineSales 500` / `todayCodSales 1000`. A devotee changing order status: 403.
- Catalogue: `GET /store/products` = 1 live (`buyable:true`) + 24 fixtures (`buyable:false` with a reason); ordering `prod_015` ->
  `400 product_not_orderable`.
- Copy: no DHL/FedEx text in `/shipping` (source or rendered); `/nri-pujas` and `lib/support.ts` say prasad and store orders are India only.
  Prasad API refusal is covered by the existing `bookings.prasad-india-only` tests (not re-run end to end here).

## Admin detail
- GET sweep as admin: dashboard, revenue, reports, pending-approvals, users, temples, priests, pujas, content, payments, commissions,
  ratings, bookings, payouts/pending, payout-requests, refunds/pending, provider-kyc, metrics investor/funnel/dashboard, donations
  export.csv, leads, subscriptions, consultation admin list: all 200. `/admin/ops/*` is cron-token gated (401 with a bearer, by design);
  `money-trail` needs an id filter (400 otherwise).
- Non-admin sweep (devotee, store, astro, wellness, pandit, anonymous) across the same paths: only 401/403 (the 400 on
  `money-trail` was the pre-fix double-send; now 403).
- Approvals queue: approving via `PATCH /admin/users/:id {"approved":true}` flips the matching profile; `pendingApprovals` was 0 once
  all three were approved. `payouts/pending` listed the three providers with 400 / 400 / 240, consistent with their ledgers.
- Bookings: created and paid a puja (Rs 1,151, commission 220 / payout 880); it appeared in `GET /admin/bookings?waiting=1`
  (confirmed, no pandit, total 1). Dashboard `totalRevenue` moved 500 -> 1651.
- Refunds: devotee cancel quote 48h+ -> refund 1151 (tier "Full refund"); after cancel, `refunds/pending` carried
  `policyQuote.refundAmountInr 1151` and `pendingRefundInr 1151` on the dashboard. The refund approve call itself (Razorpay) was
  not executed locally; the policy default is covered by `admin-bookings.refund-policy.test.ts` (passes).
- Bad input: refund approve with `amountInr:"abc"` 400; kyc bad action 400; reject without reason 400; malformed JSON 400;
  see P2-1/2 for the two 500s that are fixed.

## Not tested, and why
- Real Razorpay (order creation, signature, refund execution), email/WhatsApp, Supabase JWTs: no keys locally by design.
- The astrologer AI answer (canned fallback expected, out of scope).
- A full browser pass of the portals: only `/shipping`, `/store`, `/astrology` were fetched from the web dev server; the role
  portals need a browser session (Supabase) and were exercised through their API routes with demo tokens.
- Admin payout-request process and PATCH user block/unblock paths with real money rails; `/admin/ops` token-gated panels.
- Production behaviour (cannot sign in, must not): P0-1 should be confirmed on the deployed API after the fix is released.

## Files changed in this pass
`apps/api/src/middlewares/auth.ts`, `routes/{admin,admin-bookings,store,store-orders,search,wellness-sessions}.ts` plus tests
`auth.deny-stops-handler`, `admin.role-pass-malformed-input`, `store.approved-only`, `store-orders.india-only` and an addition to
`wellness-enroll-capacity.f455`. Verified: `tsc --noEmit` clean in `apps/api`; vitest on middlewares, `routes/admin*`, `auth*`,
`wellness*`, `astrologer*`, `consultation*`, `store*`, `search*` all green (full suite deliberately not run).
