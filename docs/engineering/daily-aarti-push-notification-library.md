# Daily Aarti Push Notification Library — 10 Templates

> For R-Q2-E-009 + R-Q2-P-006 push notification implementation. Per-day rotation + special-day overrides.

## Daily rotation (Mon-Sun base templates)

### Monday — Shiva day
```json
{
  "title": "Mangal Aarti starts in 30 min 🙏",
  "body": "Live darshan from Kashi Vishwanath. Today is Somvar — Lord Shiva day. Tap to watch.",
  "data": {
    "deep_link": "/darshan/kashi-vishwanath",
    "utm_source": "push_daily_aarti",
    "utm_campaign": "monday_shiva"
  }
}
```

### Tuesday — Hanuman day
```json
{
  "title": "Hanuman Aarti — live in 15 min 🦁",
  "body": "Tuesday's Bajrangbali seva at Sankat Mochan Temple Varanasi. Stream now.",
  "data": {
    "deep_link": "/darshan/sankat-mochan-hanuman",
    "utm_campaign": "tuesday_hanuman"
  }
}
```

### Wednesday — Ganesha day
```json
{
  "title": "Ganesh Aarti at Siddhivinayak 🕉️",
  "body": "Wednesday — remove your obstacles. Live darshan starting in 20 min.",
  "data": {
    "deep_link": "/darshan/siddhivinayak-mumbai",
    "utm_campaign": "wednesday_ganesha"
  }
}
```

### Thursday — Vishnu/Guru day
```json
{
  "title": "Vishnu Aarti at Tirupati ✨",
  "body": "Thursday's Suprabhatam from Tirumala Balaji. Begin your day with Govinda's blessing.",
  "data": {
    "deep_link": "/darshan/tirupati-balaji",
    "utm_campaign": "thursday_vishnu"
  }
}
```

### Friday — Lakshmi/Devi day
```json
{
  "title": "Lakshmi Aarti at Mahalakshmi Temple 🌺",
  "body": "Friday — Goddess Lakshmi day. Live darshan from Mumbai Mahalakshmi in 30 min.",
  "data": {
    "deep_link": "/darshan/mahalakshmi-mumbai",
    "utm_campaign": "friday_lakshmi"
  }
}
```

### Saturday — Hanuman/Shani day
```json
{
  "title": "Shani Sandhya Aarti 🕯️",
  "body": "Saturday — strengthen your Saturn. Hanuman seva at Shani Shingnapur in 20 min.",
  "data": {
    "deep_link": "/darshan/shani-shingnapur",
    "utm_campaign": "saturday_shani"
  }
}
```

### Sunday — Surya day
```json
{
  "title": "Surya Arghya at sunrise ☀️",
  "body": "Sunday — Lord Surya day. Take part in Chhath-style arghya from Konark Sun Temple.",
  "data": {
    "deep_link": "/darshan/konark-sun-temple",
    "utm_campaign": "sunday_surya"
  }
}
```

## Festival-day overrides

### Diwali day
```json
{
  "title": "Diwali Lakshmi Puja begins in 1 hr 🪔",
  "body": "Book your Lakshmi Puja or join live darshan. Auspicious dhanteras-puja window opens now.",
  "data": {
    "deep_link": "/festival/diwali",
    "utm_campaign": "diwali_2026"
  }
}
```

### Maha Shivaratri
```json
{
  "title": "Maha Shivaratri Jagran 🕉️",
  "body": "Night-long Shivaratri abhishek live from Kashi. 4 prahar continuous worship begins in 30 min.",
  "data": {
    "deep_link": "/festival/maha-shivaratri",
    "utm_campaign": "shivaratri_2026"
  }
}
```

### Janmashtami
```json
{
  "title": "Krishna Janmashtami at Vrindavan 🦚",
  "body": "Midnight birth aarti — live from Banke Bihari Mandir. Join the millions celebrating.",
  "data": {
    "deep_link": "/festival/janmashtami",
    "utm_campaign": "janmashtami_2026"
  }
}
```

## Implementation pattern

```typescript
// apps/api/src/services/push-notifications.ts
import { getMessaging } from 'firebase-admin/messaging'

export async function sendDailyAarti(date: Date) {
  const dayOfWeek = date.getDay() // 0=Sunday
  const templates = DAILY_AARTI_TEMPLATES
  const template = templates[dayOfWeek]
  
  // Check for festival override
  const festival = await getFestivalForDate(date)
  const finalTemplate = festival 
    ? FESTIVAL_OVERRIDES[festival.slug] 
    : template
  
  // Send to opt-in topic
  await getMessaging().send({
    topic: 'daily_aarti',
    notification: finalTemplate,
    data: {
      ...finalTemplate.data,
      day_iso: date.toISOString().slice(0, 10)
    },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  })
}

// Cron 06:00 IST daily
import cron from 'node-cron'
cron.schedule('0 6 * * *', () => sendDailyAarti(new Date()), {
  timezone: 'Asia/Kolkata'
})
```

## Per-user quiet-hours respect

Each user can set quiet hours in /profile/notifications. The cron checks before send:
```typescript
const userPrefs = await prisma.notificationPreference.findUnique({ where: { userId } })
if (userPrefs.quietHours && isInQuietHours(now, userPrefs.quietHours)) {
  // Skip this user for this notification
  return
}
```

## A/B test variants

For each template, test variants:
- Variant A (current): formal devotional tone
- Variant B: casual + emoji-heavy
- Variant C: action-first (CTA in first 3 words)

Per-variant track:
- Open rate
- Click-through rate
- Unsubscribe rate
- Booking attribution

## Notification calendar

- 365 daily aartis = 365 sends/user/year
- +12 festival overrides
- +50 Pradosh/Ekadashi/Amavasya reminders
- Total: ~430 notifications/user/year (1.2/day average)
- FCM free tier: unlimited; cost is bandwidth + opt-out management
