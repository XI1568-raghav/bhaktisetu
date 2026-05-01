# Launch Readiness Audit — Darshya — 2026-05-01

Scope: pre-scale audit before onboarding 100 providers per role + 1000 devotees. Method: read-only review of `apps/api/src/**`, `apps/web/app/**`, `apps/mobile/**`, `prisma/schema.prisma`, build logs, legal pages. No code modified.

Working tree: branch `rebrand/darshya`, base commit `5b37453`. Categories below are ordered top-down by ship-blocking weight.

---

## Critical (block launch)

### C1. Mobile Android EAS build is broken

- File: `apps/mobile/build-log.txt`, `apps/mobile/log3.txt` (last error 2026-04-28T12:41:43Z, build `1fb89532`).
- What's wrong: `EAGER_BUNDLE` phase fails on `apps/mobile/app/(admin)/reports.tsx` with `Unable to resolve module @babel/runtime/helpers/interopRequireDefault`. Same error on multiple admin screens, then bundle aborts → no APK / AAB produced.
- Fix: add `@babel/runtime` as a direct dep in `apps/mobile/package.json` (pnpm hoists it to the workspace root but Metro inside an EAS sandbox needs it locally). Re-run `eas build --profile preview --platform android`.

### C2. Booking creation accepts past-dated `scheduledDate`

- File: `apps/api/src/services/booking.service.ts:144`, `apps/api/src/routes/bookings.ts:9-30`.
- What's wrong: `createBooking` parses `scheduledDate` into a `Date` and writes the booking, but never compares against `now()`. Only `/bookings/availability` (`bookings.ts:151`) rejects past dates; the actual `POST /bookings/book` does not. A devotee can book for yesterday and pay → confirmed booking → priest payout obligation for an event that already happened.
- Fix: in `createBooking`, after building `scheduledDate`, throw if `scheduledDate < startOfTodayInTZ('Asia/Kolkata')`. Same check in `updateBookingStatus` for any reschedule path.

### C3. Same priest can be double-booked at the same slot

- File: `apps/api/src/services/booking.service.ts:143-158`, `priest.service.ts:223-258` (`acceptBooking`).
- What's wrong: slot capacity is enforced per-offering (`maxBookingsPerSlot`), not per-priest. `acceptBooking` does not check whether the priest already has another booking at the same `scheduledDate` + `scheduledTimeSlot`. With 100 priests onboarding, the first priest who accepts everything in their queue will end up with overlapping slots.
- Fix: in `acceptBooking`, before write, run `prisma.pujaBooking.count({ where: { priestId, scheduledDate, scheduledTimeSlot, status: { notIn: ['cancelled','refunded'] }, NOT: { id: bookingId } } })`. If > 0, throw conflict.

### C4. Video proof gating is cosmetic — payouts not actually blocked

- File: `apps/api/src/services/payment.service.ts:539-597` (`createPriestPayout`), `apps/api/src/services/booking.service.ts:70-80` (`VALID_TRANSITIONS`).
- What's wrong: `createPriestPayout` requires status `video_uploaded` or `delivered`, which is good — but the method is **not invoked from any route** (grep shows zero callers). And `markPayoutPaid` (line 605) is also unwired. So the priest video → payout pipeline exists in code but cannot actually be triggered. Nothing prevents an admin (or a future automation) from manually inserting a `PriestPayout` row directly. Worse: KYC-verified gating is missing from `createPriestPayout` entirely; it does not check `provider_kyc.verified` or `priest.aadhaarVerified` before creating the payout row.
- Fix: (a) wire an `POST /admin/payouts` route that calls `createPriestPayout`; (b) inside `createPriestPayout`, fail unless `provider_kyc.verified = true` for the priest's user id; (c) add a DB CHECK constraint on `priest_payouts` linking to `puja_bookings` with `status IN ('video_uploaded','delivered')` so a manual SQL insert can't bypass it.

### C5. Admin approval queue exists but most admin CRUD is a stub

