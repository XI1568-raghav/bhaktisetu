# Growth Metrics — 2026-08-10

> Daily snapshot. Public-endpoint inventories + API health + tripwire reminders. Authenticated metrics (MAU, MRR, retention) require admin-token route and are stubbed below.

## Supply inventory (live counts from prod public endpoints)

| Surface | Count | Note |
|---|---|---|
| Temples (public) | 20 | ok |
| Priests (public) | 3 | ok |
| Astrologers (public) | 15 | ok |
| Gurukuls (public) | 3 | ok |
| Store products (public) | 24 | ok |
| Yatra packages (public) | 0 | unknown-shape |
| Puja types (public) | 10 | ok |
| Content (public) | 20 | ok |

## API health

- Status: ✓ 200
- Body: `{"status":"ok","timestamp":"2026-08-10T05:24:08.212Z"}`

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
*Agent: growth-metrics · API: https://api.darshya.online · timestamp: 2026-08-10T05:24:08.303Z*
