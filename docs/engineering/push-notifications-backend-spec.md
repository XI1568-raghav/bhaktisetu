# Push Notifications Backend — FCM Topics + Per-User Delivery Preference

> **Roadmap item**: R-Q2-E-009 (P1) · **Authored**: 2026-06-13

## Goal

Push notification backend via FCM (Firebase Cloud Messaging). Topic-based + per-user delivery preferences. Targets 60%+ daily-aarti notification opt-in.

## Schema

```prisma
model PushSubscription {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  fcmToken    String   @unique @map("fcm_token")
  platform    Platform // ios / android / web
  topics      String[] // ["daily_aarti", "festival_alert", "booking_status"]
  createdAt   DateTime @default(now()) @map("created_at")
  lastSeen    DateTime @default(now()) @map("last_seen")
  user        User @relation(fields: [userId], references: [id])
  @@index([userId])
  @@map("push_subscriptions")
}

model NotificationPreference {
  userId      String   @id @map("user_id")
  dailyAarti  Boolean  @default(true) @map("daily_aarti")
  festivals   Boolean  @default(true)
  bookingStatus Boolean @default(true) @map("booking_status")
  marketing   Boolean  @default(false)
  quietHours  String?  @map("quiet_hours") // "22:00-08:00"
  user        User @relation(fields: [userId], references: [id])
  @@map("notification_preferences")
}

enum Platform { ios android web }
```

## API endpoints

- `POST /api/v1/push/register` body `{ fcmToken, platform, topics }`
- `PATCH /api/v1/push/preferences` body `{ dailyAarti, festivals, ... }`
- `DELETE /api/v1/push/unregister/:fcmToken`

## Send service

```typescript
// apps/api/src/services/push.ts
import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp({ credential: cert(JSON.parse(FCM_SERVICE_ACCOUNT_JSON)) })
const fcm = getMessaging()

export async function sendToTopic(topic: string, payload: { title: string; body: string; data?: Record<string,string> }) {
  return fcm.send({
    topic,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  })
}
```

## Daily aarti trigger

Cron 06:00 IST:
```typescript
await sendToTopic('daily_aarti', {
  title: 'Mangal Aarti starts in 30 min 🙏',
  body: 'Live darshan from Kashi Vishwanath. Tap to watch.',
  data: { deep_link: '/today' }
})
```

## Quiet hours respect

Per-user check before send: skip if current IST within user's quiet_hours range.

## Engineering tickets

- R-Q2-E-009a: Prisma migration
- R-Q2-E-009b: FCM service account setup
- R-Q2-E-009c: 3 API endpoints
- R-Q2-E-009d: Send service + cron
- R-Q2-E-009e: Mobile (Expo) push registration

## Closes

R-Q2-E-009 — spec shipped.
