# Pandit Dashboard — Wireframe + Implementation Spec

> /pandit/dashboard for verified pandit network. Replaces ad-hoc WhatsApp coordination.

## Goal

Single-pane operational dashboard for verified pandits to manage bookings, video proof uploads, payouts, and customer communication.

## Access

- Login: pandit phone + OTP (no email password — many pandits non-tech-savvy)
- Multi-language: Hindi default + English toggle + Tamil/Telugu/Bengali/Marathi/Gujarati per pandit region

## Wireframe

```
┌────────────────────────────────────────────────────────────┐
│ Bhaktisetu Pandit Dashboard       |  Pandit Sharma | EXIT │
└────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────────┐
│ Today's     │ This Week   │ Pending     │ Total Earned    │
│ Bookings: 3 │ Earnings    │ Video       │ This Month      │
│             │ ₹4,500      │ Uploads: 1  │ ₹18,000         │
│ ⏰ Next: 2pm │             │ ⚠️ Due 6pm  │                 │
└─────────────┴─────────────┴─────────────┴─────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Today's Bookings — Action Required                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ⏰ 10:00 AM — BS-20260613-K3HSD                   │  │
│ │ Rudrabhishek for Mr. Ramesh @ Kashi Vishwanath    │  │
│ │ Status: CONFIRMED                                  │  │
│ │ [Start Live Stream] [Upload Video Proof]           │  │
│ │ Customer phone: +91-XX (tap to call)              │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ ⏰ 2:00 PM — BS-20260613-M8XJ9                    │  │
│ │ Satyanarayan for Mrs. Priya @ Home                │  │
│ │ Status: CONFIRMED                                  │  │
│ │ [Start Live Stream] [Upload Video Proof]           │  │
│ │ Customer phone: +91-XX (tap to call)              │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ ⏰ 6:00 PM — BS-20260613-N7BCD                    │  │
│ │ Diwali Lakshmi Puja for NRI Mrs. Vidya @ Mumbai   │  │
│ │ Status: CONFIRMED (Live-stream required)          │  │
│ │ [Start Live Stream] [Upload Video Proof]           │  │
│ │ NRI customer — Bay Area timezone (8 AM their time)│  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Upload Pending — 1 Booking                                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ⚠️ BS-20260612-AAA — Conducted yesterday at 4 PM   │  │
│ │ Video due: TODAY 6 PM (₹2,500 payout pending)     │  │
│ │ [Upload Video] [Mark Issue]                        │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Upcoming Week — Schedule                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Mon Jun 14: 2 bookings                              │  │
│ │ Tue Jun 15: 5 bookings (Hanuman Tuesday rush)      │  │
│ │ Wed Jun 16: 1 booking                              │  │
│ │ Thu Jun 17: 3 bookings                              │  │
│ │ Fri Jun 18: 4 bookings                              │  │
│ │ Sat Jun 19: 2 bookings (Shani Saturday)            │  │
│ │ Sun Jun 20: 3 bookings (Surya Sunday)              │  │
│ └────────────────────────────────────────────────────┘  │
│ Total week: 20 bookings  |  Est weekly earnings: ₹30K   │
│ [Block date for personal reason]                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Payouts                                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ This Week (paid Friday): ₹4,500 (5 bookings)      │  │
│ │ Last Week (paid Jun 6): ₹6,800 (8 bookings)       │  │
│ │ ... (8 more weeks history)                          │  │
│ └────────────────────────────────────────────────────┘  │
│ [View Full Payout History] [Update Bank Details]          │
│ TDS deducted (Section 194J): 10%                          │
│ Form 26AS available end of FY                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Performance Stats                                          │
│                                                            │
│ Last 30 Days:                                             │
│ - Bookings: 23                                            │
│ - Customer Rating: 4.8 / 5.0                              │
│ - Video Proof Compliance: 100%                            │
│ - No-Show Rate: 0%                                        │
│                                                            │
│ Status: ⭐ TRUSTED PANDIT                                  │
│                                                            │
│ Performance Trend (last 6 months): ↗️ improving           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Customer Messages — 2 Unread                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 💬 BS-20260613-K3HSD — Ramesh                      │  │
│ │ "Need to reschedule from 10 AM to 11 AM"          │  │
│ │ [Reply] [Accept] [Decline]                         │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ 💬 BS-20260613-N7BCD — Vidya (NRI)                 │  │
│ │ "Can you also chant Sri Suktam during the puja?" │  │
│ │ [Reply] [Confirm Yes]                              │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Mobile-first design

- Primary device: Android phone (Pandits less likely on iOS)
- Touch targets: minimum 44px (large age range of pandits)
- Hindi default UI with English toggle
- Voice-input for Hindi typing where applicable
- WhatsApp deep-link for customer communication

## Implementation

### Backend endpoints

```typescript
GET /api/v1/pandit/dashboard
  // returns: today bookings, week schedule, payouts, performance, messages

POST /api/v1/pandit/booking/:id/start-stream
  // creates IVS stream session

POST /api/v1/pandit/booking/:id/upload-video
  // multipart upload to S3

GET /api/v1/pandit/payouts
  // payout history with TDS info

PATCH /api/v1/pandit/availability
  // block dates / set availability

POST /api/v1/pandit/booking/:id/message
  // reply to customer message
```

### Frontend

```typescript
// apps/web/app/pandit/dashboard/page.tsx
// SSR initial load
// React Query for live polling
// Mobile-first responsive design
// Hindi default + multi-lang toggle
// Offline-first for poor connectivity
```

### Mobile app

Expo app variant `apps/mobile/app/(pandit)/dashboard.tsx`:
- React Native equivalent of web UI
- Native video upload (better than web)
- Push notifications for new bookings
- Offline queue for video uploads (retry on connectivity)

## Authentication

- Phone + OTP via Twilio (cheaper than email)
- Session: 30-day persistent (pandits use daily)
- 2FA optional for high-earning pandits
- IP allowlist optional for fraud prevention

## Permissions

- Pandit only sees own bookings
- Customer PII redacted (only first name + last-4 phone visible)
- Booking-specific WhatsApp link works for limited communication only
- No raw customer data export

## Notifications

- Push: new booking, customer message, video upload reminder
- Email: weekly payout statement
- WhatsApp: critical (no-show alert, dispute, etc.)

## Quality gates

- 99%+ uptime expected for dashboard
- <500ms p95 load time
- Multi-language consistency
- Offline functionality for video uploads

## Founder dashboard cross-link

`/admin/pandits` shows aggregated pandit performance, top-rated, no-show outliers, payout disputes — feeds into pandit-network management decisions.
