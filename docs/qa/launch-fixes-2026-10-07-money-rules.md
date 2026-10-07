# Launch fixes 2026-10-07: money rules (API)

Local stack only (Postgres on 127.0.0.1:55432, database `darshya_a`, API on :4001, demo tokens, demo Razorpay values).
Nothing touched production. No schema changes. "Before" = `main` at `c1fa51dc`; "after" = this commit.

## 1. Early completion is refused (`409 too_early_to_complete`)

Completing a puja, a consultation or a wellness session releases the provider's held earning, so it is refused until the
scheduled start has passed.

| Kind | Door | Change |
|---|---|---|
| Puja | `PATCH /priest/bookings/:id/complete` (`priest.service.completePuja`) | Refused until the slot start. The slot is read as an IST label (`lib/slot-time.ts`); an unreadable slot opens at 00:00 IST on the day, the same fallback the start gate uses. The start gate opens 2 h before the slot, so Start-then-Complete used to release the earning up to 2 h early; that gap is closed. Video proof is still mandatory (checked after the time gate). |
| Puja | `PATCH /bookings/:id` `{"status":"completed" or "video_uploaded"}` by the assigned pandit | The same door, `bookings.ts` (not in the owned list; the gap cannot be closed without it). Admin is exempt. |
| Consultation | `PATCH /consultation/:id/complete` | Refused until `scheduled_at`. On-demand consultations (no `scheduled_at`) are not gated. Admin is exempt. |
| Wellness | `PATCH /wellness/sessions/:id` `{"status":"COMPLETED"}` | Refused until `scheduledAt`. Also refused: moving `scheduledAt` into the past (the payout hold is `scheduledAt > now AND status != COMPLETED`, so back-dating released the earnings the same way); `409 scheduled_in_past`. CANCELLED clean-up may still use a past time. |

New helper `apps/api/src/lib/completion-window.ts` (`TOO_EARLY_TO_COMPLETE`, `pujaScheduledInstant`, `tooEarlyToCompleteMessage`).

Admin: puja admins can force-complete through `PATCH /bookings/:id` (exempt, verified live). Consultation admin is exempt too.
The wellness `PATCH /sessions/:id` route is `requireRole('WELLNESS_INSTRUCTOR')`, so an admin token gets 403 there (unchanged; the
in-handler `isAdmin` checks are unreachable). There is no admin force-complete for wellness; decision for the owner if wanted.
There is no astrologer-portal completion route (the consultation route is the only one).

Live evidence (slot times relative to now, IST):

```
puja slot +90 min, in_progress, proof on file
 before PATCH /priest/bookings/:id/complete  -> 200, status=video_uploaded
 after                                       -> 409 {"error":"This puja cannot be marked complete before it starts, at 2:00 AM IST on 8 Oct 2026.","code":"too_early_to_complete"}, status stays in_progress
puja slot -60 min  after -> 200, status=video_uploaded
generic PATCH /bookings/:id completed (pandit, future slot)
 before -> 200 status=completed        after -> 409 too_early_to_complete; past slot -> 200; admin on future slot -> 200
consultation scheduled +2 h   before 200 completed     after 409 too_early_to_complete
consultation scheduled -1 h   after 200;  admin force on a +3 h one: 200
wellness session +2 h COMPLETED  before 200            after 409 too_early_to_complete
wellness session -1 h COMPLETED  after 200
wellness scheduledAt 2020 (alone, or with COMPLETED)   before 200   after 409 scheduled_in_past
```

## 2. Refund default is the cancellation policy

`POST /admin/bookings/refunds/:id/approve` with no `refundType` (or no body) now behaves as `refundType:"policy"`.
Explicit `full` and `partial` are unchanged. If the policy owes nothing the call is `400` and moves no money.

```
booking +3 days, Rs 1000, no refundType   before 200 amountInr 1000   after 200 amountInr 1000 (policy tier is 100%)
booking +3 h,    Rs 1000, no refundType   before 200 amountInr 1000   after 200 amountInr 250, partially_refunded (policy tier)
explicit full  (+3 h booking)             after 200 amountInr 1000 ; explicit partial 100 -> 200 amountInr 100
```

## 3. Referral reward gated (`HAS_REFERRAL_CREDIT`)

