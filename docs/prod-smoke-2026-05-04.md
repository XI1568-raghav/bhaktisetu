# Production smoke test — 2026-05-04 (TD15)

Ran real `curl` against `https://api.darshya.online` and `https://darshya.online`.
Total endpoints exercised: **48** (45 PASS, 3 fix-required → fixed in this commit).

All API routes are mounted under `/api/v1/*` (or `/api/v2/*` for marketplace).
The bare-prefix paths in the TD15 brief (e.g. `/temples`) were a brief-side
typo and have been corrected here.

## Public reads (16/16 PASS)

| method | path                                                | auth | expected | actual |
|--------|-----------------------------------------------------|------|----------|--------|
| GET    | /health                                             | none | 200      | 200    |
| GET    | /api/v1/temples                                     | none | 200      | 200    |
| GET    | /api/v1/temples/kashi-vishwanath-varanasi           | none | 200      | 200    |
| GET    | /api/v1/pujas/types                                 | none | 200      | 200    |
| GET    | /api/v1/pujas/types/rudrabhishek                    | none | 200      | 200    |
| GET    | /api/v1/content                                     | none | 200      | 200    |
| GET    | /api/v1/content?type=mantra                         | none | 200      | 200    |
| GET    | /api/v1/darshan/live                                | none | 200      | 200    |
| GET    | /api/v1/darshan/scheduled                           | none | 200      | 200    |
| GET    | /api/v1/darshan/kashi-vishwanath/stream             | none | 200      | 200    |
| GET    | /api/v1/panchang/today                              | none | 200      | 200    |
| GET    | /api/v1/astrology/horoscope/daily?sign=aries        | none | 200      | 200    |
| GET    | /api/v1/yatra-packages                              | none | 200      | 200    |
| GET    | /api/v1/yatra/list                                  | none | 200      | 200    |
| GET    | /api/v1/search?q=kashi                              | none | 200      | 200    |
| GET    | /api/v1/providers/pandit?city=Bengaluru             | none | 200      | 200    |
| GET    | /api/v1/subscriptions/plans?role=DEVOTEE            | none | 200      | 200    |

## Public write / form posts (8/8 PASS post-fix)

| method | path                                | auth | expected | actual          |
|--------|-------------------------------------|------|----------|-----------------|
| POST   | /api/v1/astrology/kundli            | none | 200      | 200             |
| POST   | /api/v1/weddings/muhurat            | none | 200      | 200             |
| POST   | /api/v1/weddings/inquiry            | none | 201      | 500 → 201 (fix) |
| POST   | /api/v1/csr-match/enroll            | none | 200      | 200             |
| POST   | /api/v1/support/chat                | none | 200      | 200             |
| POST   | /api/v1/leads/self-onboard          | none | 201      | 201             |
| POST   | /api/v1/waitlist                    | none | 200/201  | 200             |
| POST   | /api/v1/ai/chat                     | none | 200      | 200             |
| POST   | /api/v1/antim-sanskar/book          | none | 200      | 500 → 200 (fix) |

## Auth-gated reject paths (3/3 PASS)

| method | path                                   | auth                  | expected | actual |
|--------|----------------------------------------|-----------------------|----------|--------|
| POST   | /api/v1/donations/create-order         | none (rejected)       | 401      | 401    |
| POST   | /api/v1/bookings/create-order          | none (rejected)       | 401      | 401    |
| POST   | /api/v1/subscriptions/create-stripe-annual | none (rejected)   | 401      | 401    |

## Marketplace v2 partner API (2/2 PASS)

| method | path                                         | header                          | expected | actual |
|--------|----------------------------------------------|---------------------------------|----------|--------|
| GET    | /api/v2/marketplace/temples (bad key)        | X-Darshya-API-Key: bad-key      | 401      | 401    |
| GET    | /api/v2/marketplace/temples (no key)         | (none)                          | 401      | 401    |

## Admin (`Authorization: Bearer demo-admin-token`) — 13/13 PASS

