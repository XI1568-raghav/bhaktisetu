# Role pass 2026-10-07: pandit, temple manager, gaushala manager (provider side)

Local stack only (Postgres 16 on 127.0.0.1:55432, database `darshya_b`, API on :4002 with `demo-<handle>-token`
sessions, demo Razorpay values, no third-party keys). Nothing here touched production. Code under test: `main` at
`7e8551a9`, plus the fixes listed below.

## Headline: P0, any signed-in user could run admin mutations behind a 403

Found while testing the negative cases. A non-admin calling an admin route got `403 Forbidden`, but **the handler still
executed**.

Repro (before the fix, local):

```
# temple profile approved=true
curl -X PATCH -H "Authorization: Bearer demo-devotee-token" -H 'content-type: application/json' \
  -d '{"approved":false}' http://127.0.0.1:4002/api/v1/admin/users/<temple-manager-user-id>
# -> HTTP 403 {"error":"Forbidden","message":"This route requires admin privileges."}
# temple_profiles.approved is now false
```

Same with a pandit token on `POST /admin/bookings/payout-requests/:id/process` (`{"action":"complete"}`): the response was
403, and `payout_requests` showed `status=completed, processed_by=<the pandit's own user id>`, with the pandit's
commissions flipped to PAID. A pandit could settle their own payout with no transfer. Unauthenticated requests got 401 and
the handler ran as well (`Cannot write headers after they are sent` in the log); `POST /onboarding/*` with an empty body
answered 400 instead of 401 for the same reason.

Cause: every guard is written `reply.code(40x).send(...); return;`. Fastify only skips the handler when `reply.sent` is
already true at the instant the hook settles. #322 (2026-10-06) added an **async `preSerialization` hook**
(`localizeImages`, `server.ts`), which defers the write by a tick, so the handler now always ran behind a denied guard.
That commit was deployed in the 2026-10-06 manual deploy, so **production is exposed until this fix ships** (not verified
on prod, by design: same code path, reproduced locally and then closed locally).

Fix (three layers, all small):
1. `server.ts`: the `preSerialization` hook is callback style (synchronous), restoring the old timing.
2. `lib/stop-when-answered.ts` + an `onRoute` hook in `server.ts`: every route-level `preHandler`/`preValidation`/
   `onRequest` guard that leaves a status >= 400 on the reply now `return reply`, which is the documented Fastify idiom
   that stops the handler. Covers the ~40 `send(); return;` guards (auth, cron, org, B2B, API-key) without editing each.
3. `middlewares/auth.ts`: `authenticateUser`, `requireRole`, `requireAnyRole` carry the same wrapper, because
   plugin-level `addHook('preHandler', authenticateUser)` (users, account, orgs, conversations, reading-progress)
   bypasses the route-level hook.

Verified live after each layer (devotee, pandit and no-token calls to an admin mutation: 403/403/401 and the row
unchanged) and with `src/lib/stop-when-answered.test.ts` (naive guard + async serializer runs the handler; wrapped,
`requireRole`, and plugin-level `authenticateUser` do not).

## Results by flow

Legend: PASS, FAIL (bug, fixed in this commit unless marked OPEN), n/t (not tested).

### Pandit

| Flow | Result | Evidence |
|---|---|---|
| Profile via portal route | PASS with caveat | `POST /onboarding/provider` for a demo session answers `202 demoMode`, nothing persisted (by design). The `start`/`step/1..5`/`submit` wizard does persist and was used for temple + gaushala. The demo pandit already had an approved profile with `aadhaarVerified:true` from `seed-demo-users`, so pandit profile creation + admin approval of a NEW pandit was not exercised (n/t). |
| Devotee books + pays an open-pool puja | PASS | `POST /bookings/create-order` 201, Rs 1152 = 1101 offering price + Rs 51 platform fee; bad signature 400 `verified:false`; good HMAC 200. |
| Pandit sees it in the open pool, accepts | PASS | `GET /priest/open-requests` lists it with `priestEarningInr 880.8`; accept 200 -> `priest_assigned`. |
| 2 h start gate | PASS | start at +5 days: 409 "from 5:00 AM IST on 12 Oct 2026, 2 hours before"; after moving the slot in the local DB: 200 `in_progress`. |
| Video proof mandatory | PASS (with P1 below) | complete without proof: 409 "Upload the video proof before marking this puja complete."; with proof: 200 -> `video_uploaded`. |
| Earnings held, then released | PASS | after accept: `availableInr 0, upcomingInr 880.8`; after proof + complete: `availableInr 880.8, upcomingInr 0`. Temple share the same: `releaseStatus upcoming` for the unproved booking, `payable` for the proved one. |
| Payout request, admin processes | PASS after fix | request without KYC row: 400; with unverified KYC: 400 "pending verification"; admin verify, then request 201 (see P1-2). Admin `process complete` marks the commission PAID; `paidOutInr 880.8`; a repeat reports `alreadyCompleted:true` and keeps the first reference. |
| Aadhaar gate on priest payout | PASS | `createPriestPayout` with `aadhaarVerified=false`: "Priest ... has not completed Aadhaar verification. Payout blocked until KYC clears." (called directly through the service, not an HTTP route). |
| Rails mutually exclusive | PASS | `createPriestPayout` on a Commission-owned booking: `skipped:true, reason: commission-ledger-owns-this-booking`, zero `priest_payouts` rows. |
| Commission convention + default split | PASS | `commissions.amount 880.80` (provider earning), `percentage 0.2354` (platform take of the Rs 1152 charged, which includes the Rs 51 fee); 880.80 / 1101 = exactly 80%; `priests.commission_rate 0.8`. |

