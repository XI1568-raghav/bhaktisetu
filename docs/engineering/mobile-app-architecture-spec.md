# Mobile App Architecture — Expo 50 + Native Performance

> Detailed architecture for iOS + Android apps per R-Q3-E-002 + R-Q3-E-003. Engineer-ready.

## Stack decisions

### Core
- **Expo 50** — React Native framework w/ managed workflow
- **Expo Router** — file-based routing (parallel to Next.js patterns)
- **TypeScript 5.3+** — strict mode
- **Yarn 1.22** — package manager (Expo recommended)

### State
- **Zustand** — lightweight global state (vs Redux complexity)
- **React Query (TanStack Query)** — server state + caching
- **AsyncStorage** — persistent local storage

### Networking
- **Bhaktisetu API client** (shared from `packages/api-client`)
- **Axios** w/ interceptors for auth tokens
- **Retry logic** — 3 attempts w/ exponential backoff

### Auth
- **Expo SecureStore** — secure token storage
- **Phone OTP** primary auth (via Twilio per R-Q2-E-009)
- **Email/password** fallback (existing API)

### Payment
- **react-native-razorpay** — native Razorpay checkout
- **Stripe React Native** — NRI USD/GBP/CAD/AUD payments
- **Apple Pay + Google Pay** — Tier 1 cities

### Video
- **expo-av** — HLS playback for live darshan
- **Expo Camera** — pandit video proof recording
- **VideoPlayer** — custom branded component

### Push
- **expo-notifications** — push notification
- **FCM (Android) + APNs (iOS)** — provider integration
- **Per-topic subscription** — daily aarti, festival, booking

### Maps
- **Expo Maps** — basic location features
- **Mapbox** alternative — temple location lookup

### Crash + Analytics
- **Sentry React Native** — crash reporting
- **PostHog React Native** — analytics

## Folder structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx                 # Root layout
│   ├── (devotee)/                   # Devotee tab group
│   │   ├── _layout.tsx
│   │   ├── index.tsx                # Home tab
│   │   ├── today.tsx                # Today's content
│   │   ├── book/index.tsx           # Browse pujas
│   │   ├── library/index.tsx        # Knowledge content
│   │   └── profile/index.tsx        # User profile
│   ├── (pandit)/                    # Pandit-only screens
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── upload-video.tsx
│   │   └── earnings.tsx
│   ├── (gaushala)/                  # Gaushala owner
│   │   └── ...
│   ├── (temple)/                    # Temple admin
│   │   └── ...
│   ├── (astrologer)/                # Astrologer
│   │   └── ...
│   ├── (wellness)/                  # Wellness instructor
│   │   └── ...
│   ├── (store-admin)/               # Store owner
│   │   └── ...
│   ├── auth/
│   │   ├── login.tsx
│   │   └── otp-verify.tsx
│   ├── pujas/
│   │   ├── index.tsx                # List
│   │   └── [slug]/
│   │       ├── index.tsx            # Detail
│   │       └── book.tsx             # Booking flow
│   ├── astrology/
│   │   ├── kundli.tsx
│   │   ├── horoscope.tsx
│   │   └── consultation.tsx
│   └── refer.tsx                    # Refer & earn
├── components/                       # Shared components
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── DarshanPlayer.tsx            # Live HLS player
│   ├── PandeShareButtons.tsx
│   ├── PujaCard.tsx
│   └── LangSwitcher.tsx
├── lib/
│   ├── api-client.ts                # Shared from packages/api-client
│   ├── auth.ts
│   ├── push-notifications.ts
│   ├── razorpay-integration.ts
│   └── stripe-integration.ts
├── store/
│   ├── auth.store.ts                # Zustand
│   ├── user.store.ts
│   └── booking.store.ts
├── hooks/
│   ├── useBookings.ts                # React Query
│   ├── usePujas.ts
│   └── useNotifications.ts
└── app.config.ts                    # Expo configuration
```

## Tab navigation pattern (devotee role)

```typescript
// app/(devotee)/_layout.tsx
import { Tabs } from 'expo-router'
import { House, Eye, BookOpen, User, Calendar } from 'lucide-react-native'