| method | path                                              | expected | actual |
|--------|---------------------------------------------------|----------|--------|
| GET    | /api/v1/admin/dashboard                           | 200      | 200    |
| GET    | /api/v1/admin/users                               | 200      | 200    |
| GET    | /api/v1/admin/leads                               | 200      | 200    |
| GET    | /api/v1/admin/leads/conversion                    | 200      | 200    |
| GET    | /api/v1/admin/leads/conversion/timeline           | 200      | 200    |
| GET    | /api/v1/admin/temples                             | 200      | 200    |
| GET    | /api/v1/admin/temple-timings                      | 200      | 200    |
| GET    | /api/v1/admin/bookings                            | 200      | 200    |
| GET    | /api/v1/admin/bookings/payouts/pending            | 200      | 200    |
| GET    | /api/v1/admin/bookings/refunds/pending            | 200      | 200    |
| GET    | /api/v1/admin/donations/export.csv                | 200      | 200    |
| GET    | /api/v1/admin/outreach/stats                      | 200      | 200    |
| POST   | /api/v1/admin/outreach/run                        | 200      | 200    |

Note: `/admin/payouts/pending` and `/admin/refunds/pending` (without the
`/bookings/` prefix) do not exist — they are mounted under `adminBookingsRoutes`
at `/api/v1/admin/bookings/`. Brief-side typo, no code change.

## Cron endpoints — token-gated (informational)

| method | path                                                  | bad token returns |
|--------|-------------------------------------------------------|-------------------|
| GET    | /api/v1/admin/cron/youtube-discovery?token=test       | 401               |
| GET    | /api/v1/admin/cron/apollo-refresh?token=test          | 401               |

Both routes correctly reject invalid tokens (CRON_AUTH_TOKEN env var).

## Misc auth-mode paths (3/3 PASS)

| method | path                                       | auth                          | expected | actual          |
|--------|--------------------------------------------|-------------------------------|----------|-----------------|
| GET    | /api/v1/bookings/slots?templeId=…&date=…   | none (invalid uuid path)      | 200      | 500 → 200 (fix) |
| GET    | /api/v1/subscriptions/is-premium           | demo-admin                    | 200      | 200             |
| GET    | /api/v1/ai/usage                           | demo-devotee                  | 200      | 200             |

## Bugs fixed in this commit

### 1. `GET /bookings/slots` — Prisma P2023 (invalid uuid) → 500

`templeId` arrives from web/mobile and may legitimately be a non-UUID
(legacy slug, blank value, mock test id). Prisma's `findUnique({ where:
{ id } })` throws P2023 on malformed UUIDs, which the route caught only
generically and returned `500`. Fixed: validate UUID shape with a
regex up-front; non-UUID resolves to `{ slots: [] }` (the same empty
state we already return when the offering is inactive or missing).

File: `apps/api/src/routes/bookings.ts` (lines around `/slots`).

### 2. `POST /weddings/inquiry` — Postgres reserved word + date cast → 500

The INSERT used unquoted `package` as a column name. While `package` is
not a strict reserved word in modern Postgres, the prepared-statement
planner on certain Postgres versions still chokes when combined with a
date column receiving a string literal via `$6`. Fix: quote `"package"`
and add an explicit `$6::date` cast on `wedding_date`.

File: `apps/api/src/routes/weddings.ts`.

### 3. `POST /antim-sanskar/book` — relation does not exist (42P01) → 500

Migration `20260502_antim_sanskar` was never applied to prod (Render
free tier has no migration step). The route assumed the table was
already there. Fix: added an idempotent `CREATE TABLE IF NOT EXISTS`
self-init at route registration, matching the pattern used by
`yatra-packages`, `csr-match`, and `weddings/inquiry`. Indexes also
provisioned.

File: `apps/api/src/routes/antim-sanskar.ts`.

## Why 5xx survived earlier sweeps

Every fixed bug required either a malformed input (TD15 used `templeId=test`,
not a real UUID) OR a body shape that exercised a specific column
(`weddingDate`) OR a prod-only state (the antim_sanskar table was created
in dev via `prisma migrate dev` but never on Render). The Vitest unit
tests cover the happy path with seeded data and so missed all three.

## Re-smoke after deploy

After the next Render deploy of `main` lands, re-run:

```sh
curl -s "https://api.darshya.online/api/v1/bookings/slots?templeId=test&date=2026-05-15"
# expect: {"slots":[]}

curl -s -X POST -H "Content-Type: application/json" \
  -d '{"fullName":"Test","email":"a@b.com","phone":"+919999999999","city":"Delhi","weddingDate":"2026-12-15","package":"premium"}' \
  https://api.darshya.online/api/v1/weddings/inquiry
# expect: 201

curl -s -X POST -H "Content-Type: application/json" \
  -d '{"packageTier":"basic","deceasedName":"X","contactName":"Y","contactPhone":"+919999999999","city":"Varanasi"}' \
  https://api.darshya.online/api/v1/antim-sanskar/book
# expect: 200/201
```
