# Customer Success Metric Dashboard — Wireframe + Spec

> /admin/customer-success page wireframe for founder + CS-ops contractor monitoring.

## Goal

Single-pane operational dashboard surfacing real-time + 30-day rolling customer success metrics. Replaces ad-hoc PostHog + Sentry + Supabase queries.

## Wireframe

```
┌────────────────────────────────────────────────────────────┐
│ Bhaktisetu Customer Success Dashboard           Last: 2 min ago│
└────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Active MAU   │ Today's     │ NPS Score    │ Day-30       │
│ 5,247        │ Bookings    │ 58           │ Retention    │
│ ↑ +2.3% wk    │ 28          │ ↑ +3 vs Q2  │ 44% / 67% NRI │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌──────────────────────────────────────────────────────────┐
│ Revenue Funnel — Last 30 Days                            │
│                                                            │
│ Page View      ████████████████████████████████ 18,420  │
│ Browse Pujas   ███████████████████░░░░░░░░░░░░   8,945  │
│ Book Clicked   █████████░░░░░░░░░░░░░░░░░░░░░░   3,128  │
│ Payment Init.  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░     897  │
│ Payment Success██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     762  │
│ Video Viewed   █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     457  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Pandit Performance — Last 30 Days                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Pandit Name      Bookings   Rating  No-Show  Video │  │
│ │ Pandit Sharma    23         4.8     0%       100%  │  │
│ │ Pandit Verma     19         4.6     5%       95%   │  │
│ │ Pandit Iyer      17         4.9     0%       100%  │  │
│ │ Pandit Krishnan  14         3.9 ⚠️  10% ⚠️   88% ⚠️│  │
│ │ ... (97 more)                                       │  │
│ └────────────────────────────────────────────────────┘  │
│ Pandits needing review: 3 (Pandit Krishnan + 2)          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Customer Issues — Last 7 Days                            │
│                                                            │
│ Open    Pending  Resolved                                │
│   3       8        47                                    │
│                                                            │
│ Sev distribution:                                         │
│ P0: 0 | P1: 1 | P2: 5 | P3: 2                            │
│                                                            │
│ Top 3 issue categories:                                  │
│ 1. Video proof delay (4 incidents)                       │
│ 2. Refund request (3 incidents)                          │
│ 3. NRI pricing question (3 incidents)                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ NRI Segment Health                                        │
│                                                            │
│ Total NRI MAU: 953 (18.2% of total MAU)                  │
│ Target: 40% by Q4                                        │
│                                                            │
│ By Country:    Bookings 30d / MRR                        │
│ USA:    156   ($3,420 / ~₹2.8L)                          │
│ UK:      42   (£480 / ~₹52K)                             │
│ Canada:  31   (C$520 / ~₹32K)                            │
│ Australia: 8  (A$200 / ~₹13K)                            │
│ Singapore: 5  (S$135 / ~₹8K)                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Cohort Retention Triangle (Day 0 / 7 / 14 / 30)          │
│                                                            │
│ Cohort   D0    D7    D14   D30   D60                    │
│ W22-26   100%  73%   58%   44%   31%                    │
│ W27-30   100%  78%   62%   47%   -                       │
│ W31-34   100%  75%   65%   -     -                       │
│ W35-38   100%  82%   -     -     -                       │
│ W39-42   100%  -     -     -     -                       │
│                                                            │
│ Trend: D-30 retention improving 44% → 47% → projected 50%│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Today's Bookings — Live                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 12:34 BS-20260613-K3HSD  ₹2,500  Rudrabhishek      │  │
│ │ 11:20 BS-20260613-M8XJ9  $30 USD  Pind Daan        │  │
│ │ 10:45 BS-20260613-N7BCD  ₹3,500  Diwali Lakshmi    │  │
│ │ 09:30 BS-20260613-P5HFK  ₹2,000  Satyanarayan      │  │
│ │ ... (24 more today)                                 │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Data sources

- **PostHog**: page views, funnel events, A/B tests
- **Supabase**: bookings, users, refunds, pandits, reviews
- **Sentry**: error rates, performance issues
- **Resend**: email delivery stats
- **Razorpay/Stripe**: payment success rates

## Refresh cadence

- Real-time: top 4 metric cards (MAU, today's bookings, NPS, retention)
- 5-min: revenue funnel, pandit performance, customer issues
- 1-hour: NRI segment health, cohort retention triangle
- Daily: monthly investor digest auto-generated

## Implementation

### Backend (`apps/api/src/routes/admin/customer-success.ts`)

```typescript
fastify.get('/admin/customer-success', { preHandler: [requireAdmin] }, async (req, reply) => {
  const [
    mauTotal,
    todayBookings,
    npsScore,
    retentionD30,
    funnelData,
    panditPerf,
    customerIssues,
    nriSegment,
    cohortTriangle,
    recentBookings
  ] = await Promise.all([
    getMauTotal(),
    getTodayBookings(),
    getNpsScore(),
    getD30Retention(),
    getFunnelLast30Days(),
    getPanditPerformanceLast30Days(),
    getCustomerIssuesLast7Days(),
    getNriSegmentBreakdown(),
    getCohortRetentionTriangle(),
    getRecentBookingsToday()
  ])
  
  return reply.send({
    overview: { mauTotal, todayBookings, npsScore, retentionD30 },
    funnelData,
    panditPerf,
    customerIssues,
    nriSegment,
    cohortTriangle,
    recentBookings
  })
})
```

### Frontend (`apps/web/app/admin/customer-success/page.tsx`)

- SSR initial load (faster perceived)
- Client-side polling every 5 min (4 metric cards real-time)
- React Query caching
- Responsive: mobile-friendly for founder phone access
- Dark/light mode toggle
- CSV export per panel

## Alerts integrated

- Slack #ops channel post for:
  - NPS score change >5 points
  - Pandit no-show rate >2% sustained 24hr
  - Customer P0/P1 issue open >4hr
  - NRI signup spike >50% w-o-w (good signal)
  - Refund spike >5% in single day

## Mobile responsiveness

- Designed primarily for desktop founder + CS-ops view
- Mobile shows top 4 metric cards + recent bookings table
- Detailed panels (cohort triangle, pandit perf) collapsed on mobile

## Founder daily review

- 5-min morning review: top metric cards + open issues + today's bookings
- Weekly 30-min: cohort retention + NRI segment + pandit performance trends
- Monthly investor report auto-generated from this data