`apps/api/src/lib/referral-flag.ts` exports `HAS_REFERRAL_CREDIT = false` (same name and meaning as the web flag). While
false, `POST /referrals/reward` answers `404 {"error":"referral_credit_unavailable","code":"referral_credit_unavailable"}`
after authentication and before touching a claim or the wallet. The body carries a `message` on purpose: without one the
error-localization plugin overwrites `code` with `NOT_FOUND`. `/me`, `/lookup/:code`, `/claim`, `/mine` are untouched. The
ownership and captured-payment checks stay in the route; their tests run with the flag mocked true.

```
pending claim, referee has a paid booking
 before POST /referrals/reward -> 200 {"status":"rewarded","rewardPaise":10000,...}, claim status=rewarded, referrer wallet credited
 after                         -> 404 code referral_credit_unavailable, claim status=pending, wallet untouched
 GET /referrals/me, /mine, POST /claim still 200 / 200 / 404 (unknown code)
```

## URL inputs are http(s) only

New helper `apps/api/src/lib/http-url.ts` (`isHttpUrl`, `httpUrlSchema(field, max)`). The previous fix had an inline regex in
`priest.ts`; it was a private refine, so it is now this shared helper and both priest fields (`videoUrl`, `avatarUrl`) use it.
The only other user-supplied URL in the owned wellness/consultation/astrologer routes is `roomUrl`
(`PATCH /wellness/sessions/:id/room`); there is no `playbackUrl` input in any route (it is only written by the YouTube job).

```
PATCH /wellness/sessions/:id/room  javascript:alert(1) | data:text/html,x | file:///etc/passwd
 before 200 (stored as roomUrl)    after 400 "roomUrl must be a valid http:// or https:// URL"
 https://meet.jit.si/ok-room: 200 before and after
```

Not touched (outside the owned files, same gap per the providers role pass): the store `imageUrl`/`websiteUrl` fields and
`bookings.ts` `videoProofUrl` (already http(s)-only by its own regex).

## Production-mode smoke

`NODE_ENV=production ALLOW_DEMO_PAYMENTS=true JWT_SECRET=... CORS_ORIGIN=http://localhost:3010
SENTRY_DSN=https://abc123@o1.ingest.sentry.io/1` plus the local DB and Supabase stubs, on :4001:

```
GET /api/v1/auth/me        (no token) -> 401
GET /api/v1/admin/dashboard (no token) -> 401
GET /api/v1/bookings/my    (no token) -> 401
demo-admin-token in production     -> 401
log: 0 occurrences of "fastify otel instance"; no error lines at boot
```

## Tests

- `npx tsc --noEmit` in `apps/api`: clean.
- Touched areas (routes/priest*, astrolog*, consultation*, wellness*, admin-bookings*, referrals*, bookings*, services/booking*,
  payout*): 65 files, 817 passed before the new tests; the only failures were the 4 `/referrals/reward` tests that need the
  flag on. Intended, so `referrals.test.ts` now mocks `HAS_REFERRAL_CREDIT` true and adds a flag-off block.
- New: `lib/completion-window.test.ts` (also covers `http-url`), `routes/consultation.complete-window.test.ts`,
  `routes/wellness-sessions.complete-window.test.ts` (also `roomUrl`), `routes/bookings.complete-window.test.ts`; added cases in
  `services/priest.service.test.ts` and `routes/admin-bookings.refund-policy.test.ts`.
- One full `npx vitest run` in `apps/api`: 367 files, 3673 tests, all passing.

## Decisions and open items for the owner

1. A priest can still reach `in_progress` through `PATCH /bookings/:id {"status":"in_progress"}` without the 2 h start gate
   (that door has no start-gate check). It no longer matters for money (completion is gated), but it is an inconsistency.
2. On-demand consultations (no `scheduled_at`) can be completed right after payment; there is no duration rule. Say if you want
   "not before `paid_at` + minutes".
3. Wellness has no admin force-complete (the route is instructor-only).
4. The 24 h-or-less case of an admin refund with no `refundType` now returns the policy amount (for example 25% at +3 h). Admin
   pages that relied on the old full default must send `refundType:"full"` explicitly (the web admin page already sends `policy`).
