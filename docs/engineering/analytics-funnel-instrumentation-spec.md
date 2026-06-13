# Analytics Funnel Instrumentation Spec

> Comprehensive PostHog event instrumentation across customer + pandit + admin surfaces. Foundation for Series A data-driven story.

## Why this matters

- Investor pitch deck requires concrete funnel metrics
- Daily ops decisions require real-time data
- A/B testing requires conversion tracking
- Cohort retention requires event-level tracking
- Customer success requires segmentation

## Current state

- 5 funnel events instrumented per R-Q1-E-008
- Basic page-view tracking via PostHog autocapture
- Manual segmentation via PostHog UI

## Target state (post-implementation)

- 50+ events instrumented across all user types
- Per-user funnel tracking
- Per-cohort retention analysis
- Real-time dashboard
- Automated insights generation

## Event taxonomy (50+ events)

### Devotee onboarding events (10)
- account_created (signup)
- email_confirmed (post-verification)
- profile_completed (first-puja-prereqs filled)
- first_browse_pujas (first time on /pujas)
- first_book_clicked (first booking flow start)
- first_payment_attempted (first Razorpay/Stripe checkout)
- first_payment_succeeded (first booking complete)
- first_video_proof_viewed (24hr+ post-booking)
- first_referral_shared (per Q-C-20260611T2307-R-Q2-M-011)
- first_referral_converted (friend signs up + books)

### Booking funnel events (15)
- puja_card_clicked (browse → detail)
- puja_detail_viewed (puja page loaded)
- book_button_clicked (intent to book)
- pandit_selected (pandit choice)
- temple_selected (temple choice)
- date_selected (booking date)
- payment_initiated (Razorpay/Stripe checkout opened)
- payment_succeeded (booking confirmed)
- payment_failed (with reason)
- booking_cancelled (with reason + refund eligibility)
- video_proof_uploaded (pandit upload)
- video_proof_viewed (devotee viewed)
- 80g_receipt_downloaded
- rebooking_started (same puja again)
- rebooking_completed

### Subscription events (10)
- subscription_landing_visited (per product type)
- subscription_button_clicked
- subscription_payment_initiated
- subscription_payment_succeeded
- subscription_first_renewal
- subscription_paused
- subscription_resumed
- subscription_cancelled (with reason)
- subscription_upgraded (tier change)
- subscription_downgraded

### AI Pandit events (8)
- ai_pandit_first_visit
- ai_pandit_question_asked
- ai_pandit_response_viewed
- ai_pandit_response_helpful (thumbs up)
- ai_pandit_response_unhelpful (thumbs down)
- ai_pandit_free_limit_reached
- ai_pandit_paywall_shown
- ai_pandit_subscribed (conversion)

### NRI-specific events (5)
- nri_landing_visited (per geo)
- nri_currency_selected (USD/GBP/CAD/AUD)
- nri_timezone_displayed
- nri_first_booking
- nri_referral_to_india_family

### Admin + ops events (5)
- admin_dashboard_accessed
- pandit_application_received
- temple_application_received
- escalation_created
- support_ticket_resolved

## Per-event property schema

```typescript
// Standard properties per event
{
  user_id: string,
  session_id: string,
  timestamp: string,
  geo_country: string,
  geo_city: string,
  user_type: 'devotee' | 'pandit' | 'temple_admin' | 'gaushala' | 'astrologer' | 'wellness',
  subscription_tier: 'free' | 'bhakti_pro' | 'bhakti_bhagat',
  utm_source: string,
  utm_medium: string,
  utm_campaign: string,
  utm_term: string,
  referrer: string,
  device: 'web' | 'ios' | 'android',
  // Event-specific properties (e.g., puja_slug, amount_inr, etc.)
}
```

## Implementation pattern

```typescript
// apps/web/lib/posthog-events.ts
import posthog from 'posthog-js'

export const trackEvent = {
  pujaCardClicked: (props: { puja_slug: string; position: number; source_page: string }) => {
    if (typeof window === 'undefined') return
    window.posthog?.capture('puja_card_clicked', props)
  },
  bookButtonClicked: (props: { puja_slug: string; price_inr: number; lane: string }) => {
    if (typeof window === 'undefined') return
    window.posthog?.capture('book_button_clicked', props)
  },
  // ... 48 more event helpers
}
```

## PostHog dashboard configurations

### Dashboard 1: Daily Active Users (DAU)
- Today vs yesterday vs 7-day rolling vs 30-day rolling
- Per-user-type (devotee/pandit/etc.)
- Per-geographic-segment (India/NRI)

### Dashboard 2: Booking Funnel
- Page View → Browse → Book Click → Payment Init → Payment Success → Video View
- Conversion rates per stage
- Per-time-period comparison (day/week/month)

### Dashboard 3: Subscription Funnel
- Free → AI Pandit Free Trial → Paywall → Subscribe
- Per-product-type (AI Pandit + Adopt-a-Temple + etc.)
- Churn analysis

### Dashboard 4: NRI Segment Health
- Per-country growth (US/UK/CA/AU)
- USD/GBP/CAD/AUD revenue breakdown
- Day-30 retention NRI vs India

### Dashboard 5: Cohort Retention Triangle
- Per-week cohort (W1, W2, W3, ...)
- Day 0, 7, 14, 30, 60 retention
- Trend over quarters

### Dashboard 6: A/B Test Performance
- All active tests (per R-Q1-E-009 + future)
- Per-variant conversion rate
- Statistical significance + recommendation

## Server-side events

Some events need server-side capture (vs client-side):

```typescript
// apps/api/src/lib/posthog-server.ts
import { PostHog } from 'posthog-node'

const ph = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST
})

// Inside booking confirmation
await ph.capture({
  distinctId: userId,
  event: 'payment_succeeded',
  properties: {
    booking_id, amount_inr, puja_slug, pandit_id
  }
})
```

## Privacy + DPDP compliance

- Per DPDP: anonymized analytics by default
- Personal-context events (per-user) require explicit consent
- Cookie banner gates analytics consent
- User opt-out via /me/privacy/consent
- Annual analytics audit by counsel

## Founder dashboard

`/admin/funnel` shows:

```
┌──────────────────────────────────────────────────────────┐
│ Today | Yesterday | 7d | 30d                              │
├──────────────────────────────────────────────────────────┤
│ Page Views          5,200 ▲ 12%                            │
│ Active Users        1,847 ▲ 8%                            │
│ Booking Clicks      214 ▲ 15%                              │
│ Payments Started    87 ▲ 3%                                │
│ Bookings Complete   71 (82% conversion from payments)     │
│ Subscriptions New   8 ▲ 60%                                │
└──────────────────────────────────────────────────────────┘
```

## Engineering tickets

- Week 1: 50-event taxonomy finalized
- Week 2: Client-side event helper functions
- Week 3: Server-side event capture
- Week 4: 6 PostHog dashboards configured
- Week 5: Daily ops review SOP
- Week 6: Weekly investor report automation
- Week 7-8: A/B test framework integration

## Cost summary

- PostHog: $0 (free tier 1M events/mo)
- Founder time: ~10 hours setup + 2 hr/week ongoing
- Engineer time: 4 weeks setup
- Total cost: $0 incremental ops cost

## ROI

- Series A pitch deck: dashboards = professional metric story
- Daily ops decisions: data-driven vs gut-feel
- A/B testing: faster product iteration
- Cohort retention: investor confidence in growth quality
- DPDP compliance: trust signal for users