- File: `apps/api/src/routes/admin.ts:111-229`.
- What's wrong: `/admin/temples` (GET/POST/PATCH/DELETE), `/admin/priests` (all), `/admin/pujas` (all), `/admin/content` (all), `/admin/bookings`, `/admin/payments`, `/admin/users` POST, `/admin/users/:id` DELETE all return hard-coded `[]` or echo the body — they do **not** read or write the database. A real provider rejection / temple verification flow does not exist on the API.
- Fix: implement against Prisma. At minimum for launch: `/admin/priests` PATCH (verify/suspend), `/admin/temples` PATCH (status flip to active), `/admin/users/:id` PATCH-blocked, `/admin/pending-approvals` (already real, line 103) → wire to real PATCH endpoints.

### C6. `User.blocked` field does not exist; blocked-state cannot be enforced

- File: `apps/api/prisma/schema.prisma:144-192` (User model), `apps/api/src/middlewares/auth.ts` (no `blocked` check anywhere).
- What's wrong: admin schema (`adminRoutes` line 18-25) accepts `blocked: boolean` in the update payload, but the User model has no such column. The `authenticateUser` middleware never checks any blocked flag. There is no way to actually shut a user out after onboarding error or fraud.
- Fix: add `blocked Boolean @default(false)` + migration. In `authenticateUser`, after loading `dbUser`, if `dbUser.blocked` reply 403 + clear session. Same check in `requireRole`.

### C7. Razorpay is in test/demo mode by default, signature accepted as `rzp_test_demo`

- File: `apps/api/src/services/payment.service.ts:96-111`.
- What's wrong: when `RAZORPAY_KEY_ID` is missing or equals literal `'rzp_test_demo'`, the service swaps in a `Proxy` Razorpay client that returns fake `order_demo_*` / `rfnd_demo_*` ids. There is no startup check that prod env has real keys. If the prod env var leaks default value or is unset on Render, the API will silently issue demo orders and accept any "signature" because no real payment is created. Combined with the demo-pay route (`demo-pay.ts`) gated only on `ENABLE_DEMO_PAY`, a misconfigured prod Render service can take "bookings" for free.
- Fix: at `bootstrap()` in `server.ts`, when `NODE_ENV === 'production'`, fail-fast unless `RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_WEBHOOK_SECRET` are all real (not empty, not `rzp_test_demo`). Also fail-fast unless `ALLOW_DEMO_TOKENS` and `ENABLE_DEMO_PAY` are unset/false.

### C8. Booking confirmation / cancellation emails never sent

- File: `apps/api/src/lib/email.ts:94-119` (`bookingConfirmationEmail` template); grep of all `apps/api/src/**` shows it is imported nowhere.
- What's wrong: only the puja tax invoice (`payment.service.ts:36`) and donation receipt are emailed. After payment, the devotee gets an attached PDF invoice but not a friendly "your puja is booked" email. After cancellation no email is sent at all. After priest assignment / video upload / payout, also nothing. Devotees on Razorpay redirect-back will assume the booking failed.
- Fix: in `payment.service.verifyPayment` / webhook `payment.captured`, after `pujaBooking.update({status:'confirmed'})`, call `sendEmail(bookingConfirmationEmail({...}))`. Add cancellation, priest-assigned, video-ready templates and wire from `booking.service.updateBookingStatus`.

### C9. Demo password `demo123` accepted in production if `ALLOW_DEMO_TOKENS=true`

- File: `apps/api/src/routes/auth.ts:73-83`, `auth.ts:454-471`.
- What's wrong: `DEMO_ACCOUNTS` registry hardcodes `password: 'demo123'` and is checked **before** any DB lookup in `/auth/login`. The hardcoded admin (`admin@demo.com / demo123`) carries the `admin` role. In dev this is fine. In prod, `auth.ts` only gates the **token** path on `ALLOW_DEMO_TOKENS`, not the **login** path — `/auth/login` will mint a demo session for `admin@demo.com / demo123` regardless of env. The matching middleware (`middlewares/auth.ts:69`) refuses the resulting `demo-admin-token` in prod, so the session is unusable, but the success response still leaks the existence and shape of demo accounts.
- Fix: in `/auth/login`, refuse the `DEMO_ACCOUNTS` short-circuit when `NODE_ENV === 'production'` unless `ALLOW_DEMO_TOKENS === 'true'` (mirror the middleware gate). Better: rotate `demo123` to a random per-deploy secret stored in env, or remove demo accounts from the prod build entirely.

