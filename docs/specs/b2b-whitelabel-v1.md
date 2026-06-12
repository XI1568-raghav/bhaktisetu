# B2B White-label v1 — Product Spec

> **Roadmap item**: R-Q4-P-006 · **Status**: spec authored, engineering pending · **Revenue target**: 5-10 paying B2B clients @ ₹25K-₹1L/mo each = ₹2-10L MRR · **Authored**: 2026-06-12

## Goal

Let third-party apps (matchmaking, community, NRI services) embed Bhaktisetu's devotional features (live darshan, puja booking, adopt-a-temple) under their own brand on their own domain. Tenant-isolated data, white-label UI, transparent revenue share.

Why: Bhaktisetu has the supply (temples + pandits + payment + video proof). Many partner-app categories have the audience but no devotional feature road. Pure B2B SaaS layer over our existing platform.

## Non-goals

1. **Not raw API access.** Apps embed via SDK + iframe widgets, not raw HTTP API. Reduces support burden.
2. **Not multi-language UI v1.** English + Hindi only; partner apps translate UI strings client-side if needed.
3. **Not partner-specific puja types.** Partner sells from our existing puja catalog; custom puja additions = v2.
4. **Not partner-specific pricing.** Same INR/USD price across all partners; revenue split varies.
5. **Not partner-side admin tools.** Partner gets read-only dashboard; ops still by Bhaktisetu.

## Target B2B segments