### Temple manager

| Flow | Result | Evidence |
|---|---|---|
| Create temple profile | PASS | wizard -> `temple_profiles` `approved=false`. |
| Non-approved gets the specific 409 | PASS (one gap fixed) | `POST /pujas`, `/priests`, `PATCH /pujas/:id`, `GET /schedule`: 409 `temple_not_linked`, `reason:not_approved`; GETs answer `templeLinked:false` with the same reason. `POST /darshan` answered 400 "No matched Temple" (P2-1, fixed). |
| Admin approve | PASS | quality gate refused a bare profile (400 `cause_quality_failed`, reasons listed), approved after description + address were added; the name match then links Somnath Temple. |
| Offerings list/edit | PASS | price/NRI price update 200; negative price, `maxBookingsPerSlot 0` 400. 5 standard offerings per temple present (the seed script added 0 rows: `prisma/seed.ts` already creates them). |
| Assign a priest, roster consent | FAIL then PASS | invite -> pandit sees it in `/priest/temple-invites` -> accepts -> on roster; re-invite 409 "already on your roster". **But a manager could pin ANY priest on an offering without consent** (P1-3, fixed). |
| Bookings and donations visible | PASS (one stat fixed) | bookings list and temple donations (Rs 501, receipt `DR-...`) visible. Dashboard `totalBookings` was 0 while the list showed 2 (P1-4, fixed). A temple without an approved manager is refused for donations (`temple_not_onboarded`). |
| Temple share held until proved | PASS | `upcomingInr 55.05` for the unproved booking, `payableInr 55.05` for the proved one. |
| Admin temple editor | PASS (one gap fixed) | GET flags `coordinates_missing` + `pincode_invalid`; verify at 0,0 400 with flags; bad pincode / lat 123 / unknown key / empty body 400; one PATCH can fix and verify; `standard-offerings` adds 5 then 0. A temple already verified could be moved back to 0,0 and stay bookable (P2-2, fixed). |

### Gaushala manager

| Flow | Result | Evidence |
|---|---|---|
| Profile, approval | PASS | wizard creates it unapproved; admin approval refused by the quality gate until description + address exist; `PATCH /gaushala-portal/profile` cannot set `approved`/`verified`. |
| Donations honest | PASS | donation to the approved DB profile: Rs 1001, receipt issued, visible to the manager; fake and unapproved gaushala ids 400 `gaushala_not_onboarded`; `/gaushala/plans` says "Numbered donation receipt PDF (not a tax-exemption certificate)" with "comingSoon" for unbuilt perks; `POST /gaushala/adopt` is 404 (removed); no "Adopt a Cow" string in API or web source. The public `/gaushala` list is still the five-fixture directory (`source:'fixture'` on the detail route); real approved profiles are surfaced separately. |
| Funds and disbursement | PASS | `/admin/gaushala-disbursements`: owed 1001; over-disbursement 409 `exceeds_balance`; Rs 500 recorded; duplicate UTR 409; owed 501; non-admin 403 and nothing recorded. |
| 80G claims absent | PASS | plans/list responses contain no 80G text; web copy gated on `HAS_80G_VERIFIED=false`. |

### Negative matrix

About 170 requests in the `neg` run (4-6 wrong roles + no token against every pandit/payout, temple-portal, gaushala-portal and
admin payout/disbursement/editor/KYC/link route, then bad bodies/ids as the right role): every wrong-role call was 401/403
(121 of them), and **after the fix none ran its handler**. Bad bodies and ids were 400/404 except the ones below.
`GET /payouts/balance` answers 200 for every provider role (intended).

## Bugs