---

## High (fix in 1 week)

### H1. `/payments/verify` not behind tighter rate limit

- File: `apps/api/src/routes/payments.ts:62-99`.
- What's wrong: only the global 100/min limit applies. An attacker who steals/guesses an order id can brute-force the signature at 100/min/IP × N IPs. SHA-256 makes brute force infeasible in practice, but logs will fill and DB will churn.
- Fix: add `{ config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }` to the `/verify` route (mirror the `aiChatRateLimit` pattern used in `routes/ai.ts:9`).

### H2. Razorpay dispute webhook events not handled

- File: `apps/api/src/services/payment.service.ts:367-457` (`processWebhookEvent`).
- What's wrong: switch handles `payment.captured`, `payment.failed`, `refund.created`. Missing `payment.dispute.created`, `payment.dispute.lost`, `payment.dispute.won`. With 1000 devotees, statistically there will be chargebacks; without a handler, disputes silently 200 and the booking stays `confirmed` while we lose the money.
- Fix: add a `payment.dispute.*` case that flips `Payment.status` to `disputed`, freezes the matching `PriestPayout` (`status='on_hold'`), and notifies admins.

### H3. Payment signature compare in legacy webhook + verify path is not timing-safe

- File: `apps/api/src/services/payment.service.ts:319` (`handleWebhook`), `payment.service.ts:256` (`verifyPayment`).
- What's wrong: `expectedSignature !== signature` uses non-constant-time compare. The raw-body path (`handleWebhookRaw`, line 348) correctly uses `crypto.timingSafeEqual`. Since `RAZORPAY_VERIFY_RAW` defaults to `true` the legacy path is dormant in prod, but `verifyPayment` (the client-side checkout return) still uses string `!==`.
- Fix: replace both `!==` checks with a `timingSafeEqual` over equal-length Buffers. Force-mismatch when lengths differ.

### H4. KYC submission has no admin verification UI / route

- File: `apps/api/src/routes/provider-kyc.ts` exposes `GET` + `POST` for the provider; no route flips `verified=true`.
- What's wrong: the `verified` column exists, but only an out-of-band SQL update can set it. No `POST /admin/provider-kyc/:userId/verify` exists. With 100 providers per role onboarding, there is no operational way to clear the queue.
- Fix: add admin endpoints to `routes/admin.ts`: list pending KYC (`GET /admin/kyc?verified=false`), approve (`POST /admin/kyc/:userId/verify`), reject (`POST /admin/kyc/:userId/reject` with reason). Send `providerApprovedEmail` / `providerRejectedEmail` (templates already exist in `email.ts:121-170`).

### H5. Doc upload to R2 has no content-type allowlist or size cap

- File: `apps/api/src/routes/media.ts:17-54`.
- What's wrong: `contentType` and `ext` come straight from the client and are signed into the presigned PUT. Attacker can upload `.exe`, `.html` (XSS via R2 public URL), or 10 GB blobs. No max size is encoded into the presigned URL.
- Fix: validate `contentType` against an allowlist per `kind` (puja-proof: `video/mp4` only; profile-photo: `image/jpeg|image/png|image/webp`; KYC docs: `application/pdf|image/jpeg|image/png`). Use the S3 SigV4 `Content-Length-Range` policy condition or set explicit `ContentLength` on the presign so > 50 MB / kind is refused.

### H6. KYC route uses `prisma.$queryRawUnsafe` / `$executeRawUnsafe`

