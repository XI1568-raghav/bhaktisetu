# Growth Metrics — 2026-09-21

> Daily snapshot. Public-endpoint inventories + API health + tripwire reminders. Authenticated metrics (MAU, MRR, retention) require admin-token route and are stubbed below.

## Supply inventory (live counts from prod public endpoints)

| Surface | Count | Note |
|---|---|---|
| Temples (public) | 0 | HTTP 429 |
| Priests (public) | 0 | HTTP 429 |
| Astrologers (public) | 0 | HTTP 429 |
| Gurukuls (public) | 0 | HTTP 429 |
| Store products (public) | 0 | HTTP 429 |
| Yatra packages (public) | 0 | HTTP 429 |
| Puja types (public) | 0 | HTTP 429 |
| Content (public) | 0 | HTTP 429 |

## API health

- Status: ⚠ 429
- Body: `"<!DOCTYPE html><html lang=\"en-US\"><head><title>Just a moment...</title><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"><meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\`

## North-star metrics (need authenticated /admin/metrics — wire this next)

| Metric | Target Week 8 | Target Week 12 | Current |
|---|---|---|---|
| MAU | 5,000 | 25,000 | (TBD — admin metrics route) |
| MRR | ₹4L | ₹20L | (TBD) |
| NRI ARPU mix | 30% | 35% | (TBD) |
| Avg bookings/MAU | 0.2 | 0.4 | (TBD) |
| D7 retention | 30% | 35% | (TBD) |
| D30 retention | 20% | 25% | (TBD) |

## Tripwires (review weekly)

- **NRI Day-30 retention** — limit: gte 25%. Source: analytics.
- **Blended NRI CAC** — limit: lte 40$. Source: analytics.
- **NRI annual:per-puja ratio** — limit: gte 1:3. Source: analytics.

Two tripwire breaches in same week → reduce to NRI-only SKU. See `docs/roadmap-archive.md`.

## Free analytics stack to wire

- **PostHog cloud free tier**: 1M events/mo. Embed in web + mobile. Track signup, role, booking-started, booking-completed, payment-success.
- **Cloudflare Web Analytics**: free, no cookies, no consent banner. Already on CF.
- **Google Search Console**: free keyword + position data. Verify property + submit sitemap.
- **Plausible self-host**: $0 on Fly.io if pageview events outgrow CF Analytics.
- **Sentry free**: 5K errors/mo. Already configured.

## Recommended daily check (founder, 5 min)

1. Open this report
2. Open PostHog dashboard (when wired): signups, activation, payments
3. Open Sentry: any new error >5 events
4. Open GSC: yesterday's impressions vs 7-day avg
5. Reply to all support emails

---
*Agent: growth-metrics · API: https://api.darshya.online · timestamp: 2026-09-21T09:35:35.502Z*
