# Local end-to-end test stack (free, no third-party calls)

How to rebuild the stack used for the 2026-10 role-by-role testing. Contains no secrets.
Never point this at production: `apps/api/.env` may point at the production database, so
always pass explicit local values and never read or edit that file.

## Postgres
- Postgres 17 + `pgvector` (Homebrew on macOS: `brew install postgresql@17 pgvector`; Linux: the `postgresql-17` + `postgresql-17-pgvector` packages).
- `initdb` into a scratch directory with a UTF-8 locale (`LC_ALL=en_US.UTF-8`); start on port `55432`;
  create role `darshya` and database `darshya_utf8` (UTF8). embedded-postgres does NOT work: it lacks pgvector.
- Local URL shape: `postgresql://darshya:<pw>@127.0.0.1:55432/darshya_utf8`.

## Schema and seed
```
cd apps/api
node scripts/bootstrap-fresh-db.mjs --yes --env-file <file containing DATABASE_URL and DIRECT_URL (local only)>
DATABASE_URL=<local> DIRECT_URL=<local> pnpm exec tsx prisma/seed.ts
DATABASE_URL=<local> DIRECT_URL=<local> pnpm exec tsx scripts/seed-demo-users.ts
```

## API (port 4000)
The API refuses to boot with empty Razorpay values, and must not see real third-party keys.
Run with these set explicitly (demo values are fine):
```
export PORT=4000 NODE_ENV=development \
  DATABASE_URL=<local> DIRECT_URL=<local> \
  RAZORPAY_KEY_ID=rzp_test_demo RAZORPAY_KEY_SECRET=demo RAZORPAY_WEBHOOK_SECRET=demo \
  SUPABASE_URL=http://127.0.0.1:1 SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x SUPABASE_JWT_SECRET= \
  RESEND_API_KEY= GROQ_API_KEY= ANTHROPIC_API_KEY= WHATSAPP_TOKEN= WHATSAPP_PHONE_ID= VAPID_PUBLIC_KEY= VAPID_PRIVATE_KEY= SMTP_HOST=
cd apps/api && pnpm exec tsx src/server.ts
```
Web: `cd apps/web && pnpm exec next dev --turbopack -p 3000` (webpack dev serves stale chunks).

## Logging in as a role
Bearer tokens `demo-<handle>-token` work on the local API when `NODE_ENV` is not production:
handles `devotee`, `pandit`, `store`, `astro`, `wellness`, `gaushala`, `temple`, `admin`
(`astro` maps to astro@demo.com; `astrologer` falls back to devotee). A demo role has no profile
until you create it through the role's portal route; approve it as admin with
`PATCH /api/v1/admin/users/:userId {"approved":true}`. Demo sessions do not persist KYC: insert a
`provider_kyc` row with psql (127.0.0.1:55432 only), then `PATCH /api/v1/admin/bookings/provider-kyc/:userId {"action":"verify"}`.

## Confirming a payment locally
Booking/wellness/consultation/donation verify endpoints accept `razorpay_signature` = HMAC-SHA256 hex of
`<orderId>|<paymentId>` keyed with `demo` (non-production only).

## Gotchas
- zsh: `GID` is a reserved variable; do not use it as a name.
- Node 26: web vitest needs `NODE_OPTIONS=--no-experimental-webstorage`.
- Homebrew tools may be off the agent PATH: prefix `PATH=/opt/homebrew/bin:$PATH`.
- Booking start gate: a pandit can start only within 2h of the slot; to test, move the booking's `scheduled_date`/`scheduled_time_slot` in the LOCAL db.
- Earnings are held (`upcomingInr`) until the puja has video proof; wellness/astrologer likewise until held/completed.