- File: `apps/api/src/routes/provider-kyc.ts:71-78, 125-149`.
- What's wrong: comment says "Prisma client DLL is locked on Windows during dev". Parameterised values are passed safely, but `executeRawUnsafe` skips Prisma's escape; one stray template-literal interpolation in future edits = SQL injection. Also `provider_kyc` table is not in the Prisma schema — schema drift.
- Fix: regenerate Prisma client on Linux deploy, add `model ProviderKyc` to `schema.prisma`, swap to typed `prisma.providerKyc.upsert`. The unsafe variants stay only for genuinely dynamic identifiers, never for user data.

### H7. CORS allows `credentials: true` with potentially permissive origin list

- File: `apps/api/src/server.ts:78-81`.
- What's wrong: `cors` is registered with `credentials: true` and origins from `CORS_ORIGIN`. If the env var contains an entry like `https://*.darshya.online` or accidentally `*`, the combination is exploitable. Code refuses to start in prod without `CORS_ORIGIN` (good), but does not reject wildcards or `null`.
- Fix: at startup, after parsing `corsOrigins`, refuse any entry that contains `*` or matches `/^null$/i` or is non-https in prod.

### H8. Email signup creates accounts without confirming the email

- File: `apps/api/src/routes/auth.ts:551-596`.
- What's wrong: `supabase.auth.signUp({email, password})` returns a session immediately if Supabase email confirmation is disabled; even when enabled, our handler returns `201` with whatever Supabase gave back without calling `signUp({ ..., options: { emailRedirectTo } })`. Result: arbitrary email entered = active account, no verification step. Spammers can sign up as `pandit` role and pollute the approval queue.
- Fix: enable Supabase email confirmation, pass `emailRedirectTo: 'https://darshya.online/auth/callback'`, and refuse to mint a session in our response unless `authData.session` is non-null (forcing the user through the email link).

### H9. AI chat `/chat` accepts unauthenticated traffic at 20/min/IP

- File: `apps/api/src/routes/ai.ts:9-37`.
- What's wrong: anonymous calls intentionally allowed. 20/min × 100 abusive IPs = 2000 Groq calls/min. Free Groq tier will rate-limit; paid tier will burn quota. There is no captcha or daily anonymous cap.
- Fix: tighten anon limit to `5/min` per IP and `50/day` per IP via Redis counter; require auth for messages > 500 chars or after the 5th anonymous turn.

### H10. Refund route ignores partial refunds + 24h cancellation tie-in

- File: `apps/api/src/services/payment.service.ts:465-533`.
- What's wrong: `processRefund` always refunds the full amount and always flips booking to `'refunded'`. No partial-refund support. No business-rule check that booking is in a refund-eligible state — admin can refund a `delivered` booking with a video already delivered.
- Fix: accept optional `amount` and `reason`, validate against `booking.priceAmount`, gate by status (`pending_payment`, `confirmed`, `priest_assigned`, `cancelled` only), and write to `Payment.refundAmount` cumulatively.

---

## Medium (fix in 30 days)

### M1. No cookie consent banner

- File: `apps/web/app/layout.tsx` — no consent component; grep across `apps/web` finds zero matches for `CookieBanner|ConsentBanner|cookieConsent`.
- What's wrong: PostHog + Cloudflare Web Analytics + Sentry browser SDK fire on first paint regardless of user choice. EU + India DPDP both require explicit consent for non-essential cookies/analytics.
- Fix: add a `components/ConsentBanner.tsx` reading from `localStorage.darshya_consent`. Defer `initSentryBrowser()` and PostHog `posthog.init()` until consent. Add per-region default (EU: opt-in, India: opt-out OK pending DPDP rules clarification).

### M2. Privacy / Terms pages do not name DPDP or GDPR

- File: `apps/web/app/privacy/page.tsx` (293 lines), `apps/web/app/terms/page.tsx` (327 lines).
- What's wrong: page exists with a "right to" section (privacy line 218) but does not explicitly cite DPDP Act 2023 (India) or GDPR (EU), no DPO contact, no data retention period, no cross-border transfer disclosure (Supabase EU + Render US + Cloudflare anycast).
- Fix: add explicit DPDP + GDPR sections, name the data controller (Darshya / Sunil Kumar / Packer Speed proprietorship), grievance officer email, retention schedule (e.g. 7 years for tax invoices, 30 days for chat after deletion).