| # | Sev | Bug | Repro | Status |
|---|---|---|---|---|
| P0-1 | P0 | Handlers run behind a 403/401 (admin mutations by any signed-in user). See headline. | above | FIXED + tests |
| P1-1 | P1 | Video proof accepts any URL scheme: `javascript:alert(1)`, `http://127.0.0.1/..` stored as the proof the devotee and admin see. | `POST /priest/bookings/:id/video {"videoUrl":"javascript:alert(1)"}` -> 200 | FIXED: http(s) only (`priest.ts`, `bookings.ts` PATCH proof field) + test. `javascript:` is neutralised by React 19 in `href`, but the API must not store it. Other `z.string().url()` fields (`roomUrl`, `playbackUrl`, `postedUrl`, store `imageUrl`, `websiteUrl`) have the same gap: OPEN, same one-line refine. |
| P1-2 | P1 | Payout request fails with a Prisma error body (absolute source path + SQL) whenever the lazily created `astrologer_consultations` table is absent: the failed join aborts the `requestPayout` transaction (25P02) and the next read dies. | fresh `bootstrap-fresh-db` database, verified KYC, `POST /payouts/request` -> 400 `Invalid tx.commission.findMany()...` | FIXED: probe `to_regclass` first, route no longer echoes internals (`safeErrorMessage`), + test. Prod has the table if any consultation was ever created; unverified. |
| P1-3 | P1 | A temple manager can pin any pandit (not on the roster, no consent, even an unknown id -> 500 FK error) on an offering; dispatch then auto-assigns bookings to that pandit. | `PATCH /temple-portal/pujas/:id {"assignedPriestId":"<any priest id>"}` -> 200 | FIXED: must be on the temple roster, else 409 `priest_not_on_roster` + tests. |
| P1-4 | P1 | Temple dashboard booking count only counted `confirmed`+`completed`, so it dropped to 0 as soon as a pandit accepted. | dashboard `totalBookings:0` with two bookings in `/bookings` | FIXED + test. |
| P1-5 | P1 | `PATCH /priest/profile` had no validation: `{"displayName":""}` blanked the public name; arbitrary avatar URL and types. (My own negative test erased the demo pandit's name locally.) | above | FIXED + tests. |
| P2-1 | P2 | `POST /temple-portal/darshan` answered 400 "No matched Temple" instead of the 409 `temple_not_linked`. | unapproved manager | FIXED + test. |
| P2-2 | P2 | Admin temple editor let an already-verified temple be set to 0,0 / bad pincode while staying bookable. | `PATCH /admin/temples/:id {"lat":0,"lng":0}` on a verified temple -> 200 | FIXED + test. |
| P2-3 | P2 | Non-UUID ids were 500 on `PATCH/DELETE /temple-portal/pujas/:id`, `DELETE /temple-portal/priests/:id`, `/darshan/:id`, `POST /admin/bookings/payout-requests/:id/process` (leaking a Prisma stack), `DELETE/PATCH /gaushala-portal/volunteers/:id`. | `.../not-a-uuid` | FIXED (404) + tests. `/priest/pujas/:id` etc. answer 400, not 500: left. |
| P2-4 | P2 | Receipt/commission display rounding: `grossAmount 1151.97` for a Rs 1152.00 booking (percentage stored at 4 dp). | `GET /payouts/commissions` | OPEN, cosmetic (derived from `amount/(1-percentage)`). |
| P2-5 | P2 | `PATCH /temple-portal/schedule` from a non-manager answers 400 "slug required" rather than 403 before the role is considered. | devotee token, no `?slug` | OPEN, harmless. |
| P2-6 | P2 | `POST /payouts/request` with an invalid `method` silently falls back to `upi`. | `{"method":"carrier-pigeon"}` | OPEN (answers 400 only because KYC was missing in that run). |
| P2-7 | P2 | Donation verify of an already-paid donation returns `ok:true` even with a wrong signature (idempotent replay; no state change). | repeat `/donations/verify` with `razorpay_signature:"bad"` | OPEN, by design but worth knowing. |

Local-only noise seen at API boot: `ensureSchemaInvariants: 2 statement(s) FAILED ... syntax error at or near "$"` and
the missing lazily created table above. Not investigated; the authority is `prisma migrate deploy`.

## Could not test

- Real Razorpay, Supabase, Resend: no keys by design. Donation verify skips the signature in demo-key mode
  (`rzp_test_demo`), so the production signature branch of `/donations/verify` was read, not run. If the production API
  still falls back to `rzp_test_demo` (TASKS "#205"), that branch is skipped there too.
- Creating a brand-new PANDIT profile and its admin approval (demo pandit is pre-seeded and approved); the
  `provider_kyc` row for the pandit was inserted with psql as the runbook says (demo sessions do not persist KYC).
- UI: no browser/Playwright pass and no web dev server was started. The portal pages for these roles were not
  rendered; findings above are API-level.
- Aadhaar gate was exercised through the service function, not an HTTP route (the only callers are status
  transitions in `booking.service.ts`).
- WhatsApp/email/push notifications (all channels unconfigured, silent no-ops).
