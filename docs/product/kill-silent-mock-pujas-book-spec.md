# Kill Silent Mock Fallback — pujas/[slug]/book/page.tsx:549

> **Roadmap item**: R-Q1-P-001 (P0) · **Authored**: 2026-06-13 · **Severity**: CPO #1

## Goal

Remove silent mock fallback in `apps/web/app/pujas/[slug]/book/page.tsx` line 549. Mock fallback fires when API fails → user thinks booking succeeded → no record exists. **Causes ghost bookings + customer complaints.**

## Current bug

```typescript
// CURRENT (line ~549)
const result = await api.bookPuja(payload).catch(() => ({
  bookingId: `BS-MOCK-${Date.now()}`,
  status: 'confirmed'
}))
// On failure: returns fake confirmation. User sees success. No DB row. Catastrophic.
```

## Fix

```typescript
// AFTER
let result
try {
  result = await api.bookPuja(payload)
} catch (err) {
  // SURFACE error to user, do NOT silently mock
  setError(
    err instanceof Error
      ? `Booking failed: ${err.message}. Please try again or contact +91-XXX-XXX-XXXX.`
      : 'Unexpected error. Please contact support.'
  )
  // Log to Sentry
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(err)
  }
  return  // Stop flow, don't proceed to success page
}

if (!result?.bookingId) {
  setError('Booking response invalid. Please retry.')
  return
}

// Proceed to success page with REAL booking ID
router.push(`/booking/${result.bookingId}/success`)
```

## Verify

1. Force API down (e.g., disable booking endpoint) + click Book
2. Confirm user sees error message, NO redirect to /success
3. Confirm Sentry captures exception
4. Restore API + retry → success path works

## Audit other silent-mock vectors

Per HANDOFF 2026-06-08 #20 Phase B audit: 6/7 portals silent fetch catch. Same pattern. Separate ticket per portal.

## Engineering ticket

- R-Q1-P-001a: Remove silent mock + add error UI
- R-Q1-P-001b: Sentry exception capture
- R-Q1-P-001c: Audit 6 other portals for same pattern (priest, gaushala, store-admin, astrologer, wellness, temple)

## Closes

R-Q1-P-001 — spec shipped.
