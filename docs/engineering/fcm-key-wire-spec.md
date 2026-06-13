# Wire FCM Server Key — Native Push Backend

> **Roadmap item**: R-Q1-E-011 (P2) · **Authored**: 2026-06-13 · **Depends on**: U5

## Goal

Q1 wire FCM server key into push backend (per R-Q2-E-009). Currently env-or-noop, awaits U5 founder paste.

## Process

1. Founder generates FCM service account JSON in Firebase console
2. Paste full JSON to Render env: `FCM_SERVICE_ACCOUNT_JSON`
3. Push service auto-activates (init wrapped in env check)
4. Verify via test push to founder device

## Test endpoint (admin-only)

```typescript
POST /api/v1/admin/push/test
body: { fcmToken, title, body }
```

Calls sendToTopic('test-topic') → reaches device.

## Engineering tickets

- R-Q1-E-011a: Founder FCM service account generate
- R-Q1-E-011b: Render env paste
- R-Q1-E-011c: Test endpoint verify
- R-Q1-E-011d: Per-user FCM token registration (R-Q2-E-009 backend complement)

## Closes

R-Q1-E-011 — spec shipped.
