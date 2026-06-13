# Push Notifications Strategy — Daily Aarti + Festival + Booking-Status

> **Roadmap item**: R-Q2-P-006 (P1) · **Authored**: 2026-06-13 · **Depends on**: R-Q2-E-009 backend

## Goal

Q2 ship push notification UX strategy. Daily aarti + festival alerts + booking status. Targets 60% daily-aarti opt-in + 40% open rate.

## Notification matrix

| Topic | Trigger | Frequency | Default opt-in | Quiet hours respected |
|---|---|---|---|---|
| daily_aarti | 06:00 IST or per-user pref | Daily | Yes | Yes |
| festival_alert | T-3 days from Hindu festival | Variable (5-10/mo) | Yes | Yes |
| booking_confirmed | Razorpay success | Real-time | Yes | No (transactional) |
| video_proof_ready | Pandit uploads video | Real-time | Yes | No (transactional) |
| pandit_reminder | T-24hr before scheduled puja | Per-booking | Yes | No (critical) |
| pre_seed_promo | Marketing campaign | Max 1/week | Opt-in only | Yes |
| referral_credit | Referee book first puja | Real-time | Yes | Yes |

## Per-notification template

### daily_aarti
```
Title: Mangal Aarti starts in 30 min 🙏
Body: Live darshan from Kashi Vishwanath. Tap to watch.
Deep-link: /today
```

### festival_alert
```
Title: Janmashtami is in 3 days 🦚
Body: Book Krishna puja or watch live Mathura darshan
Deep-link: /festival/janmashtami
```

### booking_confirmed
```
Title: Booking confirmed: BS-20260815-K3HSD 🪔
Body: Rudrabhishek scheduled for Aug 15, 06:00 IST
Deep-link: /booking/BS-20260815-K3HSD
```

### video_proof_ready
```
Title: Your puja video is ready 📹
Body: Watch the recorded ceremony from your phone
Deep-link: /booking/BS-20260815-K3HSD/proof
```

## User preference UX

`/profile/notifications`:
- Toggle per topic
- Quiet hours: HH:MM-HH:MM input (default 22:00-08:00)
- "Mute all (vacation mode)" button (1-3-7-30 days)
- "Unsubscribe from all" link (deactivates push subscription)

## Engineering tickets

- R-Q2-P-006a: Notification preference UI
- R-Q2-P-006b: 7 template message designs
- R-Q2-P-006c: Cron jobs per notification type
- R-Q2-P-006d: Quiet hours enforcement service
- R-Q2-P-006e: Opt-out compliance audit

## Closes

R-Q2-P-006 — spec shipped.
