# Batch 8 — adversarial review of the fixes, and what it found (2026-08-11)

> Five read-only reviewers were run against everything changed on 2026-08-11: the RV-04 commission fix, the
> payout-service guards, the RV-17 reassignment fix, the Stripe removal, and the new password-reset flow.
> They found **14 real defects**, including one P0 that the fix work had itself introduced. All are fixed.
>
> Read this before touching the Commission ledger, the payout rails, or the reassignment path.

## The headline

**The RV-04 fix was correct in isolation and created a P0 in integration.**

`Commission.providerId` held a `Priest.id` where every payout read passes a `User.id`, so the rows were
orphaned and inert. That is the *only* reason two payout rails could coexist safely:

| Rail | Source | Surface |
|---|---|---|
| A — unified (#233) | `Commission` → `PayoutRequest` | `/payouts`, all provider roles |
| B — legacy | `PriestPayout` | `/admin/bookings`, pandits only |

Repairing the key made rail A live for money rail B already paid, with nothing cross-checking them. On a
₹5,000 booking the platform would have transferred **₹4,000 twice — ₹8,000 out on ₹5,000 of revenue.**

`tsc` was clean and 1,059 tests passed throughout. Nothing caught it, because `packages/api-client` types the
commissions payload as `unknown[]`: `providerId` changing keyspace and `amount` changing meaning produced
zero compile errors across five consuming surfaces in three apps.

**Rule that follows: a money-model change must be reviewed across every reader in every app, not just the
writer. Type-checking cannot see it.**

## Fix: the rails are now mutually exclusive

`createPriestPayout` returns `{skipped: true, reason: 'commission-ledger-owns-this-booking'}` when a
`Commission` exists for the booking. Rail B still serves the bookings rail A structurally cannot reach — a
Commission is only minted when a priest is already on the booking at `confirmed`, so temple-path and
dispatch-assigned (T1–T3) bookings never get one and would otherwise be paid by nothing at all.

## One column, one meaning

The two `Commission` columns carried **three** meanings across five writers, and readers back-solved gross
revenue from whichever pair they assumed. `apps/api/src/lib/commission-math.ts` now fixes the convention:

- `amount` — the **provider's** earning. Authoritative, because it is literally what
  `payout.service.getPayoutBalance` sums into a withdrawable balance. Any other meaning is a mispayment.
- `percentage` — the **platform's** take rate.
- `gross` and `platformCut` are derived there. No reader re-invents the arithmetic.

## Every finding

### Money — P0

| # | Defect | Where | Impact |
|---|---|---|---|
| 1 | Double-pay rail (above) | `payment.service.createPriestPayout` | ₹8,000 paid on ₹5,000 revenue |
| 2 | `consultation.ts` wrote the platform's 20% into `amount` while keying on a real `User.id` | `routes/consultation.ts:439` | **Live 75% underpayment to every astrologer**, through the payout rail and the weekly cron. Pre-existing, not caused by this session |
| 3 | RV-01 still live on the temple booking path: `currency: user.isNri ? 'USD' : 'INR'` with an INR amount | `booking.service.ts:448` | `razorpay.orders.create` asked for **$10,000 on a ₹10,000 booking** — the same ~83× overcharge Batch 1 closed on the sibling path. `isNri` is self-settable via `PATCH /users/me`. A test *encoded* this, asserting `currency === 'USD'` |
| 4 | Reassignment never re-keyed the Commission | `routes/bookings.ts` | The old pandit kept the whole 80% for a puja the new one performs; the new one saw ₹0 |

### Money — reporting

| # | Defect | Where |
|---|---|---|
| 5 | Admin "Commissions Earned" summed the provider's earning as platform revenue (~4× overstatement) | `admin.service.getRevenue` |
| 6 | Admin pending-payouts applied `payoutMultiplier` to an already-net amount (0.80 × 0.70 = 56% of gross) | `routes/admin-bookings.ts` |
| 7 | `/astrologer-portal/earnings` back-solved gross from `amount`+`percentage`, inverting every figure; and with `User.id` keys, puja rows leaked into a dual-role user's astrologer earnings | `routes/astrologer-portal.ts` |
| 8 | Admin commissions table rendered the provider's earning as a negative platform deduction, and its totals string-concatenated (`"08001200"`) because the API stringifies the Decimal | `CommissionsPanel.tsx` |

### Correctness

| # | Defect | Where |
|---|---|---|
| 9 | Reassignment notified nobody — devotee, old pandit and new pandit were all left in the dark, while every other assignment path notifies | `routes/bookings.ts` |
| 10 | An identical retry of a committed reassignment answered `409 Invalid status transition` — the same "409 on committed work" class RV-17 set out to remove, narrowed but not eliminated | `routes/bookings.ts` |
| 11 | Mobile's Premium upgrade called the deleted `/subscriptions/create-stripe-annual`. Mobile ships as its own binary and does not redeploy with the API, so it would have 404'd for every installed client | `packages/api-client`, `apps/mobile` |

### Security

| # | Defect | Where |
|---|---|---|
| 12 | The reset page accepted *any* Supabase session as a valid recovery link. The client persists sessions, Google OAuth leaves one, and app sign-out never clears Supabase — so on a shared machine the next person could open the URL with no emailed link and rewrite the previous user's password. Now requires `type=recovery` in the fragment | `auth/reset-password/page.tsx` |
| 13 | Reset cleared only the Supabase session, leaving `poojly_*` — the user was bounced past the login page into a dashboard on a revoked session that died within the hour | `auth/reset-password/page.tsx` |
| 14 | Reset accepted passwords signup would reject (no letter/digit requirement) | `auth/reset-password/page.tsx` |

### Content — corrected in the same pass

Terms asserted both INR-only and USD-for-international in adjacent bullets; `jsonld.ts` and `/uk` emitted
USD/GBP `Offer` structured data (Google renders that price in search results, then the devotee lands on an
INR-only checkout); ~13 pages still promised multi-currency billing. All corrected, plus the dead `stripe`
npm deps, the Stripe CSP origins in `public/_headers`, and the `.env.example` entries.

## Confirmed NOT bugs (do not re-audit)

- `row.priestPayout` cannot be undefined — it is a non-nullable Decimal and the include has no top-level `select`.
- `processPayout`'s strict `linkedTotal.equals(req.amount)` assertion is not violated by any legitimate flow:
  RV-02's reversal filters `payoutRequestId: null`, partial refunds do not touch the ledger, and `requestPayout`
  links atomically.
- No historical `paymentGateway = 'stripe'` row can break a refund or aggregate — every such path filters on
  `status: 'captured'` and the old writer only ever produced `initiated`. The enum value is deliberately left
  in place; dropping it needs an `ALTER TYPE` that would fail on any existing row.
- The `reassigned` payload type cannot diverge from `updateBookingStatus`'s — both use the same exported
  `BOOKING_STATUS_RESPONSE_INCLUDE`.
- Middleware does not gate `/auth/*`; both new reset routes are reachable logged-out.
- No global `onAuthStateChange` listener hijacks the recovery session — `AuthProvider` is Supabase-unaware.

## Known remaining, deliberately not changed

- **No backfill.** Historical Commission rows keep the old key and value (owner decision: no retroactive
  payable). The ledger is therefore permanently mixed, and any figure computed across all time reflects that.
- `runWeeklySettlement`'s in-flight skip suppresses *cron* duplicates only; self-serve `requestPayout` has no
  dedupe, which is intentional — a provider must always be able to pull their balance.
- The advisory lock closes admin-vs-admin double-booking but not admin-vs-pandit: `dispatch.service.accept`
  and `createBooking`'s priest-pinned path check for conflicts without taking the priest-slot lock.
- `apps/web/app/settings/earnings/page.tsx` is entirely mock data behind a real URL, including a
  "Request Instant Payout" button. Pre-existing and out of scope, but it shows any provider a fake ledger.
