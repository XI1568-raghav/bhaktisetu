# FCM Push Notifications Spec — Booking + Aarti + Festival

> **Roadmap item**: R-Q3-E-004 (P0) · **Authored**: 2026-06-12 · **Depends on**: U5 (FCM server key paste — founder activation gate)

## Goal

Push notifications cover 3 use cases:
1. **Booking reminders**: T-24h + T-2h before puja
2. **Live aarti alerts**: when major-temple live stream goes live
3. **Festival notifications**: T-7d + T-1d before user-RSVP'd festivals

## Architecture

- Backend: existing Render API spawns FCM messages via firebase-admin SDK
- Frontend (web): Notifications API + Service Worker for browser push (requires HTTPS, which CF Pages provides)
- Frontend (mobile - Expo): expo-notifications wrapping FCM/APNS

## Notification types + tokens

| Type | Trigger | Template (en) | Template (hi) | CTA |
|---|---|---|---|---|
| booking_24h_reminder | T-24h to PujaBooking.scheduledDate | "Your {puja_name} is tomorrow at {time} IST" | "Aapki {puja_name} kal {time} IST par hai" | /me/bookings/{id} |
| booking_2h_reminder | T-2h | "Live stream starts soon: {puja_name}" | "Live stream jaldi shuru hoga: {puja_name}" | /live/{streamId} |
| live_aarti_starting | Aarti live stream begins | "Live: {temple_name} aarti now" | "Live: {temple_name} aarti abhi" | /live/{streamId} |
| festival_7d_reminder | T-7d to user-RSVP'd festival | "Janmashtami in 7 days — your slot locked" | "Janmashtami 7 din mein — aapka slot lock" | /festivals/{slug} |
| festival_1d_reminder | T-1d | "Janmashtami tomorrow — final reminder" | "Janmashtami kal — final reminder" | /festivals/{slug} |
| video_proof_ready | Video uploaded by pandit | "Your puja video is ready — view now" | "Aapki puja ka video taiyar hai" | /me/bookings/{id}/video |
| refund_processed | Razorpay refund success | "Refund of ₹{amount} processed" | "₹{amount} ka refund process hua" | /me/bookings/{id} |
| temple_subscription_charge | Monthly auto-debit success | "Monthly ₹{amount} to {temple} — impact PDF ready" | "Maasik ₹{amount} {temple} ko — impact PDF taiyar" | /me/temple-subscriptions |

## Implementation skeleton

```typescript
// apps/api/src/lib/push/fcm.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

if (FCM_SERVER_KEY) {
  initializeApp({
    credential: cert(JSON.parse(FCM_SERVER_KEY)),
  });
}

export async function sendPush({
  fcmTokens,
  title,
  body,
  data,
}: {
  fcmTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!FCM_SERVER_KEY) return; // env-or-noop
  const msg = getMessaging();
  await msg.sendEachForMulticast({
    tokens: fcmTokens,
    notification: { title, body },
    data: data || {},
  });
}
```

## DB schema

Add to User model:

```prisma
model User {
  // ... existing
  fcmTokens         String[]            @map("fcm_tokens")
  notificationPrefs Json                @default("{\"booking\":true,\"aarti\":true,\"festival\":true,\"transactional\":true}")
}
```

Add notification log:

```prisma
model NotificationLog {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  type        String
  payload     Json
  sentAt      DateTime @default(now()) @map("sent_at")
  deliveredAt DateTime? @map("delivered_at")
  openedAt    DateTime? @map("opened_at")
  failed      Boolean  @default(false)
  failureCode String?  @map("failure_code")

  @@index([userId, sentAt])
  @@index([type])
  @@map("notification_logs")
}
```

## Founder action

```markdown
- [ ] U5: Generate FCM server key via Firebase Console + paste to Render env
- [ ] U5: Generate VAPID keys for web push + paste to CF Pages env
- [ ] Engineering ticket R-Q3-E-004b: implement skeleton above
- [ ] iOS APNS (separate — gates on U3 Apple Dev $99/yr) — defer to Q4
```

## Out of scope

- iOS APNS (gates on U3)
- WhatsApp template notifications (separate workstream — gates on U7 Meta approval)
- Email notifications (already covered via Resend pattern)
- In-app banner notifications (web/mobile UI — separate ticket)

## Closes

R-Q3-E-004 — spec shipped. Engineering ship next cycle (gates on U5 FCM key).