export default function DevoteeLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#9e6229', // saffron-600
        tabBarInactiveTintColor: '#7a756e',
        headerShown: false,
        tabBarStyle: { borderTopWidth: 0, height: 70 }
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ color }) => <House color={color} />, title: 'Home' }} />
      <Tabs.Screen name="today" options={{ tabBarIcon: ({ color }) => <Eye color={color} />, title: 'Darshan' }} />
      <Tabs.Screen name="book/index" options={{ tabBarIcon: ({ color }) => <Calendar color={color} />, title: 'Book' }} />
      <Tabs.Screen name="library/index" options={{ tabBarIcon: ({ color }) => <BookOpen color={color} />, title: 'Library' }} />
      <Tabs.Screen name="profile/index" options={{ tabBarIcon: ({ color }) => <User color={color} />, title: 'Profile' }} />
    </Tabs>
  )
}
```

## Payment integration

### Razorpay native (India)

```typescript
import RazorpayCheckout from 'react-native-razorpay'

export async function bookPujaWithRazorpay(booking: Booking) {
  const options = {
    description: `${booking.pujaName} at ${booking.templeName}`,
    image: 'https://bhaktisetu.com/og/default.png',
    currency: 'INR',
    key: process.env.EXPO_PUBLIC_RAZORPAY_KEY!,
    amount: booking.totalInr * 100, // paise
    name: 'Bhaktisetu',
    prefill: {
      email: booking.devoteeEmail,
      contact: booking.devoteePhone,
    },
    theme: { color: '#9e6229' }
  }
  
  try {
    const data = await RazorpayCheckout.open(options)
    return { success: true, razorpayPaymentId: data.razorpay_payment_id }
  } catch (err) {
    return { success: false, error: err }
  }
}
```

### Stripe (NRI USD/GBP/CAD/AUD)

```typescript
import { initStripe, presentPaymentSheet } from '@stripe/stripe-react-native'

await initStripe({ publishableKey: process.env.EXPO_PUBLIC_STRIPE_KEY! })

const result = await presentPaymentSheet({
  paymentIntentClientSecret: clientSecretFromAPI,
})
```

## Push notifications

```typescript
// lib/push-notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null
  
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null
  
  const token = (await Notifications.getExpoPushTokenAsync()).data
  
  // Subscribe to topics
  await Notifications.setNotificationChannelAsync('daily_aarti', {
    name: 'Daily Aarti',
    importance: Notifications.AndroidImportance.HIGH,
  })
  
  // Send token to backend
  await fetch('/api/v1/push/register', {
    method: 'POST',
    body: JSON.stringify({ fcmToken: token, platform: Platform.OS, topics: ['daily_aarti', 'festivals'] })
  })
  
  return token
}
```

## Deep-linking (per R-Q2-E-014)

```typescript
// app.config.ts
export default {
  scheme: 'bhaktisetu',
  ios: { associatedDomains: ['applinks:bhaktisetu.com'] },
  android: {
    intentFilters: [{
      action: 'VIEW',
      data: [{ scheme: 'https', host: 'bhaktisetu.com', pathPrefix: '/' }],
      category: ['BROWSABLE', 'DEFAULT']
    }]
  }
}
```

## Build + release

```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform ios  # TestFlight
eas build --profile production --platform android  # Google Play

# Submit
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Engineering tickets

- Week 1: Folder structure + auth + navigation
- Week 2: Pujas browse + detail screens
- Week 3: Booking + Razorpay integration
- Week 4: Live darshan player + HLS
- Week 5: Push notifications + Stripe NRI
- Week 6: TestFlight 50 users
- Week 7-8: Bug fixes + iteration
- Week 9-10: App Store submission + review
- Week 11-12: Public launch

## Q3 success metrics

- iOS TestFlight 500 users (per R-Q2-P-005 → R-Q3-E-002)
- <1% crash rate sustained
- 4.5+ App Store rating (post-public launch)
- 30% Android share (per R-Q3-E-003)