1. **Matchmaking apps** (Shaadi.com, Jeevansathi, BharatMatrimony niche) — couples want pre-wedding muhurat + first-puja booking. Embeds via wedding-planner-v1.md flow.
2. **NRI community apps** (Indian-diaspora newsletter platforms, NRI bank apps) — sankalp + adopt-a-temple subscriptions for diaspora users.
3. **Astrology apps** (AstroSage, Clickastro, Ganeshaspeaks) — natural cross-sell from astro reading to remedial puja.
4. **Devotional content platforms** (Aastha, Sanskar TV apps, BhaktiTV streamers) — convert viewing audience to paying puja bookers.
5. **NRI bank / fintech apps** (Niyo, Wise India, Razorpay's own NRI tier) — devotional services as customer-retention layer.

## Personas

1. **Acme Matrimony Product Manager (34, Mumbai)** — needs to add muhurat + first-puja booking before marriage ceremony. Wants white-label embed (no "Powered by Bhaktisetu" surfacing to users), 90/10 revenue split (Acme keeps 10% as channel partner fee, Bhaktisetu 90% of platform fee).
2. **NRI Community App founder (40, NJ)** — wants 1-tap "send sankalp home" feature for diaspora users. Needs USD pricing, multi-temple selection.
3. **AstroSage VP Engineering** — wants direct API to programmatically trigger puja recommendation based on astrological event (Saturn-transit remedy). Needs webhook to push results back to user's astro chart.

## User journey (devotee-side, embedded in partner app)

```
[devotee uses partner app — e.g. Acme Matrimony]
   │
   ▼
(a) Partner app surfaces "Book your wedding pandit" / "Send Diwali sankalp"
   │
   ▼
(b) Click → iframe widget opens INSIDE partner app (white-label, partner brand)
   │
   ▼
(c) Devotee selects puja + temple + date · same flow as bhaktisetu.com
   │
   ▼
(d) Payment processed via Bhaktisetu rails (Razorpay/Stripe). Partner's
    revenue share auto-allocated.
   │
   ▼
(e) Confirmation in partner app · WA + email from "Acme + Bhaktisetu" co-brand
   │
   ▼
(f) Video proof delivered to devotee's partner-app inbox (via webhook to
    partner)
```

## User journey (partner-side)

```
[Partner signs MoU + gets API credentials]
   │
   ▼
(a) Partner team sandbox-tests embed in their dev env (Bhaktisetu sandbox)
   │
   ▼
(b) Partner ships to prod (SDK npm package + iframe widget)
   │
   ▼
(c) Each booking auto-tracked to partner via `tenant_id` in URL/header
   │
   ▼
(d) Monthly: Bhaktisetu issues revenue-share statement + auto-pays via UPI/wire
   │
   ▼
(e) Partner sees read-only dashboard of bookings + revenue
```

## Data model deltas

Two new tables. Reuses existing puja_bookings + payments.

### Table: b2b_tenant

```sql
CREATE TABLE b2b_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  primary_domain text NOT NULL,
  allowed_origins jsonb NOT NULL,
  api_key_hash text NOT NULL,
  revenue_share_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  status text NOT NULL DEFAULT 'active',
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  mou_signed_at timestamptz,
  brand_logo_url text,
  brand_primary_color text,
  brand_secondary_color text,
  webhook_url text,
  webhook_secret_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_b2b_tenant_slug ON b2b_tenant(slug);
CREATE UNIQUE INDEX idx_b2b_tenant_apikey ON b2b_tenant(api_key_hash);
```

`status` enum: `pending`, `active`, `paused`, `terminated`.

### Table: b2b_booking_attribution

```sql
CREATE TABLE b2b_booking_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES b2b_tenant(id),
  source_url text,
  user_agent text,
  ip_hash text,
  revenue_share_pct_at_booking numeric(5,2) NOT NULL,
  partner_share_inr int NOT NULL DEFAULT 0,
  bhaktisetu_share_inr int NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending',
  payout_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bba_tenant_payout ON b2b_booking_attribution(tenant_id, payout_status);
CREATE INDEX idx_bba_booking ON b2b_booking_attribution(booking_id);
```

`payout_status` enum: `pending`, `batched`, `paid`, `failed`, `disputed`.

Note: NOT adding `tenant_id` directly to `puja_bookings` to keep multi-tenancy as a separate concern. Bookings stay tenant-agnostic at core layer; attribution table joins for B2B reporting.

## API surface

8 endpoints. All under `/api/v1/b2b/*`. Auth via tenant API key header `X-Tenant-Api-Key`.

- `POST /api/v1/b2b/embed/booking` — partner-app triggers booking flow on user's behalf. Body: `{ pujaTypeId, templeId, scheduledDate, devoteeNames, amountInr, redirectUrl }`. Returns `{ bookingId, checkoutUrl, tenantId }`.
- `GET /api/v1/b2b/temples` — list temples available for partner. Filtered by partner's MoU coverage.
- `GET /api/v1/b2b/puja-types` — list available puja types.
- `GET /api/v1/b2b/me/dashboard` — partner read-only dashboard. Returns `{ totalBookings, totalRevenueInr, partnerSharePending, partnerSharePaid, last30dGrowth }`.
- `GET /api/v1/b2b/me/bookings` — paginated booking list w/ devotee names (anonymised on partner side per DPDPA).
- `GET /api/v1/b2b/me/payouts` — list of payout batches.
- `POST /api/v1/admin/b2b/tenants` — admin only. Onboard new tenant (post-MoU).
- `POST /api/v1/webhooks/b2b/booking-status` — internal. Pushes status updates (paid, video-uploaded, refunded) to partner's webhook URL.

## SDK + iframe widget

### npm package: `@bhaktisetu/embed`

```typescript
import { BhaktisetuEmbed } from '@bhaktisetu/embed';

const embed = new BhaktisetuEmbed({
  tenantApiKey: process.env.BHAKTISETU_API_KEY,
  brand: {
    primaryColor: '#FF6B35',
    logoUrl: 'https://acme.com/logo.png',
  },
});

embed.openBookingWidget({
  pujaType: 'wedding-muhurat',
  scheduledDate: '2026-11-25',
  onSuccess: (bookingId) => console.log('booked', bookingId),
  onCancel: () => console.log('user cancelled'),
});
```

### iframe widget URL pattern

```
https://embed.bhaktisetu.com/v1/booking?tenant=acme&puja=wedding-muhurat&date=2026-11-25&brand_color=%23FF6B35
```

PostMessage events from iframe → partner page:
- `bhaktisetu:booking-created` (bookingId)
- `bhaktisetu:payment-success` (paymentId, amountInr)
- `bhaktisetu:user-cancelled`
- `bhaktisetu:error` (errorCode)

## Webhook contract

When booking status changes (paid → confirmed → completed → refunded), Bhaktisetu POSTs to partner's `webhook_url`:

```json
{
  "event": "booking.paid",
  "tenant_id": "acme",
  "booking_id": "bs_abc123",
  "booking_number": "BS-20260820-3KFR9",
  "amount_inr": 501,
  "partner_share_inr": 50,
  "puja_type": "tulsi-archana",
  "scheduled_date": "2026-08-26T12:00:00+05:30",
  "occurred_at": "2026-08-20T14:32:10Z",
  "signature": "hmac-sha256(payload, webhook_secret)"
}
```

Partner verifies signature → updates own DB → ack 200. Retry policy: 3 attempts over 24h, then dead-letter.

## Revenue model

Per-booking split, configured per tenant at MoU signing:

| Partner tier | Revenue share to partner | Min monthly volume | Min revenue commitment |
|---|---|---|---|
| **Starter** | 10% of devotee payment | 50 bookings/mo | ₹25K/mo Bhaktisetu rev |
| **Growth** | 15% of devotee payment | 200 bookings/mo | ₹1L/mo Bhaktisetu rev |
| **Strategic** | 20% of devotee payment | 1000 bookings/mo | ₹5L/mo Bhaktisetu rev |

Below `min monthly volume`, partner stays on Starter tier. Above → auto-promotion next month.

Bhaktisetu retains 90/85/80% respectively, of which: 60-80% flows to temple/pandit, 10-30% to platform ops.

## Test plan (for engineering)

### Integration tests (`apps/api/src/routes/__tests__/b2b.test.ts`)

1. `POST /b2b/embed/booking` w/ valid tenant API key → creates booking + attribution row.
2. `POST /b2b/embed/booking` w/ invalid API key → 401.
3. `POST /b2b/embed/booking` w/ revoked tenant (status=terminated) → 403.
4. `GET /b2b/me/dashboard` returns tenant-scoped data only.
5. Tenant A cannot see Tenant B bookings.
6. Webhook delivery: booking confirmed → partner webhook POST'd with correct signature.
7. Webhook signature verification: invalid signature → partner can reject + Bhaktisetu logs.
8. Revenue split: booking ₹501 at 10% tier → partner_share=50, bhaktisetu_share=451.

### Embed widget tests (`apps/web/embed/__tests__/widget.test.tsx`)

9. Widget loads w/ correct brand color + logo from URL params.
10. Successful booking → postMessage event w/ bookingId fired to parent.
11. User cancel → cancel event fired, widget closes.

### CSP + iframe security tests

12. Widget refuses to load from origin not in tenant's `allowed_origins`.
13. Widget enforces sandbox attributes preventing top-frame navigation.

## MVP cut-line

| Capability | v1 (ship Q1 2027) | v2 (ship Q3 2027) |
|---|---|---|
| Tenant onboarding (admin manual) | ✓ | — |
| API key auth | ✓ | — |
| iframe widget (1 puja type at a time) | ✓ | — |
| npm SDK (basic open/close) | ✓ | — |
| Webhook delivery (booking lifecycle) | ✓ | — |
| Read-only partner dashboard | ✓ | — |
| Monthly payout via UPI/wire | manual v1 | auto v2 |
| Multi-puja-type widget (one-page browse) | — | ✓ |
| OAuth-style user linking (devotee account survives across partners) | — | ✓ |
| Partner-side admin (manage own users, refunds) | — | ✓ |
| Partner-specific custom puja types | — | ✓ |
| Self-serve tenant signup (instant API key) | — | ✓ |
| White-label payment flow (Razorpay sub-account) | — | ✓ |

## Open questions

1. **Sandbox vs prod API keys**: separate keys + separate URLs (embed.bhaktisetu.com vs sandbox.embed.bhaktisetu.com), or one key + env header? (Recommend separate URLs — clearer infra.)
2. **CSP for iframe**: who owns CSP — partner site or Bhaktisetu? (Recommend Bhaktisetu sets X-Frame-Options + CSP frame-ancestors per tenant whitelist.)
3. **Refund handling**: partner refund initiation, or Bhaktisetu-only? (Recommend Bhaktisetu-only v1; partner sees refund event via webhook, no override.)
4. **Brand-color contrast**: enforce WCAG AA minimums on partner-supplied color or allow override? (Recommend enforce — protects accessibility.)
5. **Devotee data ownership**: who owns devotee profile after first booking via partner widget? (Recommend Bhaktisetu owns, partner gets anonymised aggregate stats only — protects against data extraction.)
6. **Partner termination data**: on tenant termination, do bookings stay? (Recommend yes, devotee continues service; partner just stops getting new attribution + revenue share.)
7. **Tax handling for international partners**: GST liability for Indian partners; W-8BEN for US? (Recommend counsel signoff before any US partner onboarded.)
8. **Revenue share to partner vs to temple**: 15% partner share — does that come out of platform cut OR temple cut? (Recommend platform cut — temple gets 60-80% unconditionally regardless of channel.)
9. **Webhook retry exhaust → human escalation?** (Recommend Slack alert to ops + manual replay tool.)
10. **Embed widget SEO impact on partner site**: iframe content is non-indexable; SEO neutral?  Or offer noindex'd HTML snippet for partners who want SEO? (Recommend iframe v1, HTML snippet v2 after pilot.)

## Closes

Q-C-20260612T0001-R-Q4-P-006 — spec authored. Engineering build will become R-Q4-E-013 next cycle.