### M3. Demo-pay endpoint `ENABLE_DEMO_PAY` is per-env, not per-user

- File: `apps/api/src/routes/demo-pay.ts:34-37`.
- What's wrong: a single env var flips on a free booking flow for everyone. A demo for a specific investor turns on free bookings for the world. Per-user rate limit (10 per 10 min) is the only guard.
- Fix: gate on user role (only `ADMIN` or an `INVESTOR_DEMO` flag on `User`), or restrict by an allowlist of user emails injected via env.

### M4. Booking confirmation race on duplicate webhook + verify

- File: `payment.service.ts:288-295` (verify) + `payment.service.ts:388-395` (webhook).
- What's wrong: both paths flip `pending_payment → confirmed` and call `writePujaCommissionOnConfirm` + `sendPujaBookingInvoice`. The commission insert is idempotent (findFirst guard). The invoice email is **not** — two emails will land if Razorpay's webhook arrives during the verify call.
- Fix: gate `sendPujaBookingInvoice` on a one-shot DB column (`Payment.invoiceEmailedAt`) updated atomically.

### M5. `User` upsert during OTP verify wipes `email` on subsequent logins

- File: `apps/api/src/routes/auth.ts:240-258`.
- What's wrong: actually it doesn't (`update: {}` is empty). But the `create` path sets `email: supabaseUser?.email || null`, while later Supabase OTP returns no email — fine. Bigger issue: phone is the upsert key, so if a returning user changed their phone in Supabase but not in DB, they'll create a duplicate row.
- Fix: prefer upsert by Supabase auth user id (already used in `signupHandler`), not phone.

### M6. `Payment.gatewayOrderId` not unique-indexed

- File: `apps/api/prisma/schema.prisma` (search "Payment").
- What's wrong: `findFirst({where:{gatewayOrderId}})` is used hot-path in `verifyPayment` and webhook. Without a unique index this is a seq scan once table grows.
- Fix: add `@unique` or at least `@@index([gatewayOrderId])` on Payment.

### M7. SEO sitemap fetches API at build time with 8s timeout, falls back to static

- File: `apps/web/app/sitemap.ts:11-25`.
- What's wrong: Render free tier cold-start is 30-50s. If sitemap rebuilds during a cold start, the 8s `AbortSignal.timeout` returns empty arrays → only 27 static URLs in sitemap.xml until next revalidate. Search engines may de-index dynamic temple/puja pages.
- Fix: bump timeout to 45s; also set Next ISR `revalidate: 21600` (6h) so failures aren't permanent until next deploy. Alternative: ping `/health` first to wake Render before the slug fetch.

### M8. `User.role` referenced but does not exist

- File: `apps/api/src/routes/auth.ts:506, 755` use `(user as any).role`.
- What's wrong: User model has no `role` column (roles live in `UserRoleAssignment`). The `as any` masks the bug; clients always see `'devotee'` from the `||` fallback. Provider portals will route incorrectly for newly-signed-up pandits.
- Fix: replace with a `prisma.userRoleAssignment.findFirst` lookup or include in the existing select; return the first non-DEVOTEE role.

### M9. No Resend bounce / complaint webhook

- File: `apps/api/src/lib/email.ts` — no webhook handler in `apps/api/src/routes`.
- What's wrong: bounced invoices and donation receipts vanish silently. Resend reputation drops over time.
- Fix: add `POST /api/v1/webhooks/resend` (Resend signing secret), mark `User.emailBounceCount`, suppress further sends after 3 hard bounces.

### M10. Mobile app still under `@poojly/*` package names + Expo SDK 52

- File: `apps/mobile/package.json:2, 30-37`.
- What's wrong: rebrand left workspace name as `@poojly/mobile` etc. (per CLAUDE.md this is intentional for storage compat), but Expo SDK 52 reaches EOL ~Q3 2026; build will fail without an upgrade well before App Store review.
- Fix: schedule SDK 52 → 53 upgrade post-launch.

