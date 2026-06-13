# Bhaktisetu API Documentation — OpenAPI 3.1 Spec

> Full /api/v1 endpoint inventory. Foundation for developer documentation site + B2B integrations + AI tooling.

## Base URL

- Production: `https://api.darshya.online`
- Staging: `https://api-staging.darshya.online`

## Authentication

All endpoints (unless explicitly public) require:
- Header: `Authorization: Bearer {access_token}`
- OR Cookie: `session={token}`

Public endpoints (no auth required):
- `/health`
- `/api/v1/pujas/types`
- `/api/v1/temples` (read-only)
- `/api/v1/waitlist`

## Endpoint inventory

### Authentication (4 endpoints)

```yaml
POST /api/v1/auth/login
  body: { email, password }
  response: { accessToken, refreshToken, user }

POST /api/v1/auth/signup
  body: { email, password, name, phone }
  response: { user, accessToken }

POST /api/v1/auth/refresh
  body: { refreshToken }
  response: { accessToken, refreshToken }

POST /api/v1/auth/logout
  body: { accessToken }
  response: { ok: true }
```

### User Profile (5 endpoints)

```yaml
GET /api/v1/me
  response: { user, profile, subscriptions, wallet }

PATCH /api/v1/me
  body: { name?, phone?, address? }
  response: { user }

GET /api/v1/me/bookings
  query: { limit, offset, status }
  response: { bookings, total }

GET /api/v1/me/wallet
  response: { balanceInr, ledger }

GET /api/v1/me/notification-preferences
  response: { daily_aarti, festivals, marketing, quiet_hours }
```

### Pujas (6 endpoints)

```yaml
GET /api/v1/pujas/types
  public
  response: [{ id, name, slug, priceInr, ... }]

GET /api/v1/pujas/:id
  response: { puja, pandits, reviews }

POST /api/v1/pujas/:id/book
  auth required
  body: { templeId, panditId, scheduledAt, devotionalIntent }
  response: { bookingId, totalInr, razorpayOrderId }

GET /api/v1/pujas/popular
  public
  response: [{ id, name, bookingCount }]

GET /api/v1/pujas/by-deity
  query: { deity, limit }
  response: [{ id, name, deity }]

POST /api/v1/pujas/:id/inquiry
  body: { customerName, phone, queries }
  response: { ok: true, leadId }
```

### Temples (4 endpoints)

```yaml
GET /api/v1/temples
  public
  query: { city, deity, verified, limit, offset }
  response: { temples, total }

GET /api/v1/temples/:id
  public
  response: { temple, pandits, pujas }

POST /api/v1/temples/:id/follow
  auth required
  response: { ok: true }

GET /api/v1/temples/:id/pujas
  response: [{ pujaId, priceInr, available }]
```

### Bookings (4 endpoints)

```yaml
GET /api/v1/bookings/:id
  auth required
  response: { booking, pandit, temple, payment }

POST /api/v1/bookings/:id/confirm
  body: { razorpayPaymentId, razorpaySignature }
  response: { booking, status }

POST /api/v1/bookings/:id/cancel
  body: { reason? }
  response: { booking, refundEligible, refundInr }

POST /api/v1/bookings/:id/dispute
  body: { reason, details }
  response: { disputeId, status: 'open' }
```

### Pandits (3 endpoints)

```yaml
GET /api/v1/pandits
  public
  query: { specialization, deity, city, limit }
  response: { pandits, total }

GET /api/v1/pandits/:id
  public
  response: { pandit, reviews, completedPujas }

POST /api/v1/pandits/apply
  body: { name, phone, experience, aadhaarLast4, panLast4, ... }
  response: { applicationId, status: 'pending' }
```

### Astrology (4 endpoints)

```yaml
POST /api/v1/astrology/kundli
  body: { name, dob, time, city }
  response: { kundli, navamsa, dasha, predictions }

POST /api/v1/astrology/match
  body: { bride: {...}, groom: {...} }
  response: { compatibility_score, gunamilan, recommendations }

GET /api/v1/astrology/panchang
  public
  query: { city, date }
  response: { tithi, nakshatra, yoga, karana, ... }

POST /api/v1/astrology/consultation
  body: { astrologerId, minutes, scheduledAt, language }
  response: { consultationId, jitsiUrl, paymentLink }
```

### Live Darshan (3 endpoints)

```yaml
GET /api/v1/darshan/live
  public
  response: [{ templeId, streamUrl, viewerCount }]

GET /api/v1/darshan/:templeId/schedule
  public
  response: [{ slot, deity, startTime }]

POST /api/v1/darshan/:templeId/notify
  auth required
  body: { slot, channel: 'wa'|'email' }
  response: { ok: true }
```

### Subscription + Wallet (4 endpoints)

```yaml
POST /api/v1/subscriptions
  body: { productType, productId?, monthlyInr }
  response: { subscription, razorpayPaymentLink }

DELETE /api/v1/subscriptions/:id
  body: { reason }
  response: { ok: true, refundProRated }

GET /api/v1/wallet/balance
  response: { balanceInr, recentLedger }

POST /api/v1/wallet/redeem
  body: { bookingId, amountInr }
  response: { newBalance, applied }
```

### Referrals (2 endpoints — per R-Q2-M-011)

```yaml
GET /api/v1/referrals/me
  response: { code, pendingCount, claimedCount, creditsEarnedInr }

POST /api/v1/referrals/claim
  body: { refCode, bookingId }
  response: { ok, creditedInr }
```

### Public + Misc (3 endpoints)

```yaml
GET /api/v1/health
  public
  response: { status: 'ok', version, uptime }

GET /api/v1/feed.xml
  public
  response: RSS 2.0 feed

GET /api/v1/public/agents/feed
  public
  response: [{ agent, lastRun, reportUrl }]
```

### Privacy (DPDP per R-Q2-L-003) — 7 endpoints

```yaml
GET /api/v1/me/privacy/export
PATCH /api/v1/me/privacy/correct
DELETE /api/v1/me/privacy/erase
POST /api/v1/me/privacy/erasure/withdraw
GET /api/v1/me/privacy/consent
PATCH /api/v1/me/privacy/consent
GET /api/v1/me/privacy/log
```

### Admin (10 endpoints)

```yaml
GET /api/v1/admin/users
GET /api/v1/admin/bookings
GET /api/v1/admin/pandits
PATCH /api/v1/admin/pandits/:id/verify
GET /api/v1/admin/consultations/all
GET /api/v1/admin/dsar/pending
GET /api/v1/admin/metrics/dashboard
GET /api/v1/admin/metrics/funnel
GET /api/v1/admin/metrics/investor
GET /api/v1/admin/spend
```

## Rate Limits (per R-Q2-E-013)

| Route | Limit |
|---|---|
| /auth/login | 5/min/IP |
| /auth/signup | 3/min/IP |
| /waitlist | 5/hour/IP |
| /booking/create | 20/hour/user |
| /ai-pandit/ask | tier-gated |
| All other | 100/min default |

## Error responses

Standard format:
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Try in 60s.",
  "retryAfter": 60
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request (validation failed)
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (role/permission denied)
- 404: Not found
- 409: Conflict (e.g., already exists)
- 429: Rate limited
- 500: Server error

## Implementation

Generate OpenAPI 3.1 YAML spec from Fastify route definitions via `@fastify/swagger`. Serve at `/api/v1/docs` (Swagger UI). Auto-update on every API release. Foundation for B2B integration partner documentation.

## Public docs site

`https://docs.bhaktisetu.com` (future) — searchable API docs + code examples + authentication guide + webhook documentation.
