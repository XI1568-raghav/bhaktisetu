# B2B Temple SaaS API v1 — Spec (extends b2b-whitelabel-v1)

> **Roadmap item**: R-Q3-E-007 (P0) · **Authored**: 2026-06-12 · **Extends**: docs/specs/b2b-whitelabel-v1.md (R-Q4-P-006)
>
> **Goal**: spec the REST API layer that backend-only partners (NOT embedded-widget partners) need to integrate Bhaktisetu temple supply into their own apps.

## Differentiation from b2b-whitelabel

- **b2b-whitelabel** (P-006): SDK + iframe widget. Partner's app embeds Bhaktisetu UI.
- **b2b-temple-saas-api** (this spec): pure REST API + webhook. Partner uses OWN UI, calls Bhaktisetu API for data + booking.

Use cases:
- Astrology app wants programmatic puja-booking after astro consultation
- NRI fintech (Niyo) wants devotional-services tab w/ their own branding/UI
- Matchmaking app wants pre-wedding pandit booking via API
- Devotional content platform wants ML-recommendation + actual booking conversion

## API surface

12 endpoints under `/api/v2/b2b/*` (v2 namespace to distinguish from internal v1).

### Auth

All endpoints require `Authorization: Bearer pk_b2b_xxx` (partner API key). Rate limits per partner tier:
- Starter: 100 req/min, 5K req/day
- Growth: 500 req/min, 50K req/day
- Strategic: 5K req/min, unlimited daily

### Endpoints

- `GET /api/v2/b2b/temples` — list temples available to partner (filtered by MoU)
- `GET /api/v2/b2b/temples/:slug` — temple detail
- `GET /api/v2/b2b/puja-types` — catalog of available pujas
- `POST /api/v2/b2b/bookings` — create booking on user's behalf
- `GET /api/v2/b2b/bookings/:id` — booking status
- `PATCH /api/v2/b2b/bookings/:id/cancel` — cancel booking (T-48h cutoff)
- `GET /api/v2/b2b/bookings/:id/video-proof` — get video proof URL (post-completion)
- `GET /api/v2/b2b/festivals` — upcoming festivals (read-only)
- `GET /api/v2/b2b/festivals/:slug/slots` — festival pre-sale slots
- `GET /api/v2/b2b/me/usage` — partner's API usage + remaining quota
- `GET /api/v2/b2b/me/webhooks` — list webhook configurations
- `POST /api/v2/b2b/webhooks/test` — test webhook delivery

### Webhook events (deliverable to partner_webhook_url)

- `booking.created`
- `booking.confirmed` (payment captured)
- `booking.completed` (puja done, video uploaded)
- `booking.cancelled`
- `booking.refunded`
- `festival.slot.available` (waitlist promotion)
- `festival.slot.sold_out`

## Implementation notes

- Use SAME core `bookings` table as internal flow; `b2b_booking_attribution` join table per P-006 spec
- Idempotency: `POST /bookings` requires `Idempotency-Key` header to prevent double-create on retry
- Webhook delivery: HMAC-SHA256 signature per existing P-006 pattern; 3-retry with exp backoff
- Rate limiting via Redis (free Upstash tier) OR in-memory token bucket (Render single-instance v1)

## Documentation

Standalone API docs at `/api/v2/b2b/docs` (OpenAPI 3.0 spec, Swagger UI):
- Endpoint reference
- Auth flow
- Webhook payload schemas
- Code examples (curl + Node.js + Python)
- Sandbox + prod URL distinction
- Changelog

## Engineering checklist

```markdown
- [ ] Implement endpoints under apps/api/src/routes/b2b-v2/
- [ ] Add rate-limit middleware
- [ ] Add API-key auth middleware
- [ ] Add Idempotency-Key handling (Redis or DB-backed)
- [ ] OpenAPI spec at apps/api/src/openapi/b2b-v2.yaml
- [ ] Generate Swagger UI page
- [ ] Webhook signing + retry queue (BullMQ on Upstash OR cron-style)
- [ ] 13 test cases (per endpoint + auth + rate-limit + idempotency + webhook)
- [ ] Sandbox + prod environment split
```

## Out of scope

- GraphQL endpoint (REST v1, GraphQL v2)
- gRPC (overkill for partner integrations)
- Self-serve partner signup (admin-managed v1 per P-006)
- Per-endpoint billing (flat partner tier per P-006 v1)

## Closes

R-Q3-E-007 — spec shipped. Engineering ship next cycle.
