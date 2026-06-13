# PostHog Conversion Funnel — NRI FB Ads

## Funnel definition (4 steps)

| Step | Event name | Where it fires |
|---|---|---|
| 1 | `nri_landing_view` | `/nri` or `/gift` page-view with `utm_source=facebook` |
| 2 | `gift_puja_click` | Any "Send Puja" / "Book Puja" / "Donate" CTA click on the landing page |
| 3 | `checkout_start` | Razorpay/Stripe order created (server-side event from `apps/api/src/routes/checkout/`) |
| 4 | `order_placed` | Payment success webhook fired (server-side, idempotent on order id) |

## PostHog funnel SQL (dashboard tile)

```sql
SELECT
  funnel_step,
  count(*) AS users,
  count(*) * 100.0 / FIRST_VALUE(count(*)) OVER (ORDER BY funnel_step) AS conversion_pct
FROM (
  SELECT
    person_id,
    multiIf(event = 'nri_landing_view', 1,
             event = 'gift_puja_click', 2,
             event = 'checkout_start', 3,
             event = 'order_placed', 4, NULL) AS funnel_step
  FROM events
  WHERE timestamp >= now() - INTERVAL 7 DAY
    AND properties.utm_campaign = 'nri-q1-feb-2026'
) t
WHERE funnel_step IS NOT NULL
GROUP BY funnel_step
ORDER BY funnel_step;
```

## Breakdown dimensions

- `utm_content` → which creative wins (gift-puja-nri vs live-darshan-nri vs 80g-receipt-nri)
- `utm_term` → which audience converts better (us-hindu-25-45 vs uk-hindu-25-45)

## Per-creative CAC

```
CAC = (spend_per_creative) / (order_placed_count_per_creative)
target: < $30
```

## Founder verification before launch

1. Meta Pixel installed on `/nri`, `/gift`, `/checkout/success` (see `launch-checklist.md`).
2. PostHog capture verified for the 4 event names above (check `apps/web/lib/analytics.ts` event names match this doc — rename either side if drift).
3. UTM params persist from landing → checkout (see `utm-plan.md` step 3-4).