### M11. Razorpay test-mode currency is INR-hardcoded for demo path

- File: `apps/api/src/routes/donations.ts:99-105, 122` (`currency: 'INR'`); `booking.service.ts:225` (`user.isNri ? 'USD' : 'INR'`).
- What's wrong: bookings split currency on `user.isNri`, but donations are always INR. NRI Stripe path is documented in support copy (`routes/support.ts:142, 203`) but no Stripe code exists anywhere in `apps/api`. NRI users currently can only donate in INR via Razorpay.
- Fix: implement Stripe payment intents for `currency: 'USD'` paths, or update marketing copy to remove the Stripe / 40-country claim until shipped.

---

## Low (post-PMF)

### L1. Sentry traces sample 5%; no error budget defined

- File: `apps/api/src/lib/sentry.ts:18`.
- What's wrong: 5% trace sampling on free tier is fine, but no SLI/SLO documented. Define error budget (e.g. 99% successful payment verifies/month) to know when to halt feature work.

### L2. Booking number RNG uses `Math.random` with 5 attempt retry

- File: `apps/api/src/services/booking.service.ts:95-106, 182-195`.
- What's wrong: 5-char A-Z0-9 = 60M space. At 1000 bookings collisions are ~0%. Fine. But `Math.random` not crypto — no security impact since the booking number is not a secret.
- Fix: switch to `crypto.randomBytes`. Optional.

### L3. `priest.commissionRate` field unused

- File: `apps/api/prisma/schema.prisma` (Priest model), `booking.service.ts:175-179` hardcodes 30/70 split.
- What's wrong: PRD says 20-40% per temple configurable. Code ignores `priest.commissionRate` and `temple.commissionRate` if those exist.
- Fix: read from offering → temple → priest with sensible defaults.

### L4. Panchang cache TTL of 6h is generous; festivals 1h

- File: `apps/api/src/lib/cache.ts:125-132`.
- What's wrong: panchang for a fixed calendar day is immutable, could be 24h.
- Fix: bump `PANCHANG_DAY` to 24h; trim `FESTIVALS` to 12h.

### L5. Render free tier cold-start affects first booking

- Operational, no file.
- What's wrong: per CLAUDE.md API is on Render free tier (no cron), 30-50s cold start. First user of the day on `/api/v1/bookings/availability` sees a hang. Lighthouse score drops.
- Fix: free Cloudflare cron at `/health` every 10 min, or move to Render's $7/mo paid tier post-PMF.

### L6. `User` lacks `phoneVerified` flag

- File: `apps/api/prisma/schema.prisma` User model.
- What's wrong: `verifyOtp` upserts a user; `signup` may create a user with an unverified phone. There's no boolean separating the two.
- Fix: add `phoneVerifiedAt DateTime?`. Block payouts on null.

### L7. AdminEmails allowlist case-sensitivity reasonable but not unicode-safe

- File: `apps/api/src/middlewares/auth.ts:190-193, 267-269`.
- What's wrong: `.toLowerCase()` only; an email with full-width characters could bypass. Edge case.
- Fix: normalise via `email.normalize('NFKC').toLowerCase()`.

### L8. No idempotency key on `/payments/create-order`

- File: `apps/api/src/routes/payments.ts:26-59`.
- What's wrong: route avoids duplicate orders by checking for existing initiated/authorized payment (good), but there's no `Idempotency-Key` header support that Razorpay-style clients expect.
- Fix: accept optional `Idempotency-Key`, store in `Payment.metadata`, replay-safe.

---

## Summary

- **Critical**: 9 — block launch. Mobile build, past-date bookings, double-booking, video-proof gate, admin CRUD stubs, blocked-user enforcement, Razorpay demo fallback in prod, missing booking emails, demo password in prod login.
- **High**: 10 — fix in 1 week.
- **Medium**: 11 — fix in 30 days.
- **Low**: 8 — post-PMF.

Total: 38 items.

Audit base commit: `5b37453`. Branch: `rebrand/darshya`.
