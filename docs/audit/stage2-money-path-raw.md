# Stage 2 — Money path: raw agent output (preserved)

> Verbatim output of the Phase-1.2 money-path workflow (run `wf_431c5077-02d`, 2026-08-10).
> `AUDIT.md` §12 carries the triaged summary; this file exists so no agent work is lost.

## ⚠️ READ THIS BEFORE USING THIS FILE

All **4 finder agents completed successfully** — the candidate list is complete.
The **adversarial verify phase did not**: it was cut off by an account session limit, and
**29 of 45 verifiers died mid-run**.

The workflow's own output labelled those 29 as `REFUTED`, which is **wrong** — that label came from a
fallback in the script, not from any analysis. They were never checked. They are re-classified below as
**UNVERIFIED**, and several are among the most financially severe candidates in the whole audit
(commission credited to the wrong party, Aadhaar payout gate bypassed, cancel keeping the customer's money).

| Bucket | Count | Meaning |
|---|---|---|
| CONFIRMED | 14 | independently re-checked at file:line by a second agent |
| Genuinely REFUTED | 2 | a verifier read the code and disproved the claim — **do not refile** |
| **UNVERIFIED** | 29 | **verifier died; claim neither proven nor disproven — MUST be re-verified before acting** |

---

## Finder summaries (complete — these did not fail)

### booking-ui

SCOPE: apps/web booking funnel — /pujas (list), /pujas/[slug] (detail), /pujas/[slug]/book (redirect shim), /pujas/book (the 2,233-line wizard), success screen, /bookings (list), /bookings/view (detail). 14 defects found, 4 of them on the money path.

VERDICT ON THE FOUR UNRESOLVED CRITICALS (UI layer only; server-side belongs to the API auditor):
(a) PAST DATE — FIXED at the UI. The wizard passes min=getTomorrow() / max=getMaxDate() to DateInput (pujas/book/page.tsx:1342-1349) and DateInput enforces isInRange on ALL four entry paths: typing (DateInput.tsx:129), blur (:141), calendar click (:151), the "Today" shortcut (:318), plus disabled grid cells (:272). A past date cannot be produced client-side. RESIDUAL DEFECT: getTomorrow()/getMaxDate() use toISOString() (UTC) — reported as finding #8.
(b) SLOT COLLISION / DOUBLE-BOOKING — UNVERIFIED from the UI. The wizard renders server-supplied remaining/total from GET /bookings/slots and hard-disables slots with remaining===0 (pujas/book/page.tsx:1432-1441). That is honest display, not a guard; collision prevention can only live server-side.
(c) CONFIRMATION EMAILS — UNVERIFIED from the UI (no email code in apps/web). Note the success screen affirmatively promises "A notification will be sent to your registered phone number" (pujas/book/page.tsx:1146-1148) while TASKS.md records booking-notify as a no-op until Meta approves the 11 WhatsApp templates.
(d) REFUND LADDER — REAL as a UI defect. The API DOES implement the ladder (apps/api/src/services/cancellation.service.ts:46-57, 100/75/50/25%), but the web refund/cancel UI discloses none of it and instead promises a full return. Finding #4.
DEAD "View Details" LINK — REAL, confirmed. Finding #2.
MUHURAT WIRING — previously reported NOT wired; now FIXED. PUJA_TYPE_BY_SLUG map (pujas/book/page.tsx:80-88) + GET /panchang/puja-muhurat?days=60 fetch (:551-575) + green shubh markers, disabled avoid-days and window chips in the picker (:577-591, 1342-1383). Verified no rewrite/redirect exists in apps/web/next.config.ts or middleware.ts that would rescue any of the dead links.

HEALTHY — verified, do not re-audit:
- handlePayment (INR/Razorpay) is genuinely hardened: synchronous creatingOrderRef in-flight guard (:671-672) that survives modal dismiss (:811-819), no synthetic orderId fallback, explicit failure surfacing on network error / non-2xx / malformed body (:722-738), Razorpay load failure (:745-750), payment.failed handler (:825-832), and — the important one — a server-side verify-payment gate that does NOT show success on a verification failure and hands the user their razorpay_payment_id for reconciliation (:789-797).
- PBO-7 held: the BOOKING page no longer substitutes mock catalog/slot data — getFallbackPuja is dead code and both fetches have honest error + retry states (:463-477, :523-545, :1038-1060, :1399-1410).
- PBO-9 held: the demo-payment button is gated at BOTH the render (:2185) and the handler (:1005) on NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS.
- Client fee constants match the server exactly (PLATFORM_FEE 51 / PRASAD_DELIVERY_FEE 150 at pujas/book/page.tsx:141-142 vs apps/api/src/services/booking.service.ts:39-40), so today's displayed total equals the charged total.
- Base price is read from the server catalog (selectedTemple.priceOverride || puja.basePrice, :496-499) — not invented client-side. NRI USD price comes straight from PujaType.nriPrice (:511-514), no client multiplier.
- Step validation is sound and the stepper is non-interactive (:1213-1262), so steps cannot be skipped; terms/refund links resolve (:2005-2011); pincode /^\d{6}$/ and phone /^[6-9]\d{9}$/ are correctly validated (:619-623).
- /bookings list uses React Query with a real error banner and a real empty state, and its Cancel button surfaces both non-ok and network failures via alert (bookings/page.tsx:167-172, 247-251, 292-305).
- safeCapture wraps every PostHog call so analytics can never break checkout (:49-60).

🌱 graft saved ~387,425 tokens this turn.

---

### booking-api

SCOPE COVERED: apps/api booking creation, slot/availability, dispatch engine, cancel/reschedule/refund plumbing. All paths read at file:line; nothing was mutated.

ENDPOINT MAP (all in E:\NewClaude\bhaktisetu\apps\api\src\routes\bookings.ts, `bookingRoutes` L109-L1384, mounted under /api/v1/bookings):
- POST /book (authenticateUser) -> bookingService.createBooking
- POST /create-order (auth) -> createBooking + paymentService.createRazorpayOrder
- POST /create-stripe-order (auth) -> createBooking + createStripeOrder (NRI/USD)
- POST /from-offering (auth) -> writes PujaBooking DIRECTLY (does not use booking.service)
- POST /verify-payment (auth), POST /:id/cancel, /:id/reschedule, /:id/request-refund, /:id/review (auth)
- PATCH /:id (auth + owner/assigned-priest/admin gate L283-L301), GET /:id, /my, /:id/video, /:id/cancel-quote (auth)
- GET /availability and GET /slots are PUBLIC (no auth) — intentional, read-only, no PII leaked.

FOUR 2026-05-01 CRITICALS — verdicts:
(a) PAST DATE = **FIXED**. Guarded in four places: route Zod `.refine()` bookings.ts:19-27, /create-order schema bookings.ts:704-712, /from-offering schema bookings.ts:960-968, and a service-layer re-check booking.service.ts:134-139. GET /availability also rejects past dates (bookings.ts:197-203). Note: only the DATE is checked, not date+slot, so a same-day booking for an already-elapsed slot is still accepted — low impact, not filed.
(b) DOUBLE-BOOKING = **PARTIALLY REAL**. Two of three priestId-write paths are guarded (priest.service.ts:259-273 and dispatch.service.ts:233-245, the latter inside a $transaction). The third — POST /from-offering, bookings.ts:1191 — has NO guard at all. Filed as P0.
(c) CONFIRMATION EMAIL = **FIXED/WIRED**. payment.service.ts:19-55 `sendPujaBookingInvoice` is called from `fireAndForgetPostConfirmSideEffects` (payment.service.ts:254-289) on payment confirm; lib/email.ts:33-36 no-ops gracefully when RESEND_API_KEY is unset. It is an invoice+PDF rather than a warm "confirmation", but mail does leave the box. Not re-filed.
(d) REFUND LADDER = **REAL, UNRESOLVED**. Filed as P0.

VERIFIED HEALTHY (do not re-audit):
- Server-authoritative pricing: /create-order and /create-stripe-order re-derive templeId/pujaTypeId from the offering and never trust client price (bookings.ts:751-770). PR #178 IDOR fix holds: PATCH /:id enforces owner/priest/admin and admin-only priest reassign (bookings.ts:283-301), and updateBookingStatus strips a financial/identity denylist (booking.service.ts:333-343). The discriminated-union `data` allowlist (bookings.ts:63-78) is intact.
- Offering validation in createBooking is thorough: existence, isActive, temple/pujaType cross-check, slot must be in availableSlots (booking.service.ts:142-169), prasad address ownership check (booking.service.ts:254-265).
- State machine VALID_TRANSITIONS (booking.service.ts:91-101) is a real allowlist and rejects illegal jumps with 409.
- getUserBookings IS paginated with a route-level cap of 100 (bookings.ts:160, booking.service.ts:706-757); GET /slots and checkSlotAvailability use groupBy, not N+1 (bookings.ts:644-652, booking.service.ts:913-921).
- Reschedule DOES have a past-date guard (booking.service.ts:584-588) and a status allowlist.
- Dispatch accept is genuinely transactional with sibling-offer supersede (dispatch.service.ts:213-259).
- /from-offering correctly enforces priest verified+active and a VERIFIED temple binding (bookings.ts:1023, 1043-1061) — the temple-verification rule is honoured on this path but not on the main path.

TOOLING: graft MCP saved ~217,700 tokens this turn vs full-file reads. Graph is STALE (20 changed files incl. payments/consultation/panchang) — findings above were confirmed against on-disk source via Read/Grep, not graph summaries.

---

### payment-commission

SCOPE: apps/api/src/services/payment.service.ts + the commission/ledger/payout path. Traced create-order -> verify -> confirm -> side effects across all three confirm paths (client verify, Razorpay webhook, Stripe webhook).

VERIFIED HEALTHY — do not re-audit:
1. RAZORPAY SIGNATURE VERIFICATION is correct and timing-safe everywhere. verifyPayment: payment.service.ts:541-550 HMAC-SHA256 over `${razorpayOrderId}|${razorpayPaymentId}` with `expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)`. Store order: :736-744. Webhook raw: :871-884. Store-order verify additionally hard-fails on an empty RAZORPAY_KEY_SECRET (:732-735) so a blank key cannot yield a publicly-computable HMAC.
2. WEBHOOK FAILS CLOSED (PR #242) — CONFIRMED STILL HOLDS. handleWebhook payment.service.ts:834-839 and handleWebhookRaw :865-870 both `throw new Error('Webhook signature verification failed.')` when RAZORPAY_WEBHOOK_SECRET is unset, which the route maps to 400 (never a 200 swallow). Covered by payment-webhook-guard.test.ts. Raw-body HMAC is now the DEFAULT, not opt-in (payments.ts:225 `RAZORPAY_VERIFY_RAW !== 'false'`) — note the stale comment at payments.ts:198-206 still describes raw as opt-in, contradicting :220-224; doc-only, no code defect.
3. NO CLIENT AMOUNT TAMPERING on any path. Price is fully server-derived: booking.service.ts:198-199 (`offering.priceOverride ?? offering.pujaType.basePrice`, nriPrice for NRI), fees from server constants :222-226; createRazorpayOrder derives paise from booking.priceAmount (:489); store order from order.totalAmountInr (:669). booking.service.ts:333-343 FORBIDDEN_DATA_KEYS denylist blocks priceAmount/platformCommission/priestPayout/priestId from any status PATCH.
4. IDEMPOTENCY IS SOLID on confirm. Three layers: route-level replay dedupe (payments.ts:235-249, x-razorpay-event-id or sha256(rawBody) via checkAndRecord), the `shouldConfirm` status guard (:585, :914-915, :1387-1388), and the findFirst guard inside writePujaCommissionOnConfirm (:215-219). A webhook replay or double-submit cannot double-confirm a booking, double-write a Commission row, or double-count revenue.
5. COMMISSION IS INSIDE THE TRANSACTION — the prior audit's "written after tx with errors swallowed" IS genuinely fixed in payment.service.ts: all three confirm paths wrap payment.update + booking.update + writePujaCommissionOnConfirm(tx) in one `prisma.$transaction` (:586-604, :921-938, :1392-1411). (The duplicate writer in booking.service.ts was NOT fixed — see finding 6.)
6. IDOR guard on verifyPayment :575-580 (caller-ownership, ADMIN bypass) and store verify :776-778.
7. Demo payment proxy hard-fails at boot in production (:362-369); demo-pay route gated on NODE_ENV/ENABLE_DEMO_PAY (demo-pay.ts:34-37) + per-user rate limit.
8. processPayout (payout.service.ts:166-202) is atomic and idempotent on completed; reject/fail correctly unlinks commissions back to PENDING so balance is not lost.
9. Business rule 4 IS enforced on the LEGACY priest payout path — payment.service.ts:1149-1153 blocks on `!priestKyc.aadhaarVerified` (but the new #233 path bypasses it — see finding 5).

ANSWERS TO SCOPE QUESTIONS: (2) amount is server-side, no tampering. (3) no double-credit possible. (4) 20/80 split is computed correctly at booking creation but the LEDGER stores the wrong side of it (finding 1); commission IS in-tx on the payment path. (5) Aadhaar gate present on legacy path, absent on the live unified path. (6) temple share is NOT double-deducted because it is never written at all on the paid path (finding 3). (7) multiple float-money sites (finding 7).

OUT OF SCOPE but observed incidentally: a slot-collision guard DOES exist at offering level (booking.service.ts:171-186, `existingCount >= offering.maxBookingsPerSlot`); it is not priest-scoped, so audit item (b) priest double-booking may still be real — left to the booking-path agent, not asserted here. Items (a) past date and (c) confirmation emails were not examined.

---

### refund-notify

SCOPE: cancellation, refunds, booking notifications (apps/api/src/services/{cancellation,refund,booking-notify,payment,payout,booking}.service.ts, routes/{bookings,admin-bookings,payments}.ts, lib/{email,whatsapp}.ts, apps/web/app/bookings/view/page.tsx).

VERDICTS ON THE ASSIGNED CRITICALS:
(d) "refunds always issued at full amount" = REAL, UNFIXED. The 100/75/50/25/0 ladder exists and is correct (cancellation.service.ts:46-57, 94-116) but is invoked from exactly ONE place — GET /bookings/:id/cancel-quote (routes/bookings.ts:577), a read-only preview that the web app never calls (repo-wide grep for "cancel-quote" hits only routes/bookings.ts:565,569). All three code paths that move real money hardcode a full refund: refund.service.ts:328 (`refundType: 'full'`, the cron), payment.service.ts:1065 (`Math.round(Number(payment.amount) * 100)`), admin-bookings.ts:291 (`refundType: parsed.data.refundType ?? 'full'`). The ladder is decorative.
(c) "confirmation emails never sent" = REAL for email specifically. `bookingConfirmationEmail` (lib/email.ts:94) has ZERO importers repo-wide. The confirm path (payment.service.ts:254-289) sends only a tax-invoice PDF email (subject "Darshya tax invoice — BS-…", never says "confirmed"), a web push, and a WhatsApp template. See finding.

WHAT IS HEALTHY — do not re-audit:
• 24h cancellation cutoff (business rule 5) IS enforced server-side in all three places: cancelBooking (booking.service.ts:505-509 `if (hoursUntilPuja < 24) throw`), POST /request-refund (routes/bookings.ts:494-503, correctly composes scheduledDate + scheduledTimeSlot before subtracting 24h), and rescheduleBooking (booking.service.ts:578-582). Route maps these to 409 (bookings.ts:387-392, 432-438). Side effect: the ladder's sub-24h tiers (50%, 25%) are unreachable through any devotee endpoint — dead tiers, not a bug.
• Refunds ARE really executed against Razorpay, not just recorded as intent: refund.service.ts:78-91 POSTs to https://api.razorpay.com/v1/payments/{id}/refund. Payment + PujaBooking updates are wrapped in one $transaction (refund.service.ts:236-256), the operation is idempotent (144-172), gateway failures persist `refundFailureReason` into Payment.metadata for admin retry (193-207), and processAutoRefunds skips cleanly when Razorpay env is unset (302-304).
• A refund-success email IS sent (refund.service.ts:259-274), env-gated on RESEND_API_KEY.
• cancellationService.panditCancel (cancellation.service.ts:157-192) correctly validates priest ownership + status, re-queues via offerExpiresAt, and never lets notify failure break the flow.
• Payment.service boots-fails in production if RAZORPAY_KEY_ID is the demo placeholder (payment.service.ts:369-378), so the demo Proxy refund stub (385, `rfnd_demo_*`) cannot silently fake refunds in prod.
• Policy snapshotting works: snapshotPolicy is called on every confirm (payment.service.ts:269), getPolicy falls back to DEFAULT for legacy rows (cancellation.service.ts:80-87).
• Cron delivery mechanism noted, not a defect: Render free tier has no cron, so runDailyOps (which calls tickAutoRefunds) is exposed as POST /api/v1/admin/jobs/daily-ops for an external scheduler (master-cron.ts:29-35). If that external scheduler is not configured, the auto-refund path never runs at all — UNVERIFIED from code, needs an ops check.

NOT VERIFIABLE FROM CODE (flagged, not asserted): whether RESEND_API_KEY / WHATSAPP_* are actually populated on the Render API service, and whether cron-job.org is actually hitting daily-ops.

NOTE: graft's graph is STALE for this area (graft_check_freshness reports payment.service.ts, payout.service.ts, routes/payments.ts changed; cancellation.service.ts + refund.service.ts have no indexed definitions), so all findings below come from direct reads, not the graph.

---

## A. CONFIRMED findings (14)

Independently verified at file:line. Safe to triage.

### S2C-01 — NRI/USD checkout dead-ends: booking row is created but no Stripe payment can ever be taken on the puja booking page

- **Severity:** P0 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:906`
- **Finder:** booking-ui · **Issue:** #NRI pricing 9-10x is business rule #2; this breaks the entire rule-2 revenue line on the primary booking page. Fix = mount StripeClientSecretCheckout exactly as apps/web/app/checkout/offering/page.tsx:419-424 already does.

**Root cause.** handleStripePayment branches on `data.demo || !data.clientSecret` FIRST (fake success), then on `data.checkoutUrl` (redirect). But POST /bookings/create-stripe-order never returns a checkoutUrl — its two 201 responses return only {orderId, bookingNumber, stripePaymentIntentId, clientSecret, amount, currency, stripePublishableKey, demo} (apps/api/src/routes/bookings.ts:912-922 and :1227-1236). Unlike the offering checkout, which mounts <StripeClientSecretCheckout clientSecret={...}> for exactly this case (apps/web/app/checkout/offering/page.tsx:419-424, 682-686), the puja booking page never imports Stripe Elements at all. So with a real STRIPE_SECRET_KEY set, demo=false and clientSecret is non-null: both branches are skipped and execution falls to the mailto dead-end at :932-937. Compounding it, payInUsd defaults to TRUE for every browser whose timezone is not Asia/Kolkata (:441-450), so this is the default path for the entire diaspora segment.

**Failure scenario.** An NRI devotee in New Jersey opens /pujas/satyanarayan-katha/book. The timezone heuristic flips the toggle to USD automatically. She fills the wizard and clicks "Pay $351 with Stripe". POST /bookings/create-stripe-order returns 201 with a real clientSecret and demo:false; a PujaBooking row + an 'initiated' Payment row are written to Postgres. The client skips the demo branch (clientSecret present) and skips the redirect branch (checkoutUrl undefined), then renders: "Stripe checkout is currently unavailable on this device. Please email support@darshya.online...". She cannot pay. Revenue lost is the full NRI ticket at 9-10x domestic (₹2,099 domestic → ~$351 NRI on the launch SKU sheet), on every USD attempt, plus an orphan unpaid booking row that still consumes slot capacity. In the other configuration (no STRIPE_SECRET_KEY) demo=true fires the branch at :906 and the user sees "Booking Confirmed!" with "Amount Paid ₹2,099" (:1136 always renders the INR total, never the USD amount) for a puja nobody paid for.

**Evidence.**
```
pujas/book/page.tsx:906 `if (data.demo || !data.clientSecret) {` … :925 `if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }` … :932 `setPaymentError('Stripe checkout is currently unavailable on this device. Please email support@darshya.online with booking ' + (data.bookingNumber ?? data.orderId) + ...)`. Server contract, apps/api/src/routes/bookings.ts:912-921 `return reply.status(201).send({ orderId: booking.id, ..., clientSecret: order.clientSecret, amount: order.amount, currency: order.currency, stripePublishableKey: order.publishableKey, demo: order.demo });` — no checkoutUrl key exists anywhere in the file.
```

**Verifier note.** CONFIRMED by independent read of both sides of the contract.

CLIENT (apps/web/app/pujas/book/page.tsx): :906 `if (data.demo || !data.clientSecret) {` -> fake-success; :925 `if (data.checkoutUrl) { window.location.href = ... }`; :933 mailto dead-end text. No `@stripe/*` import and no `StripeClientSecretCheckout` usage anywhere in this file (grep: the component is only mounted in apps/web/app/checkout/offering/page.tsx:682 and apps/web/app/gift/GiftPujaForm.tsx:177). So the clientSecret-only path has no renderer here.

SERVER: POST /bookings/create-stripe-order (handler starts apps/api/src/routes/bookings.ts:849) has exactly one 201 at :912-921 returning {orderId, bookingId, bookingNumber, stripePaymentIntentId, clientSecret, amount, currency, stripePublishableKey, demo} — no checkoutUrl. `grep -rn checkoutUrl apps/api/src` returns ZERO hits repo-wide, so `data.checkoutUrl` is permanently undefined. payment.service.ts:1235-1345 confirms demo = isStripeDemoMode = !STRIPE_SECRET_KEY (apps/api/src/lib/stripe.ts:56) and clientSecret = intent.client_secret (non-null on a real PaymentIntent). With a real key: demo=false + clientSecret set -> both branches skipped -> mailto dead-end. Reachable and it is the ONLY outcome for USD on this page.

Route relevance confirmed: /pujas/[slug]/book redirects to this page (apps/web/app/pujas/[slug]/book/page.tsx:28-29), and /pujas/[slug]/page.tsx:624 is the CTA — this is the primary puja money path, not a dead page. Toggle default confirmed at :440-450 (payInUsd=true for any tz != Asia/Kolkata); button dispatch at :2159.

Orphan-row sub-claim CONFIRMED: booking is created (bookings.ts:896) before createStripeOrder, and GET /slots counts every booking whose status is not cancelled/refunded (bookings.ts:644-652), so a pending_payment orphan does consume slot capacity.

CORRECTIONS to the candidate (overstatements, none fatal):
1. The "no STRIPE_SECRET_KEY -> user sees 'Booking Confirmed!' for an unpaid puja" branch is NOT reachable in production. getStripe() throws when the key is missing under NODE_ENV=production unless ALLOW_DEMO_PAYMENTS=true (apps/api/src/lib/stripe.ts:118-127); prod therefore 400s and the client shows "Could not create your USD order (400)" (page.tsx:888-891). The fake-success screen exists only in dev/staging/ALLOW_DEMO_PAYMENTS. Net effect is unchanged: no configuration of this page can ever take a USD payment.
2. bookings.ts:1227-1236 is the second 201 of POST /bookings/from-offering (handler at :1004), not a second response of create-stripe-order. Irrelevant to the defect since checkoutUrl exists nowhere.
3. The specific "₹2,099 -> ~$351" figures come from a SKU sheet, not code — UNVERIFIED. The billed amount is Math.round(PujaType.nriPrice * 100) cents (payment.service.ts:1275, 1292-1294); the 9-10x multiplier lives in data, not arithmetic I can check statically.
4. Partial mitigation the candidate omits: the INR/USD toggle (page.tsx:2133-2154) stays visible after the error, so a determined user can flip to INR and pay via Razorpay — but at the domestic price (rule #2 revenue loss) and only when nriUsdPrice > 0.

ADJACENT (same root region, strictly worse variant): payInUsd is set true by timezone regardless of nriUsdPrice (:440-450), the currency toggle renders only when nriUsdPrice > 0 (:2133), and the pay button label/handler branch solely on payInUsd (:2159, :2168-2171). For a puja with nriPrice 0/null, a diaspora user sees "Pay $0 with Stripe", the server rejects with "Puja does not have a valid NRI (USD) price configured" (payment.service.ts:1276-1278), and there is no visible control to switch back to INR.

Severity P0 upheld: default-selected path for every non-India visitor on the primary revenue page can never complete a payment in any server configuration, and each attempt writes a pending_payment booking that eats slot capacity. Fix is exactly as the candidate states — mount StripeClientSecretCheckout on the clientSecret path, mirroring apps/web/app/checkout/offering/page.tsx:419-424 and :682-686.

---

### S2C-02 — "View Details" and "Watch Video" on the bookings list 404 — /bookings/[id] route does not exist

- **Severity:** P1 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\bookings\page.tsx:369`
- **Finder:** booking-ui · **Issue:** #This is the audit's reported orphaned booking-detail page — CONFIRMED REAL.

**Root cause.** The list builds path-style hrefs `/bookings/{uuid}` and `/bookings/{uuid}#video`, but app/bookings/ contains only page.tsx and view/page.tsx — there is no [id] segment. The real detail page is a client component that reads the id from a SEARCH PARAM: `const bookingId = sp.get('id') ?? ''` (bookings/view/page.tsx:179-180). Correct href is `/bookings/view?id=${booking.id}` (and `/bookings/view?id=${booking.id}#video`). Confirmed no rescue: apps/web/next.config.ts:102-112 declares exactly one redirect (/kundli) and apps/web/middleware.ts contains no 'bookings' handling.

**Failure scenario.** A devotee who has paid ₹1,301 opens /bookings, sees her confirmed booking card, and clicks "View Details" — Next.js 404s. When the priest uploads the video, the card grows a "Watch Video" button which 404s identically. Video proof is business rule #1 and the core trust promise sold on every landing page; the only route that renders it is unreachable from the one page that lists bookings. Support load per paid booking, and the booking-detail page's review, reschedule, cancel and refund actions are all orphaned with it.

**Evidence.**
```
bookings/page.tsx:369 `href={`/bookings/${booking.id}`}` and :378 `href={`/bookings/${booking.id}#video`}`; directory listing of apps/web/app/bookings = {page.tsx, view/page.tsx}; bookings/view/page.tsx:180 `const bookingId = sp.get('id') ?? '';`
```

**Verifier note.** CONFIRMED as described, and I found two corroborations the candidate did not cite.

CITED CLAIMS, ALL VERIFIED VERBATIM:
- apps/web/app/bookings/page.tsx:369 `href={`/bookings/${booking.id}`}` and :378 `href={`/bookings/${booking.id}#video`}` — exact match.
- `find app/bookings -type f` returns exactly two files: app/bookings/page.tsx and app/bookings/view/page.tsx. No [id] segment, no catch-all (the repo's only [...] route is app/content/books/[slug]/[...chapter]).
- apps/web/app/bookings/view/page.tsx:179-180 `const sp = useSearchParams(); const bookingId = sp.get('id') ?? '';` — search-param based, exactly as claimed.
- No rescue confirmed: next.config.ts:102-112 `redirects()` returns a single entry (/kundli -> /astrology/kundli); nothing after 113 is a redirect (that is `headers()`); `grep -n bookings apps/web/middleware.ts` returns zero hits. No rewrite for /bookings anywhere.

NEW EVIDENCE STRENGTHENING IT (not in the candidate):
1. Next.js's OWN generated route manifest agrees. apps/web/.next/types/routes.d.ts:4 enumerates `... | "/bookings" | "/bookings/view" | ...` — /bookings/[id] is absent from the build's AppRoutes union. routes.d.ts:97-98 lists only `"/bookings": {}` and `"/bookings/view": {}`. Next itself does not believe the route exists.
2. The sibling priest surface proves the intended pattern AND that this is a devotee-side-only slip: apps/web/app/priest/bookings/page.tsx:264 and :339, plus apps/web/app/priest/page.tsx:291, all use `href={`/priest/bookings/view?id=${booking.id}`}` — the correct query-param form. The devotee list is the only place using the path form.
3. The `#video` fragment target genuinely exists on the view page: apps/web/app/bookings/view/page.tsx:537-538 `{booking.videoUrl && (<div id="video" ...`. So the author's intent was unambiguously `/bookings/view?id=<id>#video`.
4. Why it survived CI: apps/web/next.config.ts:16 `ignoreBuildErrors: true` (typedRoutes is not enabled either), so no build-time route/type check could catch the bad href.

REACHABILITY — the failure scenario is not hypothetical, it is on the paid path:
- apps/web/app/checkout/success/page.tsx:60 -> `href="/bookings"` ("View my bookings", the post-payment CTA).
- apps/web/app/pujas/book/page.tsx:1154 -> `href="/bookings"` (booking-wizard completion).
- apps/web/components/NavAuthButton.tsx:119 -> `href="/bookings"` ("My Bookings", devotee nav dropdown).
So a devotee who just paid is routed to /bookings, and the primary CTA on every card (:369) 404s. Conversely, nothing anywhere links to devotee `/bookings/view?id=` — grep for "bookings/view" across apps/web finds only the priest variants plus the view page's own back-links to "/bookings" (view/page.tsx:348, :393, :424). The devotee booking-detail page has zero inbound links; it is genuinely orphaned, reachable only by hand-typed URL.

SEVERITY: P1 is fair — keep it. No money is mis-computed (no arithmetic involved), payment still completes and the booking row is created, so this is not P0. But it breaks the only route that renders video proof (business rule #1) plus the review, reschedule and request-refund actions (view/page.tsx:239, :278, :307), on the sole revenue flow's post-purchase page.

ONE MINOR OVERSTATEMENT TO CORRECT: the candidate says cancel is orphaned along with the detail page. Cancel is NOT fully orphaned — the list page has its own inline Cancel button and calls the API directly (apps/web/app/bookings/page.tsx:386-399 button, :159 `fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`)`). Only video playback, review, reschedule and request-refund are exclusive to the unreachable detail page. Everything else in the candidate stands.

FIX (for the record, not applied — read-only task): change :369 to `/bookings/view?id=${booking.id}` and :378 to `/bookings/view?id=${booking.id}#video`.

---

### S2C-03 — Booking detail page fabricates a completed booking (fake priest, fake ₹1,301, fake video URL) whenever the API call fails

- **Severity:** P1 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\bookings\view\page.tsx:227`
- **Finder:** booking-ui · **Issue:** #Mirror the PBO-7 treatment already applied at pujas/book/page.tsx:463-477 — honest error state + retry, never mock substitution.

**Root cause.** fetchBooking throws on any non-ok response and the catch substitutes a module-level `fallbackBooking` constant with only the id swapped in. That constant is a fully populated fake: bookingNumber 'BS-20260410-34521', status 'video_uploaded', Pandit Ramesh Shastri, priceBreakdown total 1301, videoUrl 'https://example.com/video/rudrabhishek-20260412.mp4', prasadTracking 'BSPR-20260412-001' with India Post carrier, and a complete timestamps ladder. 401 (expired token), 403 (someone else's booking), 404 (bad id), and 5xx all land here identically — as does landing on /bookings/view with no ?id at all, which fetches `/bookings/` and fails. This is the same class of defect PBO-7 removed from the booking wizard, still live on the post-purchase page.

**Failure scenario.** A devotee's access token expires. She opens her booking detail; the API returns 401; the page renders "Video Ready", a priest name, a ₹1,301 breakdown and a prasad tracking ID for a booking that may be pending, cancelled, or belong to nobody. She clicks the video (example.com — dead) and contacts support quoting booking number BS-20260410-34521, which does not exist in Postgres. Worse in the inverse: a real booking that was cancelled and refunded renders as 'video_uploaded / completed', suppressing a legitimate refund complaint. Any user can also see a plausible stranger's-looking booking by visiting /bookings/view?id=<any-garbage>.

**Evidence.**
```
bookings/view/page.tsx:224 `throw new Error('API unavailable');` … :226 `} catch {` :227 `setBooking({ ...fallbackBooking, id: bookingId });` — with the fake defined at :86-130 including `bookingNumber: 'BS-20260410-34521'`, `status: 'video_uploaded'`, `priceBreakdown: { pujaFee: 1100, platformFee: 51, prasadDelivery: 150, total: 1301 }`, `videoUrl: 'https://example.com/video/rudrabhishek-20260412.mp4'`.
```

**Verifier note.** CONFIRMED — every cited line matches the source exactly, and no guard exists anywhere in the path.

Code verified (apps/web/app/bookings/view/page.tsx, 992 lines, committed on main — `git status` clean; last touched by #225 `3bdb4608`, which did NOT remove the fallback):
- :212-233 fetchBooking — `if (res.ok) setBooking(data.booking||data)` :220-222, `else throw new Error('API unavailable')` :224, `} catch {` :226, `setBooking({ ...fallbackBooking, id: bookingId })` :227. Exactly as cited.
- :86-130 `const fallbackBooking: BookingDetail` — every value the candidate quotes is literal and exact: bookingNumber 'BS-20260410-34521' :88, status 'video_uploaded' :89, priestName 'Pandit Ramesh Shastri' :112, videoUrl 'https://example.com/video/rudrabhishek-20260412.mp4' :113, priceBreakdown {1100/51/150/total 1301} :106-111, prasadTracking BSPR-20260412-001 / 'India Post Speed Post' :115-120, full timestamps ladder :121-127.

Reachability — NOT guarded elsewhere, and every listed status lands in the same catch. API route is `server.get('/:id', {preHandler:[authenticateUser]})` at apps/api/src/routes/bookings.ts:222-251, registered `prefix: '/api/v1/bookings'` (server.ts:341). Its error surface is 400 invalid-uuid (:234-237), 404 not-found (:239-241), 403 not-authorized (:242-244), 500 (:245-248), plus 401 from authenticateUser. The client branches only on `res.ok`, so all five collapse to the fake. Confirmed sub-claims:
- Expired token → 401 → fake. The page is wrapped in AuthGuard (:983-989) but AuthGuard only checks presence, not validity: `isAuthenticated: !!session && !!user` (apps/web/lib/auth-context.tsx:722). No expiry check, no 401-refresh-retry in fetchBooking. So an expired-token user passes the guard and lands on the fabrication.
- Garbage id → the Zod uuid parse throws → 400 → fake. Any authenticated user visiting `/bookings/view?id=<anything>` sees a complete, plausible booking.
- No `?id` → `bookingId=''` → `GET /api/v1/bookings/` → 404 (no such route; only `/my`, `/slots`, `/availability`) → fake.
- Network/transient failure also lands in the catch — non-trivial here since the API is Render free tier (spin-down cold starts), which is what makes the inverse-masking case (a real cancelled/refunded booking rendering as "Video Ready / completed", suppressing a refund complaint past the 24h window) genuinely reachable rather than theoretical.

Supporting detail the candidate missed: the file already contains an honest error UI — `if (!booking)` → "Booking Not Found" + link to /bookings at :340-356 — which is now DEAD CODE, because the catch guarantees `booking` is never null after load. The fix is essentially to delete line 227 and let that existing branch (or a retry state) render.

PBO-7 precedent verified as cited: apps/web/app/pujas/book/page.tsx:456-477 carries the comment "on fetch failure show an honest 'could not load' state with a retry — do NOT substitute mock catalog data" and sets `setLoadError(true)` on both the non-ok and catch paths. Same class, opposite treatment, same funnel.

Severity kept at P1, with one correction to the write-up's framing. Money impact is DISPLAY-ONLY — traced the arithmetic and no wrong number is ever computed or charged: priceBreakdown is render-only, and the mutating handlers re-validate server-side (handleRequestRefund :302-327 surfaces the server error and does not fabricate success; POST /:id/request-refund at bookings.ts:456 re-checks eligibility). So there is no incorrect charge, no ledger corruption, and no data leakage (the fake is a module constant, not another user's record — the candidate correctly says "stranger's-looking", not "stranger's"). P1 still holds on the fulfillment/trust axis: it asserts a fake satisfaction of business rule #1 (mandatory video proof) with a dead example.com URL, invents a booking number that does not exist in Postgres, and can mask a real cancelled/refunded state on the primary revenue funnel's post-purchase page.

Two contextual notes that do not change the verdict: (1) the in-app entry point is currently broken independently — apps/web/app/bookings/page.tsx:369 links to `/bookings/${booking.id}` but only `app/bookings/page.tsx` and `app/bookings/view/page.tsx` exist (no `[id]` route), so "View Details" 404s; `apps/web/public/_redirects:18` would have rewritten it but that file is dead post-Render-cutover. This lowers organic traffic to the page but does not fix it — direct nav, bookmarks, and `/bookings/view` with no id all still reach the fabrication. (2) Adjacent, separately reportable: handleCancelBooking :254-270 swallows the cancel response ("// Demo mode" :265) and optimistically sets status 'cancelled' locally regardless of the server outcome; handleSubmitReview :247-249 does the same for reviews. Same swallow-and-fake family, different lines — not part of this finding.

---

### S2C-04 — Cancel and review on the booking detail page swallow API failures and display success unconditionally

- **Severity:** P2 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\bookings\view\page.tsx:264`
- **Finder:** booking-ui

**Root cause.** handleCancelBooking awaits the fetch inside a try, has an empty catch, and then — outside any success check — executes `setBooking({ ...booking, status: 'cancelled' })`. The response status is never inspected, so a 400 (inside the cancellation window), 403 (not your booking), 409 (already in_progress) or 500 all render as a successful cancellation, as does a thrown network error. handleSubmitReview has the identical shape: empty catch at :247-249 then unconditional `setReviewSubmitted(true)` at :250. The sibling implementations on the same page (handleReschedule :286-293, handleRequestRefund :315-318) DO check res.ok and surface the server error — so this is an inconsistency within one file, not a house style.

**Failure scenario.** A devotee cancels 3 hours before her ₹6,999 Griha Pravesh. The API rejects it (or her token has expired and returns 401). The empty catch discards it and the badge flips to "Cancelled". She stops worrying, does not retry, and does not call support. No refund is ever issued, the booking stays confirmed server-side, a pandit is dispatched to an empty house, and the ₹6,999 is disputed weeks later. The refresh that would reveal the truth requires the booking detail page — which is unreachable from /bookings anyway (finding #2). Same pattern on reviews: a devotee's video-proof review is silently dropped while she is thanked for it.

**Evidence.**
```
bookings/view/page.tsx:257-267 `try { await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {...}); } catch { // Demo mode }` immediately followed by `setBooking({ ...booking, status: 'cancelled' });`; and :246-250 `});} catch { // Demo mode - still show success }` followed by `setReviewSubmitted(true);`. Contrast the correct handling at :286-293 `if (res.ok) {...} else { const body = await res.json().catch(() => ({})); setRescheduleMsg(body?.error ?? ...); }`.
```

**Verifier note.** CONFIRMED — code shape is exactly as described, and I found stronger reachability evidence than the candidate cited.

VERIFIED AT SOURCE (apps/web/app/bookings/view/page.tsx):
- handleCancelBooking :254-270 — `await fetch(.../cancel)` return value is never bound; empty catch `// Demo mode` at :264-266; then unconditional `setBooking({ ...booking, status: 'cancelled' })` at :267 and `setShowCancelConfirm(false)` at :269. Response status is never inspected.
- handleSubmitReview :235-252 — identical shape: discarded fetch result, empty catch `// Demo mode - still show success` :247-249, unconditional `setReviewSubmitted(true)` :250.
- Sibling contrast holds: handleReschedule checks `res.ok` and surfaces `body.error` at :286-293; handleRequestRefund throws on `!res.ok` at :315-318. So this is an in-file inconsistency, not house style. Confirmed.
- No compensating surface exists on this page: grep for `cancelError`, `reviewError`, `router.refresh`, `window.location.reload` returns nothing. Nothing ever corrects the false badge.

REACHABILITY — stronger than the candidate argued (this is what settles it):
The client and server disagree on the 24h rule, so the bad path is routine, not exotic. `isCancellable` (:359-364) gates on STATUS ONLY — no time check — so the "Cancel Booking" button (:854-860) renders 3h before the slot. The server DOES enforce it: booking.service.ts:507-509 throws "Cancellation is not allowed within 24 hours...", which apps/api/src/routes/bookings.ts:387-392 maps to HTTP 409. fetch resolves normally on 409, so the badge flips to Cancelled. Other swallowed responses are equally real: 403 :384-386, 404 :381-383, 400 :394-396, plus 401 from authenticateUser and network throws. Aggravating detail the candidate missed: the confirm dialog copy at :833-836 explicitly promises "Refund will be processed within 5-7 business days", actively reinforcing the false success.

OVERSTATEMENTS CORRECTED (money-impact traced to actual arithmetic — there is none):
1. "No refund is ever issued... the ₹6,999 is disputed" — cancelBooking (booking.service.ts:512-535) does NOT move money; it flips status and returns `requiresRefund` / `capturedPaymentId` flags for a downstream process. In the 409 case the row is never touched at all. So this is a false-confirmation / intent-loss defect with downstream consequences (live slot, wasted dispatch, chargeback risk), NOT a refund miscalculation. No ledger arithmetic is wrong.
2. I specifically probed whether the review path is worse than claimed — client posts `{ rating, text }` (:245) while the route reads `body.reviewText` (:1351). That is NOT a bug: submitReviewSchema (routes/bookings.ts:95-101) accepts both keys and transforms `reviewText ?? text`. Reviews are dropped only on genuine failures (401/403/409-duplicate/network), not always.

SEVERITY P1 -> P2: the defect is unambiguous and confirmed, but present-day exposure is near zero because this page is orphaned. grep across apps/web found NO source link to `/bookings/view` (only `/priest/bookings/view`, linked from app/priest/bookings/page.tsx:264,339 and app/priest/page.tsx:291), and grep across apps/api/src + packages found no notification/email link to it either — it is a registered route (`/bookings/view` in .next/types/routes.d.ts) reachable only by direct URL today. The devotee cancel path actually in use is a different `handleCancel` on the /bookings list page (per apps/web/__tests__/booking-fixes-phase0.test.tsx:25-27), which is out of scope here and NOT audited by this finding. This rises to a legitimate P1 the moment the sibling orphaned-detail-page finding is fixed — exposure is the only thing holding it down, so the two should be fixed together, and this one must not be closed as "low impact" if the link is restored first.

---

### S2C-05 — Confirmation screen invents a BS-YYYYMMDD-XXXXX booking number when the server does not return one

- **Severity:** P3 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:800`
- **Finder:** booking-ui

**Root cause.** After a successful verify-payment the client does `verifyData?.bookingNumber ?? generateBookingNumber()`, where generateBookingNumber (:302-307) is pure client-side `BS-${today}-${5 random digits}`. A body that parses but omits bookingNumber (or fails to parse — `.json().catch(() => null)` at :799) silently yields a fabricated reference, which is then rendered as the headline confirmation number with a Copy button (:1110-1112). The USD path has the same construct at :907 `data.bookingNumber ?? generateBookingNumber()`. The server does generate a collision-checked bookingNumber (apps/api/src/routes/bookings.ts:1171-1179) — the client should treat its absence as an error, not backfill it.

**Failure scenario.** verify-payment returns 200 with a body shape change or a truncated response. The devotee sees "Booking Confirmed! BS-20260810-48213", copies it, and emails support about her prasad. No row in PujaBooking matches that number (real numbers are generated server-side with a 5-attempt uniqueness loop), so support cannot find her ₹1,301 payment and she cannot prove her booking. Reconciliation now requires searching by user + timestamp.

**Evidence.**
```
pujas/book/page.tsx:800 `const bkNum = verifyData?.bookingNumber ?? generateBookingNumber();`; :302-307 `function generateBookingNumber(): string { ... const random = String(Math.floor(10000 + Math.random() * 90000)); return `BS-${dateStr}-${random}`; }`; USD path :907 `const bkNum = data.bookingNumber ?? generateBookingNumber();`
```

**Verifier note.** CONFIRMED as a real latent defect, but downgraded P2 -> P3; the failure scenario as written overstates reachability and impact.

VERIFIED EXACTLY AS CITED:
- apps/web/app/pujas/book/page.tsx:800 `const bkNum = verifyData?.bookingNumber ?? generateBookingNumber();`
- page.tsx:302-307 `generateBookingNumber()` is pure client-side: `BS-${dateStr}-${5 random DIGITS}`.
- page.tsx:799 `await verifyRes.json().catch(() => null)`.
- page.tsx:907 USD path `const bkNum = data.bookingNumber ?? generateBookingNumber();`
- Rendered as the headline confirmation number at page.tsx:1110-1112 with a Copy button at :1102-1108 (`navigator.clipboard?.writeText(bookingNumber)`).
Fabricating an authoritative-looking financial reference via `??` is genuinely wrong: it fails open on an error class that should be surfaced. That much holds.

REACHABILITY IS MUCH NARROWER THAN THE CANDIDATE CLAIMS (the main overstatement):
"verify-payment returns 200 with a body shape change" is not reachable through any current server path. The contract is statically non-optional - apps/api/src/services/payment.service.ts:409-413 declares `bookingNumber: string` (required); `verifyPayment` is typed `Promise<VerifyPaymentResult>` at :539; its ONLY success return (:613-617) sources `payment.booking.bookingNumber` from the select at :557; and apps/api/prisma/schema.prisma:455 declares `bookingNumber String @unique` (non-nullable). Every other path throws (:549 invalid signature, :563 payment not found, :567 no booking, :578 not authorized), and apps/api/src/routes/bookings.ts:1316-1332 maps throws to 400/404. Those are caught by the client's own `if (!verifyRes || !verifyRes.ok)` guard at page.tsx:789-797, which returns early with the CORRECT "Payment received (id: ...) but we could not confirm your booking" reconcile message and never reaches line 800. So the fabricator is reachable only via (a) a 200 whose body fails JSON.parse - transport/proxy truncation, non-trivial given the Cloudflare edge in front of Render, or (b) a future server regression. It is a latent/defense-in-depth defect, not a routine path.

THE USD FALLBACK AT :907 IS DEAD CODE: bookings.ts:912-922 emits `bookingNumber: booking.bookingNumber` in the same object literal as `orderId`, and the client already gates on `if (!data?.orderId)` at page.tsx:897. orderId present implies bookingNumber present.

MISATTRIBUTED CITATION: the candidate cites bookings.ts:1171-1179 as the generator for this flow, but that block is inside POST /from-offering (registered at bookings.ts:1004-1005). The page calls POST /create-order (bookings.ts:740-741), whose number comes from booking.service.ts:238-246 via generateBookingNumber() at :112-122. The "collision-checked, server-generated" claim still holds - just in a different function.

MONEY IMPACT TRACED - MUCH SMALLER THAN CLAIMED: no money is misdirected or lost. By the time the response is serialized, the capture+confirm+commission transaction has already committed (payment.service.ts:586-604: payment.status='captured', booking.status='confirmed', writePujaCommissionOnConfirm inside the tx), and post-confirm side effects incl. the invoice email fired at :610. The PujaBooking row exists and is confirmed with its real number; the devotee can read it from GET /bookings/my (bookings.ts:141-142). "She cannot prove her booking" is not accurate - reconciliation also has the razorpay_payment_id, which the client already displays on the failure branch.

ADDITIONAL FACT THAT FURTHER LOWERS SEVERITY: a fabricated number is forensically distinguishable. Server numbers draw from charset 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' (booking.service.ts:117; identically at bookings.ts:1164), matching the real prod booking BS-20260805-T9CHE. The client fabricator (page.tsx:305) emits 5 decimal digits only, so any all-numeric suffix is provably not server-issued.

NOTED FOR THE FIX (not part of the finding, but makes it near-zero-cost): the authoritative bookingNumber is ALREADY returned by /create-order (bookings.ts:817) and by /create-stripe-order (bookings.ts:915), but page.tsx:739-741 discards it - only orderId, razorpayOrderId and amount are extracted. Stashing it there and using it (or erroring on absence) removes both `??` fallbacks without any new request.

Net: real, worth removing, but it is a robustness/fail-open defect gated behind a transport-corruption edge case with no money loss and an existing recovery path - P3, not P2.

---

### S2C-06 — /pujas/[slug] renders a fabricated product page with a ₹751 price for ANY slug, including ones the API 404s

- **Severity:** P2 · **Category:** ux · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\[slug]\page.tsx:260`
- **Finder:** booking-ui · **Issue:** #Business rule #6 (temples must be verified before going live) is cosmetically violated too — the fabricated offerings ship isVerified:true.

**Root cause.** getPujaBySlug catches every failure — including the API's explicit 404 for an unknown slug (apps/api/src/routes/pujas.ts:56-58 `return reply.status(404).send({ error: 'Puja type not found' })`) — and returns `fallbackPujas[slug] || getDefaultFallback(slug)`. getDefaultFallback (:162-223) manufactures a complete listing from the slug string: title-cased name, invented long description, basePrice '751', nriPrice '3501', samagri list, benefits, and two fake bookable temples (Kashi Vishwanath trustScore 98, Siddhivinayak trustScore 95) with invented time slots. `notFound` is imported at :6 and never called anywhere in the file, so no path can 404. generateMetadata (:264) runs through the same helper, so the fabricated page is fully indexable.

**Failure scenario.** A user (or Googlebot) hits /pujas/anything-at-all. The page renders "Anything At All Puja — ₹751 onwards, NRI Price: $3,501", two verified-badged temples, and a "Book This Puja" CTA at :460/:671. She clicks; /pujas/anything-at-all/book redirects to /pujas/book?slug=anything-at-all; the wizard's honest PBO-7 error fires and shows "Could not load puja details". Every unknown-slug visitor is walked to a dead end after being quoted a price, and an unbounded set of thin fabricated pages with Product/price schema is exposed to search engines. The same helper also masks a real API outage: during downtime every real puja silently reprices to ₹751 with the wrong temples.

**Evidence.**
```
pujas/[slug]/page.tsx:259-261 `} catch { return fallbackPujas[slug] || getDefaultFallback(slug); }`; :177-178 `basePrice: '751', nriPrice: '3501',`; :192-204 fake temple `templeName: 'Shri Kashi Vishwanath Temple' ... trustScore: 98, isVerified: true`; :6 `import { notFound } from 'next/navigation';` with zero call sites (grep for `notFound(` in the file returns nothing).
```

**Verifier note.** CONFIRMED at every cited line. apps/web/app/pujas/[slug]/page.tsx:252-262 — getPujaBySlug throws on !res.ok (:257) and the bare catch (:259-261) returns fallbackPujas[slug] || getDefaultFallback(slug), so the API's real 404 (apps/api/src/routes/pujas.ts:56-58) is indistinguishable from a network error. getDefaultFallback (:162-223) fabricates basePrice '751' / nriPrice '3501' (:177-178) plus two isVerified:true temples, Kashi Vishwanath trustScore 98 and Siddhivinayak trustScore 95 (:190-220). notFound is imported at :6 and grep returns that single occurrence — never called; there is also no generateStaticParams and no dynamicParams, so any slug renders (cached revalidate=3600 at :3). No upstream guard: apps/web/middleware.ts:57-67 matches only portal prefixes, and app/pujas/[slug]/error.tsx never fires because nothing throws. Render + dead-end chain verified: price card prints the fabricated INR/USD at :444-456, CTAs at :459-465 and :671-675 hit /pujas/[slug]/book, which redirects to /pujas/book?slug= (book/page.tsx:24-31), where the wizard's fetch (app/pujas/book/page.tsx:465) sets loadError on non-ok (:469-471) and renders "Could not load puja details" (:1038-1051). Indexable-soft-404 half verified: self-canonical at :293, Product/AggregateOffer JSON-LD built from the fabricated prices with availability InStock at :331-368, no noindex. Two corrections to the candidate's framing, neither of which refutes it. (1) No money moves incorrectly: PBO-7 fails closed, so no booking or charge can be created against fabricated catalog data — this is a misquote/dead-end/soft-404 defect, not a money-loss one, which is why P2 rather than P1 is right. (2) "Unbounded set of fabricated pages exposed to search engines" needs discovery to matter; safePujaSlugs (app/sitemap.ts:74-82) only advertises the hardcoded FALLBACK_PUJA_SLUGS when the API call fails, so in steady state the exposure is soft-404 on crawler-discovered or typo URLs rather than an actively submitted set. Evidence the candidate missed, which strengthens the outage claim: fallbackPujas contains only the rudrabhishek key (:71-159), so during an API outage every other real puja reprices to Rs 751 with the wrong temples, and it is reachable by internal navigation — app/pujas/page.tsx:173-285 falls back to six hardcoded cards linking to /pujas/${slug} (:583) whose slugs (satyanarayan-katha, mahamrityunjaya, navagraha-shanti) already drift from sitemap.ts:30-43 (satyanarayan-puja, maha-mrityunjaya, navgraha-puja). The business-rule-6 angle is cosmetic only, as the candidate itself labels it — no Temple row is created, just a fake isVerified badge in the UI.

---

### S2C-07 — getTomorrow()/getMaxDate() compute the booking window in UTC, so IST users between 00:00 and 05:29 can book same-day

- **Severity:** P3 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:260`
- **Finder:** booking-ui · **Issue:** #Residual half of unresolved critical (a).

**Root cause.** Both helpers mutate a local-time Date then serialise with toISOString(), which converts to UTC before slicing the date. For any timezone ahead of UTC the UTC date is one day behind the local date during the early-morning offset window. In IST (UTC+5:30), at local 02:00 on 11 Aug, `d.setDate(d.getDate()+1)` gives local 12 Aug 02:00 = 11 Aug 20:30 UTC, so getTomorrow() returns '2026-08-11' — today. Because that value is both the initial selectedDate (:380) and the min passed to DateInput (:1344), the entire enforcement floor slides back a day. The docstring on the function explicitly claims it is "enforcing that same-day pujas cannot be booked". getMaxDate() has the same skew, shortening the 30-day window by a day.

**Failure scenario.** A devotee opens the booking page at 3 AM IST (a genuine slot for NRI-adjacent and shift-working users). The date picker defaults to and permits TODAY. She books the 06:00 slot three hours out — a same-day booking the product explicitly forbids, leaving no time to dispatch and brief a pandit, buy samagri, or run the T2/T3 tiers of the dispatch engine. If a temple offering exposes an early slot that has already passed (e.g. 04:30 while it is 05:00), the same window admits an outright past-time booking, which is unresolved critical (a) reopening through the timezone seam.

**Evidence.**
```
pujas/book/page.tsx:260-264 `function getTomorrow(): string { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] as string; }`; :266-270 the same pattern for +30 days; consumed at :380 `useState(getTomorrow())` and :1344 `min={getTomorrow()}`. Fix: build the string from getFullYear/getMonth/getDate, as DateInput itself already does at DateInput.tsx:63-65 and :179.
```

**Verifier note.** MECHANISM CONFIRMED, IMPACT SUBSTANTIALLY OVERSTATED. Severity corrected P2 -> P3.

What I confirmed:
- apps/web/app/pujas/book/page.tsx:260-264 and :266-270 are verbatim as quoted: both mutate a local-time Date via setDate(getDate()+N) then serialise with toISOString().split('T')[0]. Consumed at :380 (useState(getTomorrow())) and :1344/:1345 (min=/max= on DateInput). All four cited line numbers are accurate.
- The UTC skew is real. Empirically, `TZ=Asia/Kolkata node`: at 2026-08-11 02:00 IST and 05:29 IST, getTomorrow() -> "2026-08-11" (= local TODAY) and getMaxDate() -> "2026-09-09" (29 days, not 30). At 05:31 IST both are correct (2026-08-12 / 2026-09-10). Window is exactly local 00:00-05:29:59 in IST, i.e. [00:00, UTC-offset).
- The floor is genuinely the only client gate. DateInput enforces min purely by string compare (components/ui/DateInput.tsx:77-81 isInRange, used at :129, :141, :151), and the page's step-1 validator only checks non-empty (page.tsx:601). So during that window today IS selectable and IS the default, and the booking completes end-to-end (create-order schema passes because server "today" in UTC is the prior day, so requested >= today).

What is REFUTED:
1. The quoted docstring does not exist. page.tsx:254-270 contains only a `// ─── Helpers ───` section banner at :254; getTomorrow() has no comment at all. The phrase "enforcing that same-day pujas cannot be booked" appears nowhere in the repo. That evidence string is fabricated.
2. The core premise — that same-day booking is "a same-day booking the product explicitly forbids" — is contradicted by the code. apps/api/src/services/booking.service.ts:130-139 guards past dates only and its comment states "Compare against today at 00:00 local — same-day bookings remain allowed." apps/api/src/services/booking.service.test.ts:65 is a passing test literally named `it('allows scheduledDate of today (same-day booking)')`. The same date-granular past-only refine appears at routes/bookings.ts:16-27, :701-712 (create-order, the endpoint this page actually posts to, page.tsx:699) and :957-968, each with the message "Cannot book a past date." Same-day is deliberate, tested, product-sanctioned behaviour — so the sliding floor violates a UI lead-time convention, not a business rule.
3. "Unresolved critical (a) reopening through the timezone seam" is wrong attribution. A PAST DATE is never reachable via this bug — min degrades to local today, never earlier. A past TIME on today is reachable, but only because the server guard is date-granular and GET /bookings/slots (routes/bookings.ts:668-681) returns every configured slot without any time-of-day filter — a server-side gap present for every client (mobile, direct API) independent of these two helpers. That belongs to critical (a) proper; this finding neither causes nor widens it.

Money impact: none. No pricing, commission, payout, or refund arithmetic touches these helpers; they are local to this file and only feed the date picker.

Residual real defect worth fixing (hence isReal=true, not REFUTED): two helpers use UTC serialisation for a semantically local-calendar computation in a product whose primary market is UTC+5:30. Concrete harm for any IST user loading the page between midnight and 05:30 — the wizard defaults to and permits today (inconsistent with every other hour of the day), and the advertised 30-day booking window is silently 29 days. The suggested fix is correct: build the string from getFullYear/getMonth/getDate, exactly as DateInput already does at components/ui/DateInput.tsx:63-65 (toIso) and :179 (todayIso).

Incidental healthy-behaviour note for the parent: the prior-art claim that the web booking DateInput is NOT wired to the muhurat layer is now STALE. It is wired — page.tsx:551-575 fetches /panchang/puja-muhurat, :577-586 builds muhuratMarkers + avoidDates, and :1347-1348 passes them as dateMarkers/disabledDates.

---

### S2C-08 — Razorpay publishable key silently falls back to the placeholder 'rzp_test_demo' on a live payment page

- **Severity:** P2 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:352`
- **Finder:** booking-ui

**Root cause.** getRazorpayKey fetches /payments/config to keep the client key in sync with the server key, but its catch and its non-ok path both fall through to `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo'`, with no error surfaced to the user or to paymentError. The result is memoised into the module-level `razorpayKeyPromise` (:339-341), so a single transient failure poisons the key for the entire page session — a later successful config fetch is never consulted. TASKS.md records NEXT_PUBLIC_RAZORPAY_KEY_ID as currently unset on Render (#205, "currently rzp_test_demo fallback"), so the fallback is the live behaviour, not a theoretical one.

**Failure scenario.** /payments/config blips (cold start on Render free tier is the common case). The client opens Razorpay checkout with key 'rzp_test_demo' against a razorpayOrderId the server minted with the real live key. Razorpay rejects the order_id/key pairing and the devotee gets an opaque gateway error — after POST /bookings/create-order has already written a PujaBooking row and an 'initiated' Payment row. Every such attempt leaves an orphan pending booking holding slot capacity, and the checkout is unrecoverable for that page session because the bad key is cached.

**Evidence.**
```
pujas/book/page.tsx:343-353 `try { const res = await fetch(`${API_BASE_URL}/payments/config`); if (res.ok) { const j = ...; if (j.keyId) return j.keyId; } } catch { // fall through to env } return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo';`, memoised at :339 `let razorpayKeyPromise: Promise<string> | null = null;` and consumed at :752 `const razorpayKey = await getRazorpayKey();`
```

**Verifier note.** DEFECT IS REAL, but two supporting claims in the rationale are overstated and the root-cause framing should be tightened.

CONFIRMED BY DIRECT READ:
- apps/web/app/pujas/book/page.tsx:339-356 matches the citation verbatim. Both the catch (:349-351) and the non-ok / missing-keyId path fall through to `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo'` (:352). No paymentError is set, nothing is logged, nothing is shown to the user.
- Memoization is real and worse than "page session": `let razorpayKeyPromise` is MODULE-scope (:339) with an assign-once guard (:341) and is never reset on failure, so a bad resolution persists for the JS module's lifetime across client-side navigations. Sole consumer is :752 (confirmed via graft_find_all — only one call site).
- Not guarded downstream. handlePayment has no demo/key-mismatch detection; `rzp.open()` fires unconditionally at :834. The only demo branch is a separate button, handleDemoPayment (:1001-1005), gated on NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS — it is not on this path.
- Orphan pending booking IS created before the key is ever resolved: bookings.ts:794-807 creates the booking (status pending_payment) at step 3, then step 4 mints the Razorpay order; the client only calls getRazorpayKey afterwards at page.tsx:752.
- "Holds slot capacity" also CONFIRMED (candidate asserted it without evidence): GET /bookings/slots groups PujaBooking with `status: { notIn: ['cancelled','refunded'] }` (bookings.ts:644-653), which includes pending_payment, and computes `remaining: Math.max(0, max - booked)` (bookings.ts:666-678). Orphans do reduce displayed availability.

STRONGER EVIDENCE THE FINDER MISSED (this is the real root cause):
The authoritative key is ALREADY in the response the client just consumed. payment.service.ts:484 and :525 return `razorpayKeyId: process.env.RAZORPAY_KEY_ID!` in CreateOrderResult (interface at :401-407); bookings.ts:821 forwards it as `razorpayKeyId` in the 201 body. The web page reads only orderId/razorpayOrderId/amount from that body (page.tsx:733-741) and DISCARDS data.razorpayKeyId, then issues a redundant second fetch to /payments/config that is the only thing capable of failing. The fix is one line — use data.razorpayKeyId, keep the config fetch as fallback — not a retry/cache-invalidation redesign.

REFUTED SUB-CLAIMS (correct these before reporting):
1. "TASKS.md #205 records NEXT_PUBLIC_RAZORPAY_KEY_ID unset, so the fallback is the live behaviour, not theoretical" — REFUTED. #205 is about the web build arg and test-vs-live keys; /payments/config (apps/api/src/routes/payments.ts:189-194, mounted at /api/v1/payments/config via server.ts:342, no auth preHandler) exists precisely to make that build arg irrelevant. More decisively, payment.service.ts:369-378 THROWS AT MODULE LOAD when NODE_ENV=production and RAZORPAY_KEY_ID is missing or equals 'rzp_test_demo', unless ALLOW_DEMO_PAYMENTS=true. A prod API that boots therefore has a real RAZORPAY_KEY_ID, which /payments/config returns non-null (:191). So 'rzp_test_demo' is the FAILURE-PATH behaviour, not the steady state. (Whether ALLOW_DEMO_PAYMENTS=true is set on Render is a runtime env I cannot read — UNVERIFIED — but render.yaml does not set it and apps/api/Dockerfile:51 pins NODE_ENV=production.)
2. "Render free-tier cold start is the common case" — REFUTED by call ordering. handlePayment POSTs /bookings/create-order first (page.tsx:699) and aborts on any failure (:722-730); getRazorpayKey() only runs at :752, i.e. after a successful round-trip to the SAME origin (API_BASE_URL, apps/web/lib/api-config.ts:10-17). A cold start is absorbed by create-order, which has no timeout/abort. Triggering the fallback requires a genuine blip in the few-hundred-ms window between a successful create-order and checkout open, or a /payments/config-specific failure.

SEVERITY: P2 is FAIR, keep it. No wrong amount is charged and no unauthorized capture occurs, so it is not P0/P1. But it sits on the sole revenue path, degrades silently with zero diagnostics, is unrecoverable for the module lifetime once poisoned, and each occurrence strands a pending_payment booking that eats displayed slot capacity. The narrow trigger window argues P3; the silent-degradation + unrecoverability + trivially available correct key argue P2. P2 stands.

Settled entirely statically — no runtime needed.

---

### S2C-09 — handleStripePayment has no in-flight guard — the PBO-16 double-order fix was applied only to the INR path

- **Severity:** P2 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:848`
- **Finder:** booking-ui

**Root cause.** handlePayment opens with the synchronous `if (creatingOrderRef.current) return; creatingOrderRef.current = true;` guard added by PBO-16 precisely because paymentLoading is React state and does not block a second click before the re-render paints. handleStripePayment — reached through the same shared button at :2159 `onClick={payInUsd ? handleStripePayment : handlePayment}` with the same `disabled={paymentLoading}` — never touches creatingOrderRef, so it is protected only by the mechanism PBO-16 documented as insufficient.

**Failure scenario.** An NRI devotee double-clicks "Pay $351 with Stripe" (an ordinary reflex on a slow transatlantic connection). Two POST /bookings/create-stripe-order calls race the state update; two PujaBooking rows and two Stripe PaymentIntents are created for the same slot. At 9-10x domestic pricing each duplicate is a ~$351 exposure, plus double slot consumption against the temple's capacity and a manual void of the second intent. The INR path is immune to the identical gesture.

**Evidence.**
```
pujas/book/page.tsx:848-852 `const handleStripePayment = async () => { if (!isAuthenticated) { window.location.href = ...; return; } ...` — no creatingOrderRef anywhere in the function body (:848-942). Contrast :669-672 `// P0 #PBO-16: block a second create-order while one is in flight ... if (creatingOrderRef.current) return; creatingOrderRef.current = true;`
```

**Verifier note.** Defect confirmed; money-impact clause corrected downward.

VERIFIED CLIENT-SIDE: handlePayment has the synchronous guard at apps/web/app/pujas/book/page.tsx:671-672, with the rationale spelled out by the code itself at :428-433 ("paymentLoading is state (async re-render) so a rapid double-click before the spinner paints can fire create-order twice -> two booking rows + two Razorpay orders"). handleStripePayment at :848-942 goes straight from the isAuthenticated check to setPaymentLoading(true) at :859 with no ref touch. Grep confirms creatingOrderRef appears ONLY at :434 (useRef) and :671/675/728/736/748/795/809/818/831/838 — all inside handlePayment. Shared button at :2159 (onClick={payInUsd ? handleStripePayment : handlePayment}) with only disabled={paymentLoading} at :2160. The asymmetry the candidate describes is exactly as stated. payInUsd defaults to TRUE for any non-Asia/Kolkata timezone (:441-449), so NRI users land on the unguarded handler by default.

VERIFIED NO SERVER-SIDE RESCUE (the candidate did not check this; it holds up):
- apps/api/src/routes/bookings.ts:849-936 — /create-stripe-order calls bookingService.createBooking with no idempotency key, no dedupe on (userId, offering, date, slot), no transaction.
- apps/api/src/services/booking.service.ts:173-186 counts existing bookings, then :268 creates — a non-transactional TOCTOU; two concurrent requests both read the same count and both insert.
- apps/api/prisma/schema.prisma:504-510 — PujaBooking has only plain @@index entries; NO @@unique on (templePujaOfferingId, scheduledDate, scheduledTimeSlot), so the DB cannot reject the second row.
- apps/api/src/services/payment.service.ts:1283-1307 — the "reuse existing initiated payment" idempotency keys on bookingId. Each racing request creates a NEW booking, so this never engages and :1309 creates a second PaymentIntent.
- apps/api/src/server.ts:190 — the 30/min limiter matches url.startsWith('/bookings/create-order'), which '/bookings/create-stripe-order' does NOT prefix-match (falls to the 100/min global). Irrelevant to a 2-click race either way.

CORRECTION — the money figure is wrong and must not ship as written. apps/api/src/routes/bookings.ts:912-922 returns an explicit field list that NEVER includes checkoutUrl. Therefore apps/web/app/pujas/book/page.tsx:925 (`if (data.checkoutUrl)`) is permanently false. In real-Stripe mode (clientSecret present, demo false) the flow falls through to the :932 "Stripe checkout is currently unavailable on this device" error; in demo mode it short-circuits at :906 to the success screen. book/page.tsx imports no StripeClientSecretCheckout (that component is only used by apps/web/app/checkout/offering/page.tsx:405-415) and never uses stripePublishableKey. So the duplicate PaymentIntents are created UNCONFIRMED and no card is ever charged — "each duplicate is a ~$351 exposure" and "double charge" are NOT reachable on this path today. Drop that sentence.

ACTUAL IMPACT (what is genuinely reachable): two pending_payment PujaBooking rows for one intent, both counted against offering.maxBookingsPerSlot by the status notIn ['cancelled','refunded'] filter at booking.service.ts:178 (real slot/capacity consumption), plus orphan Stripe PaymentIntents requiring manual reconciliation, plus duplicate UserAddress rows when prasad is requested (bookings.ts:881-892).

SEVERITY: P2 held. Arguments for lower — no money moves, since the USD path cannot complete a real payment at all right now. Arguments for holding P2 — the project rated the byte-identical INR defect a P0 (#PBO-16), the duplicate rows consume real temple slot capacity, and the moment a checkout redirect is wired (the route already returns clientSecret, so this is one field away) the double-charge exposure becomes live at 9-10x domestic pricing. P2 is fair; do not upgrade to P1 on the strength of a dollar figure that the missing checkoutUrl makes unreachable.

Fix is one line: add the same `if (creatingOrderRef.current) return; creatingOrderRef.current = true;` at :849 with resets on every terminal branch (:851, :893, :900, :917, :937, :940).

---

### S2C-10 — /dashboard/bookings 404s from two post-purchase CTAs — the route does not exist

- **Severity:** P3 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\dashboard\page.tsx:223`
- **Finder:** booking-ui

**Root cause.** app/dashboard/ contains only page.tsx — there is no bookings/ subdirectory. Two links point at /dashboard/bookings: the dashboard's "View all" affordance, which is rendered exactly when the user has MORE than 5 bookings (i.e. shown only to the highest-value repeat devotees), and the offering-checkout success screen's primary post-payment CTA. The correct target is /bookings. Confirmed no rewrite in apps/web/next.config.ts:102-112.

**Failure scenario.** A repeat devotee with 6+ paid bookings opens her dashboard, sees only the 5 most recent, clicks "View all bookings" and gets a 404 — her older bookings and their video proof are unreachable from the dashboard entirely. Separately, a devotee who has just paid for a temple offering lands on the success screen and clicks "View my bookings", the single next-step CTA after a completed payment, and hits a 404 at the highest-trust moment in the funnel.

**Evidence.**
```
dashboard/page.tsx:221-223 `{bookingsCount > 5 && ( <Link href="/dashboard/bookings"`; checkout/offering/page.tsx:494-497 `href={`/dashboard/bookings`} ... View my bookings`; directory listing of apps/web/app/dashboard = {page.tsx} only.
```

**Verifier note.** CONFIRMED as a real dead link, with two corrections that reduce its impact.

VERIFIED: apps/web/app/dashboard/ contains only page.tsx (no bookings/ subdir). Build output corroborates: .next/server/app/dashboard/ holds only page.js, while /bookings exists as a top-level route (.next/server/app/bookings + app/bookings/page.tsx). Both cited links exist exactly as quoted: app/dashboard/page.tsx:221-228 ({bookingsCount > 5 && <a href="/dashboard/bookings">View All) and app/checkout/offering/page.tsx:493-498 (<Link href={`/dashboard/bookings`}>View my bookings). Nothing rescues them: next.config.ts:102-112 redirects() contains only /kundli -> /astrology/kundli; middleware.ts:24-31,57-67 matches only /admin, /priest, /store-admin, /astrologer-portal, /wellness-portal, /gaushala-portal, so /dashboard is untouched; no route groups, no root catch-all; app/not-found.tsx exists so it renders a 404.

REACHABILITY OF THE DASHBOARD PATH (the load-bearing half) HOLDS: the bookingsCount > 5 gate genuinely fires. apps/api/src/routes/users.ts:355-374 returns pagination.total from prisma.pujaBooking.count({ where: { userId } }) - a full count independent of the limit=5 page size requested at app/dashboard/page.tsx:84,91. So a devotee with 6+ bookings sees the affordance and gets a 404.

CORRECTION 1 - the offering-checkout scenario is currently unreachable, so the candidate overstates it. /checkout/offering reads its id from a QUERY param (app/checkout/offering/page.tsx:88-89, sp.get('id')), but the only inbound link in the app is app/pandits/[id]/page.tsx:89 -> `/checkout/offering/${offering.id}` as a PATH segment. There is no app/checkout/offering/[id]/ route (build output has only checkout/offering/page.js), so that link 404s before checkout even begins. The broken CTA at line 494 is real code, but the "highest-trust moment in the funnel" framing does not occur via in-app navigation today. (The pandits->checkout path-vs-query mismatch is a separate, arguably larger defect, not this candidate.)

CORRECTION 2 - "unreachable from the dashboard entirely" is accurate for the dashboard (its other hrefs are lines 131,141,198,246,313,322,331,340,362, none to /bookings; the booking cards at 254-298 are plain divs with no link), but the devotee is NOT locked out globally: components/NavAuthButton.tsx:113-124 renders a "My Bookings" -> /bookings item in the account dropdown for role === 'devotee'.

SEVERITY: corrected P2 -> P3. Deterministic and on the primary devotee dashboard, but zero money impact (payment is already settled at both call sites), no data loss, and a working recovery path exists in the global nav. Fix is a one-character-class change: both hrefs should target /bookings.

---

### S2C-11 — Booking wizard step 1 dead-ends silently when a puja has no temple offerings, and renders inactive offerings as bookable

- **Severity:** P2 · **Category:** ux · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:1281`
- **Finder:** booking-ui

**Root cause.** `puja.temples.map(...)` renders straight into a grid with no length check and no empty state, so an empty array produces an invisible section — the "Select Temple" heading over blank space. The Continue button then fails validation with "Please select a temple" (:600) pointing at a control that has nothing to select, and the Time Slot section is gated on selectedTemple (:1387) so it never appears either. Separately the map never filters on `temple.isActive`, a field the TempleOption interface declares at :98, so a deactivated offering is rendered with a price and is selectable.

**Failure scenario.** A puja type is seeded but its temple offerings are not yet approved (or were all deactivated) — a routine state during temple onboarding, and business rule #6 requires verification before going live. A devotee arriving from an SEO landing page or a deity hub sees a booking wizard with a heading and empty white space, clicks Continue, and gets an error demanding she pick a temple that is not on screen. There is no message, no link back to /pujas, and no explanation; the session is lost with zero diagnostic signal. In the inactive-offering variant she selects a temple that should not be bookable and only discovers it when create-order rejects her.

**Evidence.**
```
pujas/book/page.tsx:1280-1281 `<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"> {puja.temples.map((temple) => {` with no `puja.temples.length === 0` branch anywhere in the step-0 block (:1267-1490); validation at :600 `if (!selectedTempleId) errs.temple = 'Please select a temple';`; unused active flag declared at :98 `isActive: boolean;`
```

**Verifier note.** HALF CONFIRMED, HALF REFUTED — the finding is real but must be rewritten to drop its second claim.

CONFIRMED (the empty-state dead-end): apps/web/app/pujas/book/page.tsx:1280-1328 maps puja.temples straight into the grid with no length check. Grep proves it: the token `temples` occurs in that entire 2233-line file only at :113 (interface), :200 (dead fallback fixture), :485, :492 and :1281 — there is no `puja.temples.length === 0` branch anywhere, in step 0 or before it. The three early returns that do exist are loading (:1027), loadError (:1038) and !puja (:1062); an HTTP 200 carrying `temples: []` satisfies all three and falls through to the wizard. Validation at :600 `if (!selectedTempleId) errs.temple = 'Please select a temple';` and the slot gate at :1387 `{selectedTemple && (` are quoted correctly, so Continue produces an error naming a control that has nothing in it, and the Time Slot card never mounts.

Reachability is stronger than the candidate argued, and is not hypothetical: apps/api/src/services/puja.service.ts:20-22 builds the list `where` from `isActive: true` on PujaType ALONE — it does not require at least one active temple offering — so a zero-offering puja is still listed on /pujas; and apps/web/app/pujas/[slug]/page.tsx:459-465 renders the "Book This Puja" CTA unconditionally (it is not gated on puja.temples.length, which the same page happily prints as "0 temples" at :426/:581). apps/api/src/routes/temple-portal.ts:449 (`if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;`) lets a temple manager deactivate the last offering, so "all offerings inactive" is a routine operational state, not a seeding artifact. Entry via the normal funnel is therefore confirmed, not just via a direct/SEO URL.

REFUTED (the inactive-offering variant): apps/api/src/services/puja.service.ts:91-92 is `templeOfferings: { where: { isActive: true } }`. Inactive offerings are filtered server-side and never reach the client, and :164 echoes `isActive: o.isActive` which is consequently always true. `setPuja` is called from exactly one site (page.tsx:468, the `/pujas/types/${slug}` fetch), so there is no second data path that could smuggle an inactive row in — the dead `getFallbackPuja` fixture at :148 is referenced only by comments after the PBO-7 fix (:370, :457). The candidate's claim that "the map never filters on temple.isActive ... so a deactivated offering is rendered with a price and is selectable", and its scenario "she selects a temple that should not be bookable and only discovers it when create-order rejects her", are both unreachable. The unused `isActive: boolean` at :98 is redundant type surface, not a defect. That half must be struck from the finding.

SEVERITY: P2 held, but for a narrower defect than claimed. No money impact — nothing here mis-charges, mis-splits the 20/80 commission, or corrupts a row; the arithmetic is untouched (basePrice at :496-499 short-circuits on `!selectedTemple`). It is a pure conversion loss: a devotee on the primary revenue funnel hits an unfinishable wizard with a misleading error and no link out. That is above cosmetic (so not P3) but well below the payment/refund-class P0/P1 items. Frequency is gated on catalog state, which is the only thing keeping it out of P1.

FIX SHAPE (not applied — read-only pass): add a `puja.temples.length === 0` branch in the step-0 block rendering an explicit "No temples are currently offering this puja" state with a link back to /pujas; optionally also exclude zero-active-offering puja types from findAllTypes (puja.service.ts:20) so the dead end is never linked in the first place. Do NOT add a client-side `temple.isActive` filter — it would be dead code.

---

### S2C-12 — The /pujas catalogue search box is dead UI — no state, no handler, no form

- **Severity:** P3 · **Category:** ux · **Verdict:** CONFIRMED
- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\page.tsx:337`
- **Finder:** booking-ui

**Root cause.** The hero renders a prominent full-width search input with a magnifier icon and a translated placeholder, but the file is a server component (no 'use client' directive; `export default async function PujasPage`) and the input has no value, no onChange, no name, no defaultValue, and is not wrapped in a <form>. Grep for onChange / <form / use client across the whole file returns nothing. Typing does nothing and Enter does nothing.

**Failure scenario.** A devotee looking for a specific ritual on the top of the funnel types "rudrabhishek" into the most visually prominent control on the catalogue page and presses Enter. Nothing happens — no navigation, no filtering, no empty-result message. With a 100-item catalogue paginated 12 at a time (:290-298), her only recourse is repeatedly clicking through pages. This is the first interaction on the primary revenue funnel's entry page.

**Evidence.**
```
pujas/page.tsx:337-341 `<input type="text" placeholder={t('searchPlaceholder')} className="w-full pl-12 pr-4 py-3.5 rounded-lg ..." />` — attribute list ends there; file header :1-5 shows no 'use client'; :292 `export default async function PujasPage({ searchParams }: { searchParams: Promise<{ page?: string }> })` accepts only `page`.
```

**Verifier note.** CONFIRMED by direct read. apps/web/app/pujas/page.tsx:337-341 is `<input type="text" placeholder={t('searchPlaceholder')} className="..." />` — the attribute list ends at the className; no value, defaultValue, name, onChange, or form. Line 335 is `<div className="relative">` and 334 a plain div, so there is no <form> ancestor, meaning Enter cannot submit. Grep across the whole 611-line file for `use client|onChange|useState|<form` returns ZERO hits (only line 17 `Filter,` as a lucide import and line 436 a `{/* Filters */}` comment), and line 1 begins `import type { Metadata }` with no client directive, so the file is a pure server component and the input can never acquire behavior. `export default async function PujasPage({ searchParams }: { searchParams: Promise<{ page?: string }> })` at :292 with `sp.page` consumed at :295 confirms no `q` param is read. Pagination cited at :290-298 is accurate (PAGE_SIZE=12, slice, Link `/pujas?page=${nextPage}` at :598).

TWO CORRECTIONS to the candidate's framing, neither of which refutes it:
1. The failure scenario overstates recourse. A fully functional GlobalSearch client component (components/GlobalSearch.tsx:35, debounced fetch to `${API_BASE_URL}/search?q=` at :100) is mounted in the shared header at app/layout.tsx:380, so it renders on /pujas. The devotee is NOT stranded — she can search from the header. Notably though, GlobalSearch's `/` hotkey handler explicitly bails when focus is inside an INPUT (GlobalSearch.tsx:56), so a user who has already clicked into the dead box cannot even escape to the working search by pressing `/`. The dead box captures and silently discards intent, which is worse than having no box.
2. The defect is BROADER than reported, not narrower. The same page's four filter `<select>` elements (:439 category, :450 deity, :461 occasion, :472 price) and the "Sort: Popularity" `<button>` (:482) are equally inert — no onChange, no name, no form, same server-component root cause. So the /pujas catalogue has six dead controls, not one. The sibling components/temples/TemplesBrowser.tsx:164 implements exactly this pattern correctly as a client component, showing /pujas is the outlier rather than an intentional design.
3. Minor: "100-item catalogue" is an assumption. :280 requests `getPujaTypes({ limit: 100 })` — that is a ceiling, not a count; the hardcoded FALLBACK_PUJAS is only 6 entries (:176, 193, 210, 227, 244, 261). Actual catalogue size is UNVERIFIED statically.

Severity P3 is fair and I would not raise it: zero money impact, no incorrect arithmetic, no data loss, and a working search exists one control away in the header. It is a top-of-funnel conversion-friction UX bug on the primary revenue path, which is what P3 should mean here.

---

### S2C-13 — POST /bookings/from-offering assigns a priest with no double-booking guard and skips slot capacity entirely when availableSlots is unset

- **Severity:** P1 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `apps/api/src/routes/bookings.ts:1191`
- **Finder:** booking-api · **Issue:** #2026-05-01 launch-readiness critical (b) — REAL, only partially fixed

**Root cause.** This route bypasses booking.service.createBooking and writes PujaBooking directly, setting `priestId: offering.priest.id` at L1191. Unlike the other two priestId-write paths (priest.service.ts:259-273 and dispatch.service.ts:233-245) it performs NO (priestId, scheduledDate, scheduledTimeSlot) conflict lookup. The only capacity control is gated behind `if (slotTimes.length > 0)` at L1116, so when a pandit has not configured availableSlots (PriestPujaOffering.availableSlots is nullable, schema.prisma:372) the whole check is skipped. Even when it runs, the count at L1122-1129 is scoped to `priestPujaOfferingId`, i.e. per-offering, not per-priest — so each of a pandit's offerings keeps an independent counter. There is no DB-level unique constraint to fall back on (schema.prisma:504-510 lists no unique on priestId+date+slot).

**Failure scenario.** Pandit Sharma lists two offerings, 'Satyanarayan Katha' (₹2,100) and 'Griha Pravesh' (₹4,500), neither with availableSlots configured. Devotee A books Satyanarayan for 2026-08-15 09:00 and pays. Devotee B books Griha Pravesh for the same 2026-08-15 09:00 and pays. Both bookings are created with priestId = Sharma, both reach `confirmed`, both charge. One physically cannot happen: ₹2,100-₹4,500 must be refunded plus the trust cost, and per PROJECT_CONTEXT rule 5 the devotee inside 24h cannot even self-cancel. With availableSlots configured the same collision still occurs across two different offerings because the counter is per-offering.

**Evidence.**
```
apps/api/src/routes/bookings.ts:1116 `if (slotTimes.length > 0) {` ... :1122 `const slotBooked = await prisma.pujaBooking.count({ where: { priestPujaOfferingId: offering.id, ...` ... :1191 `priestId: offering.priest.id,` — no conflict query anywhere between L1009 and L1215. Contrast apps/api/src/services/priest.service.ts:259 `const conflict = await prisma.pujaBooking.findFirst({ where: { priestId, scheduledDate: booking.scheduledDate, scheduledTimeSlot: booking.scheduledTimeSlot, status: { notIn: ['cancelled','refunded'] }, id: { not: bookingId } } });`
```

**Verifier note.** CONFIRMED — every technical claim independently verified; the candidate is if anything understated.

Verified by reading the full route body (apps/api/src/routes/bookings.ts:1007-1287): there is NO (priestId, scheduledDate, scheduledTimeSlot) conflict query anywhere in POST /bookings/from-offering. It writes `priestId: offering.priest.id` directly via prisma.pujaBooking.create at :1191. The only capacity control is behind `if (slotTimes.length > 0)` at :1116, and the count at :1122-1129 filters on `priestPujaOfferingId: offering.id` — per-offering, not per-priest, exactly as claimed.

Guards ruled out one by one:
- DB fallback: none. PujaBooking has only @@index entries (schema.prisma:504-510); no @@unique on priest+date+slot.
- Contrast paths are real and DO guard: priest.service.ts:259-273 and dispatch.service.ts:233-245, both matching the cited code.
- Downstream rescue: none. payment.service.ts:264-288 (post-confirm) does no slot/conflict validation. The dispatch guard is structurally unreachable for these bookings because dispatch.service.ts:228 throws when `booking.priestId` is already set — and from-offering sets it at creation.
- Not dead code: live-wired from apps/web/app/checkout/offering/page.tsx:223 and :362.
- availableSlots-unset is the DEFAULT, not legacy back-compat as the route comment at :1105-1109 claims: apps/api/src/routes/priest.ts:26 makes it optional and :525 persists `parsed.data.availableSlots ?? null`. priest-pujas.test.ts:197 asserts an empty array is accepted as "priest disables slot enforcement". schema.prisma:372 confirms `Json?` nullable.

TWO WAYS THE CANDIDATE UNDERSTATES IT:
1. scheduledTime is only `z.string().min(1)` (bookings.ts:969). With availableSlots null the collision does not need two different offerings — N devotees can book the SAME offering at the same date+time, unbounded. The two-offering scenario is the narrower case.
2. Even with slots configured, the count at :1122 and the create at :1183 are not in a transaction — a TOCTOU race lets concurrent requests both pass (maxBookingsPerSlot defaults to 1, schema.prisma:369).

Corroborating signal that this is an unintentional regression, not a design choice: the comment at priest.service.ts:255-258 asserts its guard "covers the only path that writes priestId" and says "If we ever add an admin-assign path, gate it through this same method." That comment is now factually stale — from-offering is a third priestId-write path that bypasses it.

SEVERITY CORRECTED P0 -> P1. The failure scenario's money arithmetic is sound (two full charges at bookings.ts:1094-1103 priceAmount/priestPayout/platformCommission, both bookings independently reaching pending_payment -> confirmed), and PROJECT_CONTEXT rule 5 does block devotee self-cancel inside 24h, so the customer-harm framing is fair. But: the money is fully recoverable by admin refund, there is no ledger corruption, no auth/privacy/IDOR exposure, and no silent loss to the platform — the platform holds both payments until refund rather than paying out twice (payout is separately Aadhaar-gated per rule 4). That is a high-priority fulfillment/refund-liability bug that must be fixed before real booking volume, not a drop-everything P0.

Suggested fix location: add the priest.service.ts:259 conflict query inside a transaction wrapping the create at bookings.ts:1183, and/or add a partial unique index on (priest_id, scheduled_date, scheduled_time_slot) WHERE status NOT IN ('cancelled','refunded') so all three write paths are backstopped at the DB.

---

### S2C-14 — Every auto-processed refund is issued at 100% — the 100/75/50/25/0 cancellation ladder is computed for display only and never applied

- **Severity:** P1 · **Category:** bug · **Verdict:** CONFIRMED
- **Location:** `apps/api/src/services/refund.service.ts:328`
- **Finder:** booking-api · **Issue:** #2026-05-01 launch-readiness critical (d) — REAL, unresolved

**Root cause.** processAutoRefunds hardcodes `refundType: 'full'` for every candidate. cancellationService.computeDevoteeRefund (cancellation.service.ts:94-116) — the function that actually implements the tiered ladder — has exactly two callers per graft_trace_calls: bookingRoutes (only GET /:id/cancel-quote, bookings.ts:577) and its own unit test. Nothing on the money-movement path reads refundFraction. POST /:id/request-refund (bookings.ts:506-514) just tags the booking `cancelled` + `[refund-requested]` and hands off to this cron, and POST /:id/cancel (booking.service.ts:512-535) merely returns `requiresRefund` without computing an amount either.

**Failure scenario.** Devotee books a ₹8,499 Griha Pravesh for 2026-08-20, then cancels 30 hours before the slot — a tier that per business rule 5 should refund 50% (₹4,250) and let the platform retain ₹4,249 to cover the pandit's blocked day. GET /:id/cancel-quote correctly shows the devotee '50%, ₹4,250'. One hour later master-cron runs processAutoRefunds, which calls processRefund with refundType 'full' and returns ₹8,499. The platform eats ₹4,249 per late cancellation and the quote shown to the devotee is a lie. At even 20 late cancellations/month on the ₹3,499-₹8,499 SKUs that is roughly ₹40k-₹85k/month of leaked refund.

**Evidence.**
```
apps/api/src/services/refund.service.ts:325-330 `const r = await processRefund({ bookingId: c.id, reason, refundType: 'full', initiatedBy: 'cron', });` and apps/api/src/jobs/master-cron.ts:524-526 comment `processAutoRefunds picks up cancelled bookings tagged "[refund-requested]" older than 1h and full-refunds each via Razorpay`
```

**Verifier note.** CONFIRMED as a real defect, but the scenario arithmetic, blast radius and severity in the candidate are all overstated. Corrected writeup below.

WHAT IS REAL (independently verified):
- refund.service.ts:325-330 — processAutoRefunds calls processRefund({ bookingId, reason, refundType: 'full', initiatedBy: 'cron' }) with no amount computation. Hardcode confirmed at line 328.
- graft_trace_calls computeDevoteeRefund direction=in depth=all returns exactly two callers: bookingRoutes (apps/api/src/routes/bookings.ts) and cancellation.service.test.ts. The only route use is GET /:id/cancel-quote at bookings.ts:577-582. Grep for refundFraction across apps/ confirms no other consumer. So the ladder is genuinely display-only and never reaches money movement.
- POST /:id/request-refund (bookings.ts:506-514) only sets status='cancelled' + cancellationReason='[refund-requested] ...'; it computes no amount. booking.service.ts:512-535 (cancelBooking) likewise returns only requiresRefund/capturedPaymentId.
- Path is live-wired, not dead code: master-cron.ts:392 `const refunds = await tickAutoRefunds()` inside runDailyOps; tickAutoRefunds at master-cron.ts:523-539 calls processAutoRefunds; runDailyOps is HTTP-exposed via admin-leads.ts:540 and :563 (Render free tier has no native cron — master-cron.ts:33).
=> Net: a devotee cancelling in the 24-48h band is refunded 100% when DEFAULT_CANCEL_POLICY prescribes 75%.

WHAT IS WRONG IN THE CANDIDATE:
1. Tier arithmetic is incorrect. Tiers (cancellation.service.ts:48-51) are 48h->1.0, 24h->0.75, 4h->0.5, 0h->0.25, matched by `hoursUntil >= t.minHoursBefore` (line 104). At the cited 30 hours before the slot the tier is 75% (Rs 6,374.25 on Rs 8,499), NOT 50%/Rs 4,250. The 50% tier is the 4-24h band.
2. The 50%, 25% and 0% tiers are UNREACHABLE via this path. Both entry points hard-reject cancellation inside 24h: bookings.ts:494-503 (slot-aware cutoff, 409 'Refund requests are not allowed within 24 hours of scheduled time') and booking.service.ts:501-510 (throws inside 24h). Slot format is HH:MM (booking.service.test.ts:27 '10:00'), so Number(split(':')) parses correctly and the gate does not NaN-bypass. The ONLY leaking band is 24h < t < 48h, and the leak is 25% of price, not 50%. Cancellations at >=48h get 100%, which is exactly what the ladder prescribes — correct behavior, not leakage.
3. Money impact overstated ~2x and mis-scoped. On Rs 8,499 the leak is Rs 2,124.75, not Rs 4,249, and it applies only to the subset of cancellations falling in the 24-48h window — not to all "late cancellations" (true late cancellations inside 24h cannot enter this path at all). The "Rs 40k-85k/month at 20 late cancellations" figure is therefore roughly 2x too high on rate and applied to too broad a population.
4. "the quote shown to the devotee is a lie" is not currently reachable. Grep across apps/ finds no web or mobile caller of cancel-quote — it appears only at bookings.ts:565/569. Devotees are not shown the 75% quote today, so there is no user-visible quote-vs-actual contradiction yet; the defect is a divergence from the written policy, not a live UI deception.
5. Title's "100/75/50/25/0" conflates two things: the 0 is noShowRefundFraction (cancellation.service.ts:38/137), a separate function, not a fifth tier of the devotee ladder.

NOT A COMPENSATING GUARD (checked, does not refute):
- admin-bookings.ts:274/288-293 does support refundType 'partial' + amountInr, but that is a manual admin escape hatch; it does not guard the cron path.
- payment.service.ts:1037 processRefund is a second, separate full-refund implementation (payments.ts:384, admin-gated) — also always full, so it reinforces rather than mitigates.
- Refund base is correct and not an additional leak: payment.service.ts:507 sets `amount: booking.priceAmount`, the same base the quote uses (bookings.ts:580-581), so refundInr = paidInr = priceAmount. No platform-fee/prasad inflation on top.
- refund.service.ts:302 no-ops the whole cron when RAZORPAY_KEY_ID/SECRET are unset, and prod is still on the rzp_test_demo fallback per TASKS.md #205, so real-money leakage begins only once the live key is set.

SIDE OBSERVATION (not the finding, worth a separate look): cancellationService.snapshotPolicy (cancellation.service.ts:71-77) is the only writer of cancelPolicyJson and has no callers, so getPolicy always falls back to DEFAULT_CANCEL_POLICY (line 86). Separately, cancel-quote computes hoursUntil from booking.scheduledDate alone (midnight-based, bookings.ts:579) while the eligibility gate uses scheduledDate + scheduledTimeSlot (bookings.ts:494-497) — the two disagree by the slot offset.

SEVERITY: P0 -> P1. It is a genuine, real-money divergence from immutable business rule 5 and should be fixed by having processAutoRefunds call computeDevoteeRefund and pass refundType 'partial' + amountInr. But it is bounded to a single 24-hour band at 25% of price (not half the ticket across all late cancellations), has no user-visible contradiction today, and cannot move real money until the live Razorpay key is set. Relation to the 2026-05-01 critical (d) "refunds always issued at full amount": REAL and unresolved as stated, with the corrected scope above.

Files: E:\NewClaude\bhaktisetu\apps\api\src\services\refund.service.ts (:302, :325-330), E:\NewClaude\bhaktisetu\apps\api\src\services\cancellation.service.ts (:48-51, :94-116), E:\NewClaude\bhaktisetu\apps\api\src\routes\bookings.ts (:494-514, :565-603), E:\NewClaude\bhaktisetu\apps\api\src\services\booking.service.ts (:501-535), E:\NewClaude\bhaktisetu\apps\api\src\jobs\master-cron.ts (:392, :523-539), E:\NewClaude\bhaktisetu\apps\api\src\services\payment.service.ts (:507, :1037-1105), E:\NewClaude\bhaktisetu\apps\api\src\routes\admin-bookings.ts (:267-295).

graft saved ~16,150 tokens this turn.


---

## B. UNVERIFIED candidates (29) — verifier died, NOT refuted

**Do not treat these as false.** Each needs an adversarial re-check. Listed with the finder's original
reasoning so the re-verification can start from evidence rather than from scratch.

1. **NRI bookings bill an INR-scaled number as USD — /from-offering multiplies an INR base price by 9 and charges it in dollars**
   - `apps/api/src/routes/bookings.ts:1091`
2. **Video proof is never enforced — a booking can reach `delivered` with videoProofUrl null**
   - `apps/api/src/routes/bookings.ts:75`
3. **Unverified temples are bookable — neither the booking path nor the default temple listing filters on isVerified**
   - `apps/api/src/services/booking.service.ts:142`
4. **Reschedule accepts an arbitrary time-slot string, bypassing the availableSlots whitelist and maxBookingsPerSlot capacity**
   - `apps/api/src/services/booking.service.ts:595`
5. **Admin priest reassignment via PATCH /bookings/:id is a silent no-op that returns 200**
   - `apps/api/src/routes/bookings.ts:303`
6. **Slot capacity is enforced by a count-then-create race with no transaction and no DB constraint — concurrent bookings oversell a slot**
   - `apps/api/src/services/booking.service.ts:173`
7. **puja_bookings has no index on priest_id or temple_puja_offering_id — both are on the booking hot path**
   - `apps/api/prisma/schema.prisma:504`
8. **Unbounded findMany on the payouts summary and in the stale-booking escalation cron**
   - `apps/api/src/routes/admin-bookings.ts:99`
9. **Cancel and reschedule measure the 24h window from midnight instead of the actual slot time, denying devotees up to 23 hours of their entitled window**
   - `apps/api/src/services/booking.service.ts:503`
10. **Booking-number generation is a check-then-insert race, and the /from-offering copy silently gives up after 5 collisions**
   - `apps/api/src/routes/bookings.ts:1172`
11. **Puja Commission ledger stores the platform's 20% cut in the field the payout engine pays out as the provider's 80% share**
   - `apps/api/src/services/payment.service.ts:232`
12. **Cancellation refund ladder is computed and quoted to the devotee but never applied — every refund is issued at 100%**
   - `apps/api/src/services/payment.service.ts:1065`
13. **Temple 5% share (TEMPLE_SHARE_RATE) is never written on the real money path — TemplePayout is unreachable for any paid booking**
   - `apps/api/src/services/booking.service.ts:404`
14. **getPayoutBalance double-subtracts in-flight commissions, locking providers out of newly earned balance**
   - `apps/api/src/services/payout.service.ts:73`
15. **Priest Aadhaar payout gate (business rule 4) is bypassed by the unified #233 payout path**
   - `apps/api/src/services/payout.service.ts:112`
16. **processRefund fires the Razorpay refund outside any transaction, allowing a second full refund after a mid-flight crash**
   - `apps/api/src/services/payment.service.ts:1067`
17. **Duplicate Commission writer in booking.service.ts still runs post-transaction with swallowed errors and float math**
   - `apps/api/src/services/booking.service.ts:365`
18. **Money handled as JS float in refund webhooks, temple share, and payout balance aggregation**
   - `apps/api/src/services/payment.service.ts:1001`
19. **Concurrent payout requests can mint two PayoutRequest rows for the same balance**
   - `apps/api/src/services/payout.service.ts:122`
20. **demo-pay writes a stale 30/70 split that violates the uniform 20/80 take-rate doctrine**
   - `apps/api/src/routes/demo-pay.ts:127`
21. **Refund ladder is never applied — every refund executed is 100% of the captured amount**
   - `apps/api/src/services/refund.service.ts:328`
22. **POST /bookings/:id/cancel refunds nothing and is not even queued for refund — the web Cancel button silently keeps the customer's money**
   - `apps/api/src/services/booking.service.ts:517`
23. **Cancellation/refund writes no compensating ledger entry — the pandit's Commission stays PENDING and withdrawable on a refunded booking**
   - `apps/api/src/services/refund.service.ts:236`
24. **Reschedule bypasses the slot whitelist and per-slot capacity, and accepts a time that has already passed today**
   - `apps/api/src/services/booking.service.ts:591`
25. **Puja Commission rows credit the platform's 20% cut as the pandit's withdrawable balance**
   - `apps/api/src/services/payment.service.ts:232`
26. **No booking confirmation email is ever sent; the template is dead code and the other two channels are both no-ops by default**
   - `apps/api/src/lib/email.ts:94`
27. **cancel-quote computes the refund tier against midnight instead of the slot time, quoting devotees a worse tier than policy**
   - `apps/api/src/routes/bookings.ts:579`
28. **Web Cancel button ignores the API response and always renders "cancelled", including on a 409 rejection**
   - `apps/web/app/bookings/view/page.tsx:258`
29. **The 'refund' notification event is defined but never fired — refund notice depends entirely on Resend being configured**
   - `apps/api/src/services/booking-notify.service.ts:52`

---

## C. Genuinely REFUTED (2) — do not refile

### Refund UI promises a full refund and never discloses the 100/75/50/25/0 ladder the server actually applies

- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\bookings\view\page.tsx:869`

REFUTED — the quoted strings are real, but the premise ("the server applies the ladder, the UI hides it") is false. The devotee actually gets 100% back, so the copy is truthful.

WHAT I VERIFIED AS ACCURATE (all quotes exist verbatim):
- apps/web/app/bookings/view/page.tsx:868-870 refund confirm copy; :910 success toast.
- apps/web/app/bookings/page.tsx:155 bare window.confirm.
- apps/api/src/services/cancellation.service.ts:46-57 DEFAULT_CANCEL_POLICY ladder 100/75/50/25; :59-67 RefundComputation; :71-76 snapshotPolicy.
- apps/web/app/pujas/book/page.tsx:2012-2013 "up to 24 hours before" terms copy.

WHY IT FAILS — traced the button to the money:
1. The cited button calls POST /bookings/:id/request-refund (view/page.tsx:302-314).
2. That route computes NO refund. It only flips status to 'cancelled' and writes the marker `[refund-requested] <reason>` (apps/api/src/routes/bookings.ts:506-514).
3. The cron consumer hardcodes the amount: apps/api/src/services/refund.service.ts:322-330 calls processRefund({ ..., refundType: 'full' }) — line 328. No fraction, no policy read.
4. The gateway call refunds the entire captured amount: apps/api/src/services/payment.service.ts:1065 `Math.round(Number(payment.amount) * 100)`.
5. The other button's path, POST /bookings/:id/cancel -> booking.service.ts:478-536, computes no refund either (it only returns a `requiresRefund` boolean at :529-534).
6. computeDevoteeRefund has exactly TWO callers: GET /:id/cancel-quote (bookings.ts:577) and its unit tests. It is wired to zero money-moving code. panditCancel (cancellation.service.ts:157-192) moves no money at all.
=> On every devotee path the refund is 100%. Nobody is short-changed; no chargeback exposure.

THE FAILURE SCENARIO IS UNREACHABLE TWICE OVER:
- The "20 hours before" case cannot render the button: isRefundable requires scheduledMs - Date.now() > 24h (view/page.tsx:373-377).
- Server-side it 409s inside 24h anyway (bookings.ts:498-503), and cancelBooking throws inside 24h (booking.service.ts:507-509).
So the ladder's 50% (4-24h) and 25% (<4h) tiers are dead config on the devotee path — the exact tiers the ₹1,749.50 loss story depends on. The stated arithmetic never executes.

TWO FACTUAL ERRORS IN THE EVIDENCE:
- "no route exposes a quote (grep ... returns nothing)" is wrong. GET /bookings/:id/cancel-quote exists at apps/api/src/routes/bookings.ts:565-591 and returns refundFraction, refundAmountInr, feeAmountInr, tierLabel, hoursUntilSlot. The finder's grep terms (cancellation-policy/previewRefund/quoteRefund) simply missed the actual name. (Correct sub-claim: the web never calls it — grep for cancel-quote/refundFraction/tierLabel across apps/web returns zero hits.)
- The wizard copy is not "contradictory". "Cancellation is allowed up to 24 hours before" is precisely what both server paths enforce. The stale artifact is the sub-24h ladder, not the checkbox text.

DIRECTIONAL INVERSION: if anything the real defect points the other way — the platform over-refunds. The snapshotted policy (payment.service.ts:266-269) and the marketed 100/75/50/25 differentiator are never applied, so a 24-48h cancellation that policy prices at 75% is paid out at 100%, leaking the 25% retention. That is the server-side half of unresolved critical (d) and belongs in a separate finding, not this UX one.

ADJACENT REAL DEFECT FOUND WHILE VERIFYING (report separately, not this finding): the list-page cancel posts an empty body (apps/web/app/bookings/page.tsx:159-166), so cancelBooking stores cancellationReason=null (booking.service.ts:517). processAutoRefunds only selects rows whose cancellationReason startsWith '[refund-requested]' (refund.service.ts:308-316). A booking cancelled from /bookings therefore never gets auto-refunded at all and needs manual admin action — money silently withheld, the opposite of this candidate's claim.

Severity: not applicable — no defect as described. Even reframed as "cancel-quote exists but is unwired", it is cosmetic while refunds are full, so it would be at most P3, not P1.

---
### Muhurat fetch failure silently degrades the picker to muhurat-blind with no user signal

- **Location:** `E:\NewClaude\bhaktisetu\apps\web\app\pujas\book\page.tsx:567`

Code description is accurate; the failure scenario and its money impact are not reachable, so this is not a reportable defect.

WHAT IS TRUE (verified):
- apps/web/app/pujas/book/page.tsx:560-575 — the muhurat effect does `if (!res.ok) throw` then `catch { if (!cancelled) setMuhuratDays([]) }` with the comment "Muhurat guidance is advisory — never block the picker on it." There is no error state variable (grep for muhurat* in the file returns only muhuratDays/muhuratMarkers/avoidDates/selectedDayMuhurat), so a failed fetch is visually identical to a puja with no ruleset. The hint copy at :1379 is gated on `muhuratDays.length > 0`, so it disappears too. The picker IS wired (contrary to the prior-art note that it was not): commit e5b43e5e / PR #236, DateInput props at page.tsx:1347-1348, consumed at components/ui/DateInput.tsx:271-273.

WHY IT IS REFUTED — the stated harm cannot occur:
1. The endpoint returns only the FIVE highest-scoring days, not a 60-day grade map. apps/api/src/services/panchang.service.ts:750 `return findPujaMuhurats(pujaType, inputs, 5)`; apps/api/src/lib/puja-muhurat.ts:251-253 sorts `b.score - a.score` and `.slice(0, topN)`.
2. `avoid` means score < 40 (apps/api/src/lib/puja-muhurat.ts:213 `score >= 60 ? 'shubh' : score >= 40 ? 'neutral' : 'avoid'`). For an `avoid` day to survive into a top-5 slice of a 60-day horizon, every one of the 60 days would have to score below 40.
3. Therefore `avoidDates` (page.tsx:583-586) is effectively always EMPTY on the healthy path too, so `disabledDates` (page.tsx:1348 → DateInput.tsx:271-272) disables nothing. The claim "picks an 'avoid' date the system would otherwise have disabled" is false in both the healthy and degraded states, which also removes the cancellation/refund-ladder money impact the finding hangs on. No struck-through days are lost either — DateInput.tsx:286/293 renders line-through only for `isAvoid`, which never fires.
4. Real degradation delta on failure is cosmetic and confined to the 2 slugs in PUJA_TYPE_BY_SLUG (page.tsx:80-88): up to 5 green shubh badges, the shubh-window chip panel (:1353-1378) if one of those 5 dates happened to be selected, and one advisory line (:1379-1383). Rahu Kaal is only ever shown for a selected top-5 day (:1374-1376), never as calendar-wide chips.
5. Request validity was checked so the "always degraded" alternative is also excluded: `days=60` passes `z.coerce.number().int().min(1).max(92)` (apps/api/src/lib/puja-muhurat.ts:236), route is registered before `/:date` (apps/api/src/routes/panchang.ts:97-99) and is unauthenticated, and API_BASE_URL already carries the /api/v1 prefix (apps/web/lib/api-config.ts:10-15).

Overstatement to correct: the evidence line quotes the catch accurately, but "the calendar silently loses its green shubh badges, its struck-through avoid days, and its Rahu-Kaal window chips" implies a rich muhurat calendar exists to lose. It does not — the healthy render is 5 badged days out of 60, zero disabled days, and one chip panel. Adding a "muhurat guidance unavailable" line would be a reasonable polish item (the same file already models this with slotsError at :385/:541/:1399), but it is a cosmetic consistency nit, not a money-path defect, and does not merit a finding at P3 or any severity.

