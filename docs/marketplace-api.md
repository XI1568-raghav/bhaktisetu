# Marketplace API v2

Public read-only API for 3rd-party temple/devotional apps to consume Darshya temple/puja data.

## Authentication

Header: `X-Darshya-API-Key: msk_<random_24_bytes_base64url>`

Get a key: contact `support@darshya.online` or via admin `POST /api/v1/admin/marketplace/keys`.

Keys hashed at rest (sha256). Plaintext shown ONCE at creation, never retrievable later.

## Rate limit

Default 60 req/min per key. Higher tiers available on request.

`429 Too Many Requests` if exceeded.

## Endpoints (read-only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v2/marketplace/temples` | List temples (max 100) |
| GET | `/api/v2/marketplace/temples/:slug` | Temple detail |
| GET | `/api/v2/marketplace/pujas` | List puja types |
| GET | `/api/v2/marketplace/pujas/:slug` | Puja detail |
| GET | `/api/v2/marketplace/darshan/live` | Live darshan streams |
| GET | `/api/v2/marketplace/yatra-destinations` | Yatra destination slugs |

## Admin endpoints (admin auth)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/admin/marketplace/keys` | Issue new key |
| GET | `/api/v1/admin/marketplace/keys` | List keys |
| DELETE | `/api/v1/admin/marketplace/keys/:id` | Revoke |

## Issue a key

```bash
curl -X POST https://api.darshya.online/api/v1/admin/marketplace/keys \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TempleApp Mumbai Trust",
    "ownerEmail": "dev@templeapp.in",
    "rateLimitPerMin": 120
  }'
```

Response:
```json
{
  "key": "msk_xyz123...",
  "prefix": "msk_xyz123",
  "message": "Save this key — it cannot be retrieved again."
}
```

## Use a key

```bash
curl https://api.darshya.online/api/v2/marketplace/temples \
  -H "X-Darshya-API-Key: msk_xyz123..."
```

## Pricing

Free tier: 60 req/min, 10K req/day.
Pro tier: 600 req/min, 1M req/day. Contact us.
