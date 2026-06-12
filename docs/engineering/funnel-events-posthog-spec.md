# 5 Funnel Events Instrumentation — PostHog

> **Roadmap item**: R-Q1-E-008 (P0) · **Authored**: 2026-06-13

## Goal

Instrument 5 critical funnel events via PostHog. Closes "we don't know where users drop" blind spot for product + investor metrics.

## 5 events

| # | Event name | Trigger location | Properties |
|---|---|---|---|
| 1 | puja_card_click | /pujas card onClick | { puja_id, puja_name, position, source_page } |
| 2 | book_clicked | /pujas/[slug] Book button | { puja_id, puja_name, price_inr, lane } |
| 3 | payment_initiated | Razorpay checkout open | { booking_id, puja_id, amount_inr, currency } |
| 4 | payment_success | Razorpay success webhook + client confirm | { booking_id, amount_inr, currency, first_time_buyer } |
| 5 | video_proof_viewed | /booking/[id] video player play | { booking_id, puja_id, video_duration_sec } |

## Implementation

`apps/web/lib/posthog-events.ts`:

```typescript
export const trackPujaCardClick = (props: { pujaId: string; pujaName: string; position: number; sourcePage: string }) => {
  if (typeof window === 'undefined') return
  window.posthog?.capture('puja_card_click', props)
}
// ... 4 more helpers
```

Wire in each component callback. SSR-safe (window check).

## Funnel analysis

PostHog dashboard:
- Step 1 puja_card_click → Step 2 book_clicked: target >40% conversion
- Step 2 book_clicked → Step 3 payment_initiated: target >70%
- Step 3 payment_initiated → Step 4 payment_success: target >85%
- Step 4 payment_success → Step 5 video_proof_viewed: target >60% (engagement)

## A/B test ideas

- hero_copy_v2 (default vs "Verified pandits, video proof in 24hr")
- cta_color_test (default saffron vs gold)
- nri_lane_above_fold (USD pricing visible on home for geo=US)

## Engineering tickets

- R-Q1-E-008a: 5 event helpers + wiring
- R-Q1-E-008b: PostHog funnel dashboard config
- R-Q1-E-008c: 3 feature-flag A/B tests

## Closes

R-Q1-E-008 — spec shipped.
