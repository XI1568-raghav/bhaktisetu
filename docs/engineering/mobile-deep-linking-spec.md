# Mobile Push Tap Deep-Linking — expo-router Schemes

> **Roadmap item**: R-Q2-E-014 (P2) · **Authored**: 2026-06-13 · **Depends on**: R-Q2-E-009 push backend

## Goal

Q2 wire push-tap deep-linking. User taps push notification → opens specific screen in Expo app.

## Tech

- expo-router supports URI schemes
- FCM payload includes `data.deep_link` field (per R-Q2-E-009 templates)
- iOS Universal Links + Android App Links for web-app handoff

## Deep-link schemes

| Notification | Deep link |
|---|---|
| daily_aarti | bhaktisetu://today |
| festival_alert | bhaktisetu://festival/{slug} |
| booking_confirmed | bhaktisetu://booking/{id} |
| video_proof_ready | bhaktisetu://booking/{id}/proof |
| pandit_reminder | bhaktisetu://booking/{id} |

## Expo config

```typescript
// app.config.ts
{
  scheme: 'bhaktisetu',
  ios: { associatedDomains: ['applinks:bhaktisetu.com'] },
  android: { intentFilters: [...] }
}
```

## Web fallback

Universal Link / App Link: bhaktisetu.com/{path} opens in app if installed, else web.

## Engineering tickets

- R-Q2-E-014a: Expo URI scheme config
- R-Q2-E-014b: iOS Universal Links setup
- R-Q2-E-014c: Android App Links setup
- R-Q2-E-014d: Per-notification deep-link wire

## Closes

R-Q2-E-014 — spec shipped.
